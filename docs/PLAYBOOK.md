# know-me-decision — Production Build Playbook

This playbook covers how to build the production version of the KnowMe decision layer in this repository. That means a Rust crate family, a **decision proxy**, a skills marketplace, and the integrations into The Boss, UAR, KnowMe and the Prior Authorization Workbench. The proxy is an Axum server that speaks TypeSafe's Jev API and MCP. The planned out-of-box backend is **Julia 1 embedded through a Rust adapter and native ONNX Runtime** on desktop and mobile. **Hosted Jev is optional and requires a TypeSafe.ai key plus explicit eligible host policy**; supplying a key does not change the local default. Laya, local Qwen through candle-vllm, authorized remote Qwen and other Jev-compatible servers remain optional expansions.

It is written for two readers: the engineers doing the work, and the coding agents (Claude Code, Codex, UAR agent teams) they point at it. Every milestone has an entry condition, concrete tasks, deliverables and an exit gate. Dependencies must pass before their consumers begin; the explicitly scoped M1a integration slice precedes the later production milestones. This is a pre-implementation plan: examples, contracts and conformance matrices describe required behavior, not implemented or certified capabilities.

The design this playbook implements is in [`architecture/knowme-decision-layer.html`](architecture/knowme-decision-layer.html), with an earlier snapshot [pinned on IPFS](https://ipfs.prometheusags.ai/ipfs/bafkreib4gh3upa7ve6wkiwfdlzoma745h7ya6uhigzozn36w4ibvwelpfi). That immutable snapshot does not include these local contract corrections. The model research behind it is in [`research/open-decision-models-2026-09.md`](research/open-decision-models-2026-09.md). The proxy, backend and transport analysis (updated 28 Sep 2026) is in [`research/decision-proxy-options-2026-09.md`](research/decision-proxy-options-2026-09.md).

---

## 0. Contents

1. [Scope and non-goals](#1-scope-and-non-goals)
2. [Invariants](#2-invariants)
3. [Repository layout](#3-repository-layout)
4. [Toolchain and conventions](#4-toolchain-and-conventions)
5. [Core contracts](#5-core-contracts)
   - 5a. [Decision proxy](#5a-decision-proxy)
6. [Milestones](#6-milestones)
7. [Models and weights](#7-models-and-weights)
8. [Data, labels and calibration](#8-data-labels-and-calibration)
9. [Evaluation and promotion gates](#9-evaluation-and-promotion-gates)
10. [Testing strategy](#10-testing-strategy)
11. [Performance budgets](#11-performance-budgets)
12. [Security and privacy](#12-security-and-privacy)
13. [Release engineering](#13-release-engineering)
14. [Host integration contracts](#14-host-integration-contracts)
15. [Clinical and regulatory gates](#15-clinical-and-regulatory-gates)
16. [Operations runbooks](#16-operations-runbooks)
17. [ADR backlog](#17-adr-backlog)
18. [Open questions](#18-open-questions)
19. [Definition of done](#19-definition-of-done)

---

## 1. Scope and non-goals

### In scope

- **Crates** in one Cargo workspace:
  - `decide-core`, the types and traits with no I/O.
  - `decide-schema`, the TypeSafe `/v1/systemone` wire compatibility layer and JSON Schema.
  - `decide-tripwire`, deterministic signed rule packs.
  - `decide-encoder`, the bundled Julia 1 encoder through embedded ONNX Runtime, with optional ModernBERT/mmBERT heads via candle or ONNX.
  - `decide-llm`, the Jev-style logit reader over Qwen3.8 through the candle-vllm fork, plus a remote logprobs adapter.
  - `decide-guard`, Qwen3Guard and Granite Guardian.
  - `decide-calibrate`, temperature scaling and Mondrian split conformal.
  - `decide-policy`, the cascade, locality and outcome mapping.
  - `decide-audit`, a hash-chained decision log with override capture.
  - `decide-mcp`, the rmcp server (MCP 2026-07-28 and 2025-11-25).
  - `decide-backends`, the backend registry and adapters: built-in `julia-onnx`, optional `jev`, generic `systemone-http`, `laya-candle`, `laya-mlx`, `onnx-encoder`, `candle-vllm` instances and `qwen-remote`.
  - `decide-proxy`, the sensitivity gate, backend router, tier escalation and shadow comparisons.
  - `decide-server`, the Axum HTTP server: the Jev-compatible `/v1/systemone`, native `/v1/decide`, SSE streaming, and MCP Streamable HTTP at `/mcp`.
  - `decide-wasm`, the browser build of the pure crates.
- **The `knowme-decide` binary.** It runs as an MCP stdio server, as the proxy server (`serve`, with the `READY:{port}` handshake in sidecar mode), and as a CLI for weights, calibration, evals and conformance checks.
- **Spec and rule-pack libraries** for CounselMe (CM-01…CM-12) and prior-auth (PA-01…PA-11).
- **The `knowme-decisions` plugin marketplace**, AgentSkills.io compatible, with four plugins and 14 skills.
- **Integration PRs** into `the-boss`, `universal-agent-runtime`, `know-me-system` and `TribeHealth/kevin/prior-auth`.

### Non-goals

- **CLM integration or a Rust CLM port.** Deferred and excluded from the implementation scope; retaining a research reference does not schedule it.
- **Training frontier models.** We fine-tune heads and small classifiers. We don't pre-train.
- **Hosted inference for PHI.** Hosted backends serve only data explicitly approved as non-sensitive by authenticated host policy and trusted provenance (I-11). Unknown, PHI and clinical inputs never reach them. A classifier cannot authorize disclosure.
- **Autonomous clinical action.** No tool approves, denies, signs, submits or treats. See [§2](#2-invariants).
- **A labeling product.** Labels come from human review across Act, Review and Escalate outcomes, including representative sampling of automated decisions. Host products own collection; this repo provides capture contracts and dataset tooling.

---

## 2. Invariants

These rules must be enforced in code and tests before their milestone can pass; enforcement has not yet been implemented. A PR that weakens one needs an ADR and sign-off from the product owner of every affected host.

| # | Invariant | Enforced by |
|---|---|---|
| I-1 | **Tripwires run first and can't be overridden.** A hit always gives `Outcome::Escalate`. | `decide-policy` cascade order; a property test that no backend output can flip a tripwire escalation |
| I-2 | **No calibration artifact means no `Act`.** A spec without a valid, signed, in-date calibration artifact can only return `Review` or `Escalate`. | `decide-policy::outcome()`; unit tests for each primitive |
| I-3 | **Recall floors are inputs; automation rate is an output.** Floors are set in the spec. The fitter reports the resulting automation rate and never lowers a floor to raise it. | The `decide-calibrate` API has no "target automation" parameter |
| I-4 | **Finite-sample honesty.** A class with a recall floor of 1−α needs at least ⌈1/α⌉−1 calibration positives, or its guarantee isn't claimed and the class forces `Review`. | `decide-calibrate` validation; artifact carries `n_pos` per class |
| I-5 | **Locality never escalates on its own.** A `DeviceOnly` spec never reaches a remote backend. A new request may use a broader locality only under an authenticated host grant constrained by data provenance and tenant policy; a model or free-form caller header cannot grant it. | `decide-policy` locality guard; the `remote` feature is compiled out of `decide-lite` |
| I-6 | **Clinical specs propose; they never write.** Specs tagged `clinical` can return `Act` only for non-clinical side effects such as "show to coordinator". Hosts must route clinical state changes through their own human-confirmed commands. | Spec lint (`xtask spec-lint`); the integration contract in [§14](#14-host-integration-contracts) |
| I-7 | **Every decision is audited.** This includes tripwire-only exits and errors. There are no silent drops. | Pure policy returns a proposal and audit record; the trusted host commits the audit before releasing Act, and exposes audit failure explicitly (§5) |
| I-8 | **MedGemma never decides.** HAI-DEF-licensed models can be registered only as `role = "extractor"`. | Model registry lint |
| I-9 | **Decision MCP tools are read-only.** Only `calibrate_fit` changes state in the model-visible decision MCP surface, and it is admin-gated. Human override persistence is a separate authenticated host app command (§5), never an agent-kernel write. | `decide-mcp` annotations; a conformance test |
| I-10 | **`decide-core` does no I/O and builds on `wasm32-unknown-unknown`.** | CI job `core-wasm` |
| I-11 | **Hosted backends never see PHI.** `jev` and `qwen-remote` are reachable only when the locality ceiling is `Hosted`. Authenticated host policy and trusted provenance must already authorize each hosted destination for approved non-sensitive data. Spec tags, tripwires and the local sensitivity model may only remove destinations; unknown data stays on device. | `decide-proxy` ceiling check before dispatch; property tests; an egress allowlist that holds only enabled hosted endpoints |
| I-12 | **Routing only narrows.** No router output, model error or backend failure can widen the locality ceiling. Failures fall back to a local tier, or to `Review`. | `decide-proxy` state machine; fault-injection tests |
| I-13 | **Jev wire fidelity.** Successful advisory `/v1/systemone` responses validate against the TypeSafe schema snapshot. Requests needing enforced Review or Escalate are refused without an ordinary answer. KnowMe fields appear only under requested `x_knowme`; refusal is a documented proxy extension (§5a). | Snapshot and contract tests against recorded Jev responses |

---

## 3. Repository layout

```text
know-me-decision/
├── Cargo.toml                     # workspace, exact-pinned deps, [workspace.lints]
├── rust-toolchain.toml            # 1.97.1 (matches the-boss integration build)
├── deny.toml                      # licenses, bans, advisories
├── README.md
├── AGENTS.md                      # agent rules (add from Prometheus base rules at M0)
├── crates/
│   ├── decide-core/
│   ├── decide-schema/
│   ├── decide-tripwire/
│   ├── decide-encoder/
│   ├── decide-llm/
│   ├── decide-guard/
│   ├── decide-calibrate/
│   ├── decide-policy/
│   ├── decide-audit/
│   ├── decide-mcp/
│   ├── decide-backends/           # julia-onnx default · optional jev/systemone-http/laya/Qwen
│   ├── decide-proxy/              # sensitivity gate, backend router, tier escalation, shadow mode
│   ├── decide-server/             # Axum: /v1/systemone, /v1/decide, SSE, /mcp
│   └── decide-wasm/               # browser build (wasm-bindgen) of the pure crates
├── bins/
│   └── knowme-decide/             # proxy server + MCP stdio + CLI
├── workers/
│   └── laya-mlx/                  # pinned venv + JSON-lines shim around laya_mlx (Apple Silicon)
├── decide.toml.example            # backends, router, server config
├── .env.example                   # secret references for authorized services; never subscription entitlement
├── specs/                         # versioned DecisionSpec JSON (source of truth)
│   ├── counselme/                 # cm-01 … cm-12
│   ├── prior-auth/                # pa-01 … pa-11
│   └── uar/                       # routing, model-route, governance
├── rulepacks/                     # tripwire packs (source); signed builds go to dist/
│   └── counselme-crisis/
├── models/
│   └── registry.toml              # model manifest: source, license, sha256, role, tier
├── calibration/                   # artifact *schemas* and fixtures only — never real labels
├── evals/
│   ├── suites/                    # kev-frozen, typesafe-public, golden/<spec>
│   └── reports/                   # generated, gitignored except summaries
├── training/                      # Python (uv) pipelines for encoder heads + LoRA
├── marketplace/                   # knowme-decisions plugin marketplace
│   ├── .claude-plugin/marketplace.json
│   └── plugins/{decide-foundation,uar-decision-routing,counselme-decisions,prior-auth-decisions}/
├── xtask/                         # cargo xtask: spec-lint, sign, release, conformance
├── openspec/                      # change proposals, same workflow as sibling repos
└── docs/
    ├── PLAYBOOK.md                # this file
    ├── adr/                       # ADR-000 … (see §17)
    ├── architecture/
    ├── research/
    └── sessions/
```

**Why a separate repo?** Four hosts consume these crates. Keeping them out of any one host avoids circular dependencies, lets the sidecar release on its own cadence, and gives the pins in The Boss's `build/integration-sources.json` a single source to point at.

---

## 4. Toolchain and conventions

- **Rust:** 1.97.1, edition 2024. This matches The Boss's integration build pin, so the sidecar builds in the same pipeline.
- **Pins:** exact (`=x.y.z`) in `[workspace.dependencies]`, the same policy as prior-auth. Resolve the known conflicts in M0:
  - **rmcp `=3.5.0`** (the latest, released 28 Sep 2026). It supports MCP 2026-07-28 (stateless) and 2025-11-25. UAR pins `=3.1.2` and prior-auth uses `3.4.0`; open their bump PRs in M9 and M10. `decide-mcp` must not leak rmcp types through its public API, so hosts on another version can still link `decide-policy`.
  - **Other pins, verified on crates.io on 28 Sep 2026:** axum `=0.8.9`, candle-core `=0.11.0`, llguidance `=1.8.0`, and mlx-rs `=0.32.0` (only for the optional native Laya-MLX port).
  - **Recording pins.** `versions.toml` is authoritative and is edited by hand only (agents are denied). Record the pins above there at M0, together with ADR-002.
  - **candle.** UAR uses `0.11`; KnowMe declares `0.7` through its mistral.rs fork patch. Target `0.11`. KnowMe links the `onnx` encoder feature until it bumps.
  - **candle-vllm.** Use the GQAdonis fork, pinned by git rev. The DeltaNet state-fork work lands there first (M7).
- **Embedded inference boundary:** the planned Rust adapter uses native ONNX Runtime, which includes C/C++ libraries. This is a Rust-facing runtime, not a pure-Rust dependency stack. `ort` is a wrapper candidate; M0 must verify platform linking, bindings and licenses before manual pin acceptance. Do not introduce an unverified wrapper/runtime version. ONNX and platform FFI remain outside `decide-core`.
- **Features:** keep them additive, and have CI test the matrix below. All profile/feature names are proposed; the selected baseline does not enable optional heavy models.

  | Profile | Features | Consumers |
  |---|---|---|
  | `decide-lite` | core, schema, tripwire, calibrate, policy, audit, `encoder-onnx`; bundled Julia 1, no remote feature | KnowMe Android/iOS (FFI), UAR `embedded-mobile` |
  | `decide-desktop` | lite + `mcp`; bundled Julia 1, optional Jev transport in the trusted host | Windows, macOS and Linux desktop applications/sidecars |
  | `decide-server` | desktop + `mcp-http` + `proxy` + `backend-jev`; local Julia 1 remains the default | UAR, prior-auth on-prem, standalone proxy |
  | Optional desktop/server expansion | explicit `encoder-candle`, `llm-local`, `guard`, `llm-remote`, `backend-qwen-remote`, or `backend-laya-mlx` | Hardware-eligible deployments after their own gates; MLX is Apple Silicon only |
  | `decide-browser` | core, schema, tripwire, calibrate, policy (wasm32) | `decide-wasm`; independent M9b runtime and weight acceptance |

  Mobile Jev access, when offered, is a separate authenticated host networking integration. It cannot add network capability to `decide-lite` or `decide-core`, and it must enforce the same grants, outcome and audit contract. A missing required optional guard forces Review; a minimal installation never bypasses it.

- **Lints:** `#![forbid(unsafe_code)]` in core, schema, tripwire, calibrate, policy and audit. `unsafe` is allowed only in backend crates, behind a `// SAFETY:` comment. Enforce Clippy `pedantic` with a curated allow-list, and `cargo deny check`.
- **Errors:** `thiserror` in libraries and `anyhow` only in `bins/`. Library code never panics: no `unwrap` or `expect` outside tests (Clippy lint).
- **Observability:** `tracing` spans for every cascade layer, using the fields `spec`, `layer`, `latency_us`, `outcome` and `audit_id`. Never log state text. Log redacted hashes instead.
- **Workflow:** openspec change proposals for anything that crosses a host boundary, as in the sibling repos. ADRs for every decision in [§17](#17-adr-backlog).

---

## 5. Core contracts

These are **planned M1 contract sketches**, not existing Rust APIs. ADR-003 and the cross-host OpenSpec change must freeze their serialized schema before host implementation. Public core/policy types remain independent of rmcp and transport versions.

| Contract | Required meaning |
|---|---|
| `DecisionSpec` | Versioned id, primitive-specific question/options or statements, recall floors, signed tripwire packs, required guards, locality, tags, backend plan and optional hierarchy. Choice has at most 255 options; Score has ordered levels; Noul has independently evaluated statements. |
| `DecisionAnswer::Choice` | Selected option, a complete candidate probability distribution when available, and its calibrated prediction set. |
| `DecisionAnswer::Score` | Ordered level distribution and its weighted expected numeric value, which may lie between levels; calibrated uncertainty over levels or a declared interval. Do not coerce the answer to an option id. |
| `DecisionAnswer::Noul` | A probability and calibrated uncertainty for each statement independently. Probabilities across statements need not sum to one. |
| `DecisionProposal` | Spec/question identity, optional primitive-specific answer, score completeness and provenance, calibration reference, citations, proposed outcome and audit record. Tripwire exits and failures need not have an answer. |
| `Outcome` | `Act`, `Review` with primitive-specific uncertainty and reason, or `Escalate` with reason. Outcome is permission/disposition, separate from an informational answer. An Act for a Score or Noul requires a spec-defined calibrated acceptance predicate; Choice singleton rules do not silently generalize. |
| `Decision` | Host-released result with proposal, effective outcome, and `audit_status`: committed with a real `audit_id`, or failed with an explicit failure code and no id. Hosts act on the effective outcome, never directly on the answer. |
| Batch | Stable request/question identifiers and one result per question, including individual failure, outcome, calibration and audit status. No batch-level success may hide a refused or unaudited question. |
| `RawScores` | Candidate ids, scoring method, completeness, unavailable candidates, and full pipeline identity. Missing scores are not zero or a fabricated floor; incomplete scores cannot support calibrated Act. |
| Backend / calibrator / tripwire | Produce scores, calibration results or hits. No persistence authority in the agent kernel or pure core. |
| `AuditSink` | A trusted-host port for appending a redacted audit record and obtaining a durable receipt. Storage adapters live outside pure core. |

**Locality and authority.** `DeviceOnly` means execution and protected data stay on the originating device. `Clinic` means an explicitly granted clinic-controlled deployment; `Server` means an explicitly granted organization-controlled server deployment; `Hosted` means an approved third-party service for non-sensitive data only. These names identify trust domains, not an automatic ordered permission hierarchy. The effective eligible destination set is the intersection of the spec restriction, authenticated tenant/host grants and trusted data provenance, then narrowed by deterministic and model checks. Unknown provenance yields DeviceOnly or refusal if on-device handling is unavailable. A user prompt may request a host grant but never overrides a PHI restriction or tenant denial.

**Planned execution boundary.** Shared policy and backend orchestration apply identically to native, MCP, HTTP and browser callers. The trusted host performs I/O; pure core computes proposals and audit records.

1. Run signed tripwires first. A hit fixes the outcome to Escalate and bypasses decision inference, never audit handling.
2. Compute eligible destinations under the trusted locality policy; check again at every actual dispatch, including fallback and shadow requests.
3. Run the scoring cascade. A sufficiently calibrated result may skip later optional scoring layers, but **never a mandatory guard**. Required guards run before release; an unavailable required guard forces Review unless a tripwire or completed guard already requires Escalate. A guard's required Review or Escalate cannot be downgraded by a later score.
4. Validate calibration against the complete scoring pipeline and route selection policy, then apply primitive-specific outcome mapping.
5. Return the proposal and redacted audit record to the trusted host. The host persists the record before it publishes an actionable answer or Act result.

**Outcome mapping** (checked in order): tripwire or mandatory guard escalation → Escalate; an escalate-tagged candidate in a valid calibrated set → Escalate; invalid/missing calibration, incomplete scores, a mandatory guard requiring Review, unavailable required guard or unmet evidence minimum → Review; a spec-defined calibrated acceptance predicate with all guards complete → Act only for non-clinical effects; otherwise Review. Clinical state remains human-confirmed (I-6).

**Audit failure.** No audit receipt means no Act and no invented `audit_id`. The host withholds actionable answers and returns an explicit audit-failure status. An urgent Escalate remains deliverable to the host's human escalation path with `audit_status = failed`; the host retains a redacted recovery record in an approved durable outbox if available, otherwise reports persistence failure explicitly. Recovery uses stable event ids to prevent duplicate appends. This is an observable failure of the audit requirement, never a successful audited decision or a silent drop. Audit persistence and downstream clinical actions are separate host transactions.

**Human feedback writes.** `record_override` is an authenticated host-owned app command, outside the model-visible decision MCP surface. The review card invokes the host bridge after a human action; missing bridge support disables write controls. The host derives actor identity and role from its session, verifies tenant/spec/audit linkage and authorization, and accepts an idempotency key. A client-supplied actor role is not authority. The command is declared mutating in its host contract and app metadata; it stores a label event without editing the original decision or clinical state. I-9 still permits only admin-gated `calibrate_fit` to mutate through model-visible decide MCP tools.

**Wire compatibility:** `decide-schema` round-trips TypeSafe Choice, Score, Noul and batches within the restricted advisory scope in §5a. The [TypeSafe API](https://docs.typesafe.ai/api) defines the external answer shapes; native outcomes remain mandatory for the four product hosts.

## 5a. Decision proxy

The proxy exposes a common front door to every eligible decision backend; embedded callers use the same shared enforcement libraries. It speaks TypeSafe's Jev API, KnowMe's native API and MCP from one Axum server. Backends plug in behind a registry, and a sensitivity-aware router picks one per request. Analysis and source checks are in [`research/decision-proxy-options-2026-09.md`](research/decision-proxy-options-2026-09.md).

### Surfaces (`decide-server`, Axum 0.8.9)

| Route | Contract | Notes |
|---|---|---|
| `POST /v1/systemone` | **TypeSafe Jev wire, exact.** Request: `state`, `model`, `questions{type: choice\|score\|noul, instructions, criteria}`. Response: `model`, `answers{choice, confidence, probabilities \| score, legend, probabilities, confidence \| noul}`, `usage`. Upstream errors: 401, 422, 429, 529; proxy policy refusal: 403 (explicit extension) | `model` selects a backend (`julia-onnx`, `jev-latest`, `laya`, `laya-multilingual`, `laya-typed-decisions`, `kev-9b`, `litjev-qwen3.8-27b`, `qwen-local:<instance>`, `qwen-remote`), the default is `julia-onnx`. Explicit `auto` is an optional configured routing mode, never an implicit hosted fallback. KnowMe fields (`outcome`, `prediction_set`, `audit_id`, `calibration`, `backend`, `locality`) appear under `x_knowme` only when the request sends `X-KnowMe-Extensions: 1` |
| `POST /v1/decide` | Native: a DecisionSpec (or spec id) plus state, returning a `Decision` ([§5](#5-core-contracts)) | The full outcome contract. This is what hosts use |
| Either route with `Accept: text/event-stream` | SSE events: `route` (redacted destination decision), `answer` (one per question only after guards, outcome and audit commit), `escalate` (tier transition, not an actionable outcome), `outcome`, `usage`, `done`, `error` | A KnowMe extension; Jev itself doesn't stream. Pre-commit events are provisional and contain no answer or sensitive state. `done` carries only finalized per-question results; a later failure cannot leak a previously withheld answer |
| `POST /mcp` | MCP Streamable HTTP via rmcp 3.5.0. Stateless for 2026-07-28; `legacy_session_mode` for 2025-11-25 clients | Same tools as `decide-mcp` |
| `GET /sse`, `POST /messages` | Legacy MCP HTTP+SSE (2024-11-05) shim, behind the `mcp-legacy-sse` feature and **off by default** | Deprecated in the spec. Only for clients that can't speak Streamable HTTP |
| `GET /v1/models`, `GET /v1/backends` | Registry view: health, locality, capabilities, calibration versions | Feeds the operator panel |
| `GET /healthz`, `/readyz`, `/metrics` | Liveness, readiness (weights loaded, workers up), Prometheus | — |

**Jev safety boundary.** Plain Jev compatibility is an advisory service restricted to tenant-approved, non-clinical, non-sensitive requests. A plain successful response grants no permission to act, makes no claim of KnowMe-calibrated automation, and cannot substitute for the native Review outcome required by I-2. A request requiring enforceable Review/Escalate semantics, a policy-disallowed model, or any failed release gate receives HTTP 403 with a documented proxy policy-refusal body and **no ordinary answer**; transient audit persistence failure is an explicit proxy HTTP 503 failure, not an upstream Jev error. A batch containing any such refusal returns no ordinary batch answers. Do not return HTTP 200 plus an optional hidden refusal. Native `/v1/decide` and MCP outcome-aware tools are mandatory for product hosts. Opting into `x_knowme` does not establish host enforcement or widen eligibility. Freeze these extension/error schemas in M1 alongside the upstream schema snapshot.

### Backend registry (`decide-backends`)

Every planned backend adapter declares primitives, candidate-scoring completeness, maximum options/tokens, languages, locality, latency and cost class. Identify each deployment by model/checkpoint revision, runtime, tokenizer, template, quantization, endpoint, score transformation and calibration identity. A shared model name is not interchangeability evidence. The table lists adapter prerequisites; every deployment also requires service authorization and per-request eligibility checks before dispatch.

| Backend id | Adapter | Runs | Locality | Enabled when |
|---|---|---|---|---|
| `julia-onnx` | Rust adapter over embedded native ONNX Runtime; Julia 1 ONNX graph and tokenizer | Planned Windows/macOS/Linux, Android and iOS native CPU baseline; each requires acceptance | `DeviceOnly` | Installed application includes all verified assets; no user configuration, credential or model server; calibration still gates Act |
| `jev` | `systemone-http` → `https://api.typesafe.ai/v1/systemone` (Bearer) | TypeSafe cloud | `Hosted` (third-party, no BAA) | TypeSafe.ai key is supplied through the host (`JEV_API_KEY` for server/sidecar); explicit host selection and eligible non-sensitive destination grants are additionally required |
| `systemone-http:<name>` | Generic Jev-wire client | Any compliant server: `laya-serve`, openjev-sglang, Kev, Von, another `knowme-decide` | As declared in `decide.toml` | Listed in `decide.toml` and passing the wire-conformance check |
| `laya-candle` | In-process ModernBERT/mmBERT (`laya-rust` weights) | Every desktop and server target | `DeviceOnly` / `Clinic` | Weights present and verified |
| `laya-mlx` | Managed worker running `laya_mlx` (Apache-2.0, `mizorewww/laya-mlx`) over a JSON-lines stdio shim; a v2 option is a native port on `mlx-rs` 0.32 | **Apple Silicon only** (`macos` + `aarch64`, MLX ≥ 0.32.2 importable) | `DeviceOnly` | The platform check passes, the pinned venv exists, and the checkpoint sha256 values verify |
| `onnx-encoder` | Optional additional mmBERT heads via embedded ONNX Runtime | Targets with separate model/runtime acceptance | `DeviceOnly` | Explicitly installed and enabled; does not replace the bundled `julia-onnx` default |
| `candle-vllm:<instance>` | LitJev logit reader against a candle-vllm fork instance (`/v1/systemone` route in the fork; fallback: OpenAI logprobs, one question per call) | Local or clinic GPU: Qwen3.8-27B, plus smaller Qwen3.5/3.8 (0.8B, 4B, 9B) | `DeviceOnly` / `Clinic` | Listed in `decide.toml` and healthy |
| `qwen-remote` | Authorized API adapter with verified full candidate scoring, or explicitly incomplete/approximate scores restricted to Review pending scoped validation | Permitted general API deployment, or provider-authorized custom backend service | `Hosted` (non-sensitive only) | Service-use authorization, capability evidence, trusted destination grant and credentials all verified; subscription keys alone never enable it |
| `guard:*` | Qwen3Guard, Granite Guardian (via `decide-guard`) | Desktop / clinic | Local | Weights present |

### Out-of-box contract

The selected implementation plan is **Julia 1 + Rust + embedded ONNX Runtime**, with remote Jev as the optional key-enabled service. This is a planned shipping contract, not a claim that a working application or device-certified runtime already exists. The cross-host proposal is `openspec/changes/builtin-local-default/proposal.md`; ADR-019 is reserved in the backlog for the decision and remaining acceptance gates.

- Install the app with the baseline model graph/weights, tokenizer, native runtime libraries, verified manifest, required notices and default settings in its installed asset set **before first launch**. No first-run network, Python, separate inference service, manual model download, endpoint selection or user-written configuration is required. Packaging must satisfy each platform's distribution constraints rather than silently switching to a first-use download.
- With no key, with no configuration file, and offline, eligible requests run locally through Julia 1. A TypeSafe.ai key makes Jev available to explicitly enabled, eligible host policy; the local default stays selected. Do not silently send unsupported or oversized requests to Jev, even when a key exists.
- Julia 1's documented native option range is **2–20**. The framework's 255-option ceiling does not expand this model's capability. Bind input length to the verified graph/runtime token limit (upstream describes an 8k runtime ceiling; published benchmarks used 1,024-token settings). Detect oversize input before inference; never silently truncate evidence or split candidates and claim a complete flat distribution. Unsupported shapes/cardinalities return a native Review with a reason, or a protocol-appropriate refusal, preserving any mandatory Escalate.
- Choice, fractional expected Score and independent Noul must match the upstream implementation. A bundled model does not authorize automation for arbitrary specs: without signed, valid, pipeline-matching calibration, return Review or mandatory Escalate. Starter specs can enable Act only after real matching evidence and all policy/audit gates exist.
- The uncomfortable cost is the mobile footprint: upstream Julia 1 is 144.3M parameters and approximately **550.5 MiB of FP32 weights**, before tokenizer, runtime and working memory. Quantization is optional and needs separate numerical, task-quality and calibration gates. Do not advertise a smaller footprint before measuring it. The author's roughly 203 ms Android-tablet result is Python-driven ONNX evidence, not native Android or iOS app acceptance. The reported XNNPACK Reshape issue excludes that provider from the baseline until separately resolved and verified.

Sources: [Julia 1 model card](https://huggingface.co/SupersonicLabs/Julia-1), [author deployment measurements](https://supersoniclabs.ia.br/julia-1/). Their measurements guide M0; they do not close our platform gates.

### Configuration

- **`.env`** holds development/server secrets only. Mobile applications obtain an optional TypeSafe.ai key through trusted host secret storage; never ship it in the app bundle. `JEV_API_KEY` and references for an authorized remote service are resolved by the server/sidecar host; endpoints/models belong in configuration. Existing `QWEN_TOKEN_PLAN_*` names document a historical connectivity probe, not production eligibility. Do not inspect or publish secret values. The repo ships `.env.example`.
- **`decide.toml`** is optional for the baseline; embedded defaults select `julia-onnx` with hosted routing off. It holds advanced overrides and optional deployments. The following is a proposed configuration sketch, not a verified parser API; placeholders are not model hashes:

```toml
[server]
bind = "127.0.0.1:0"            # sidecar mode prints READY:{port}
mcp_protocols = ["2026-07-28", "2025-11-25"]
legacy_sse = false

[router]
default_model = "julia-onnx"
hosted_allowed = false           # enabling still requires destination-specific grants
shadow_sample = 0.0              # explicit opt-in plus separate shadow destination authorization

# Optional examples below are not part of the baseline installation.
[[backend]]
id = "candle-vllm:clinic-27b"
kind = "candle-vllm"
url = "http://10.0.4.12:8000"
model = "Qwen/Qwen3.8-27B"
adapter = "litjev-27b@<sha256>"
locality = "clinic"

[[backend]]
id = "systemone-http:laya-cuda"
kind = "systemone-http"
url = "http://127.0.0.1:8088"   # laya-serve
locality = "device-only"
```

### Routing ("a decision model routes the decision models")

**Stage 0: trusted authorization establishes eligible destinations.** Authenticated tenant and host policy, verified data provenance and the registered deployment's service authorization determine the maximum permitted set. Spec tags may restrict it. A caller header such as `X-Data-Class` is an untrusted hint unless bound to an authenticated, validated host assertion. Unknown provenance stays on device. A public/internal model classification is never authorization to release data; internal data needs its own explicit disclosure grant. Hosted routing defaults off for every tenant and stays off for clinical tenants.

**Optional routing expansion (M7b):** the baseline uses deterministic eligibility and Julia 1 by default; it does not require a learned router or downloaded Laya model.

**Stage 1: `proxy.sensitivity.v1` only removes destinations.** Signed tripwires run before a local Laya data-class Choice and a sensitivity Noul. The local model runs inside the existing permitted boundary; PHI/personal recall targets remain 0.999. A broad set, uncertainty, failure or sensitive classification excludes hosted destinations. Even a singleton public/internal prediction cannot add a destination. The classifier is defense in depth, not proof that an input is non-PHI.

**Stage 2: `proxy.backend.v1` ranks only eligible deployments.** Filter by measured primitive support, complete candidate scoring, context length, language, required guards and budget. A local difficulty model may rank the remaining deployments. Retry or move to another eligible backend only after rechecking the same grants, calibration identity and policy; no remaining backend means Review. Routing features or confidence thresholds that change which examples reach a backend require route-level re-evaluation and calibration review.

**Every egress path is covered.** The same checks govern direct model overrides, fallback, retry, shadow comparisons, telemetry and any audit/label synchronization. A shadow comparison has a separate destination grant and cannot turn local-only data into non-sensitive traffic. PHI/clinical tags cannot be overridden by a header, model choice, user prompt or model output.

**Service authorization and score fidelity.** The earlier token-plan call is historical connectivity evidence only. Alibaba documents that personal/team Token Plans and Coding Plan do not support custom application backends or automated scripts ([official restrictions](https://www.alibabacloud.com/help/en/model-studio/more-tools)). Use a permitted general API service or obtain explicit provider authorization for this use before enabling `qwen-remote`.

Top-five token logprobs are not a complete distribution over five answer options: unrelated tokens can occupy the list. Never assign missing options a probability floor or renormalize an incomplete subset and call it complete. Require verified full candidate scores, or mark scores incomplete and force Review. An approximation needs a separately specified method, declared limitations, complete-pipeline calibration and held-out evidence before any scoped Act promotion; incompleteness itself remains disqualifying. Hierarchical splits need end-to-end evaluation including routing errors and cannot claim flat Jev equivalence.

**What this design costs.** Trusted provenance can be wrong, and a classifier can miss PHI. A measured recall target cannot prove zero disclosure. Local-only handling for unknown data increases Review and reduces hosted coverage; measure that cost without weakening the authorization boundary. HIPAA eligibility also requires an appropriate service relationship, safeguards and applicable BAA, not a model label or deployment country ([HHS cloud guidance](https://www.hhs.gov/hipaa/for-professionals/special-topics/health-information-technology/cloud-computing/index.html)). A future BAA does not silently change I-11.

### MCP conformance (rmcp `=3.5.0`)

The planned targets are **2026-07-28** and **2025-11-25** compatibility. The following is an acceptance matrix, not a certification claim. M1a proves core lifecycle/tools and stdio/Streamable HTTP; M6 adds declared optional capabilities, and host milestones prove real interoperability. Advertise only features with passing evidence for that revision. Track optional extensions and legacy transports separately; “all specifications” is not a testable completion claim. Sources: [MCP versioning](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning), [rmcp releases](https://github.com/modelcontextprotocol/rust-sdk/releases).

| Area | Planned acceptance requirements |
|---|---|
| Lifecycle | `server/discover`. Per-request `_meta` protocol version and client capabilities. `UnsupportedProtocolVersion` (−32022). `serverInfo` in result `_meta`. The `initialize` handshake only in 2025-11-25 mode |
| Transports | stdio. Streamable HTTP (stateless, `Mcp-Method`/`Mcp-Name` headers, `HeaderMismatch` −32020). Legacy HTTP+SSE shim, feature-gated and off by default |
| Server features | Tools, in deterministic order, with `outputSchema` (JSON Schema 2020-12), `structuredContent` and annotations. Resources and templates. Prompts (spec-authoring and review prompts). Completions (spec ids, option ids). `CacheableResult` `ttlMs` and `cacheScope` |
| Change notifications | `subscriptions/listen` (tools, resources and prompts list changes; resource subscriptions for `decide://calibration/*`) |
| Request streaming | Progress on the request's own response stream (batch decisions, calibration fits). Cancellation |
| MRTR | `input_required` results. Examples: an ambiguous `route_intent` asks one clarifying elicitation; `calibrate_fit` asks for admin confirmation |
| Extensions | Tasks (`io.modelcontextprotocol/tasks`) for long evals and calibration fits. MCP Apps (`ui://decide/review-card`) |
| Auth | OAuth 2.1 resource server with protected-resource metadata, `iss` validation (RFC 9207), and Client ID Metadata Documents. DCR is accepted for legacy servers only |
| Observability | OpenTelemetry `traceparent`, `tracestate` and `baggage` from `_meta` |
| Not implemented (deprecated in 2026-07-28) | Roots, Sampling, Logging (we log to stderr and OTel), and the `includeContext` server values |

### Browser tier (`decide-wasm`)

- The pure crates (core, schema, tripwire, calibrate, policy) are compiled to `wasm32-unknown-unknown` with `wasm-bindgen`.
- The encoder runs through ONNX Runtime Web (WebGPU, falling back to WASM), using Julia 1 or a Laya-for-web int4/int8 checkpoint cached in Cache Storage. Each browser checkpoint, quantization and runtime/scoring pipeline has its own calibration artifact and measured startup/memory budget.
- PGlite is the local audit sink and label store. Inference locality and storage/synchronization permissions are distinct. DeviceOnly data does not synchronize. Optional Electric/Flint Gate sync requires a separate authenticated grant to an allowed destination, retention rules and dispatch enforcement; a configuration that synchronizes protected data must not claim DeviceOnly end-to-end locality.
- Default browser inference and data handling are `DeviceOnly`. A local loopback worker remains on the same device; any onward dispatch remains constrained by the original grants.
- The page needs COOP/COEP headers for threaded WASM.
- A page may opt in to calling a local `knowme-decide` over loopback, using Private Network Access headers and a per-launch token.

---

## 6. Milestones

Durations assume one senior Rust engineer plus agent teams. Treat them as sequencing, not commitments.

### M0 — Bootstrap and spikes (week 1–2)

**Entry:** this playbook is accepted.

**Tasks:**

- Create the workspace skeleton from [§3](#3-repository-layout), plus `rust-toolchain.toml`, `deny.toml` and CI (fmt, clippy, test, deny, and the `core-wasm` job).
- Copy the Prometheus base agent rules into `AGENTS.md`/`CLAUDE.md`, and seed `openspec/`.
- **Spike F — built-in baseline (priority):** validate Julia 1 tokenization/formatting, ONNX graph operators, primitive semantics and numerical parity through the proposed Rust wrapper and native CPU runtime. Establish Windows/macOS/Linux and Android/iOS packaging/linking feasibility; measure clean-install offline startup, cold/warm p50/p95, peak RSS, installed package size and overlength/unsupported-option handling. Establish per-device budgets and record actual device/OS/runtime versions. Native Android/iOS acceptance cannot be inferred from the upstream Python tablet benchmark. Keep XNNPACK and quantization off until separate parity/quality gates pass. Resolve wrapper/runtime pins by manual acceptance and record ADR-019.
- **Spike A:** run Kev-4B (Python server) and `laya-rust` on the M-series Mac and on a Windows CUDA box. Record p50/p95 latency and memory for 1, 3 and 10 questions per state.
- **Spike B:** replay TypeSafe's public evals and Kev's frozen suites through both. Record accuracy, Brier and ECE.
- **Spike C:** in the candle-vllm fork, confirm whether Qwen3.8's Gated DeltaNet state can be snapshotted and forked per request. Timebox it to 3 days, and write ADR-004 with the result.
- **Spike D:** benchmark `laya-mlx` (all three checkpoints) against `laya-rust` on Metal, on the same M-series Macs. Include the stdio-worker hop, and decide v1 worker vs. native `mlx-rs`.
- **Spike E:** first verify permitted service use and score capabilities on an authorized endpoint. Compare complete candidate scoring with any explicitly described approximation on non-sensitive sets; record missing-token cases and hierarchy end-to-end error. Incomplete scores force Review. Historical token-plan latency is not entitlement or quality evidence; report blocked capabilities instead of bypassing them.
- Write ADR-001 (repo and crate boundaries), ADR-002 (pins, recorded in `versions.toml` by hand), ADR-003 (outcome semantics) and ADR-004 (LLM backend strategy).

**Exit gate:** CI is green on an empty workspace and the spike reports record observations, unresolved capabilities and authorized-service status in `evals/reports/`. ADRs 001–004 are accepted. M1a requires real embedded Julia 1 inference; its separate hosted gate requires a permitted non-sensitive Jev deployment before enabling Jev. Missing authorized TypeSafe access may leave that hosted gate explicitly blocked with Jev disabled; the default plan cannot be called shipping-ready before every targeted native platform has receipts. Optional-model spikes may record blocked/deferred outcomes without substituting a different default; unavailable optional Qwen capability remains disabled with an explicit blocked gate, never a fabricated successful spike.

### M1 — `decide-core` and `decide-schema` (week 2–3)

**Tasks:**

- Freeze the planned §5 types through ADR-003 and a cross-host OpenSpec change, then implement pure primitive-specific answers, per-question batch outcomes, score completeness, trusted locality grants, mandatory-guard requirements and proposal/audit-release semantics. Define Jev advisory refusals and streaming finalization schemas before adapters.
- Write the spec JSON Schema (via `schemars`) and `xtask spec-lint`. The lint enforces I-6 and I-8 tags, the option cardinality limit (≤255), the rule that floors reference real options, and that `clinical` specs have no `Act` option unless it is tagged `non_clinical_effect`.
- Implement the `/v1/systemone` codec, with snapshot fixtures taken from the Kev repo's examples.
- Author all 23 specs in `specs/` (CM-01…12, PA-01…11), plus `uar.route.*`, from the architecture doc catalog.

**Exit gate:**

- Proptest: outcome mapping honors I-1 and I-2 for 10k random inputs.
- Every spec passes lint.
- The core builds for wasm32.

### M1a — First real vertical slice (after M0/M1, before provider expansion)

**Entry:** M0 local feasibility and M1 schemas are accepted; the hosted subgate also requires accepted Jev service feasibility. Scope is approved non-clinical, non-sensitive data; no clinical promotion or Act claim.

**Tasks:** compose embedded `julia-onnx` as the no-configuration local default and a permitted hosted Jev deployment behind shared deterministic eligibility policy. Use Rust with native ONNX Runtime and the installed baseline asset bundle; no Python worker or local HTTP model service. Prove key-absent offline operation and that supplying a TypeSafe.ai key does not switch defaults. A separate explicit eligible host policy selects Jev. Implement the minimal host audit adapter and guard/required-rule enforcement (or explicit refusal when unavailable), native HTTP, restricted Jev compatibility, MCP tools over stdio and Streamable HTTP, and the READY lifecycle. Permit only Review or mandatory Escalate native results until matching production calibration and all required gates are available. Optional models, learned routing and MCP extensions are disabled.

**Local exit gate:** one real request and batch exercise every surface with real Julia 1 inference and durable audit receipts. Exercise clean offline installation with no configuration or key; prove 2–20 option boundaries, token bounds, fractional Score and independent Noul, plus no silent remote fallback for unsupported requests. Record the platforms actually exercised; desktop evidence does not certify mobile. Observe model-override refusal, incomplete-score abstention, mandatory-guard failure, audit-write failure with no Act, streaming with no pre-commit answer, and no hosted dispatch for unknown or disallowed data. Record protocol/client versions and actual output; mock-only results do not pass. This slice establishes production seams early; M2–M6 complete their production contracts and regression coverage without duplicating or bypassing the slice.

**Hosted exit gate:** repeat the applicable real request/batch and policy/credential cases against an explicitly authorized Jev deployment, recording real provider responses. No authorized TypeSafe access means this gate stays blocked/deferred and Jev stays disabled; it does not prevent the independently validated local baseline from proceeding. Do not advertise working Jev support until this gate passes.

### M2 — `decide-tripwire` (week 3–4)

**Tasks:**

- Define the rule-pack format: a TOML source containing literal, regex and proximity rules, with `rule_id`, `severity`, `category` and locale. Compile it to an Aho–Corasick automaton plus a `RegexSet`.
- Signing: `xtask sign rulepack` produces `pack.bin` plus an Ed25519 signature. Loaders verify against pinned public keys, which should be the same key-management approach as KnowMe's plugin manifests.
- Build a regression suite with positive and negative corpora for each rule. **A clinician owns the `counselme-crisis` corpus and signs off on it** (see [§15](#15-clinical-and-regulatory-gates)).
- Fuzz the parser and scanner with `cargo-fuzz`.

**Exit gate:**

- 100% of the positive corpus hits.
- The false-positive rate on the negative corpus is reported, with no ceiling (recall wins).
- Scan time is under 1 ms p99 for a 2k-character message on a phone-class CPU.

### M3 — `decide-calibrate` (week 4–5)

**Tasks:**

- Temperature scaling, fit by NLL minimization with golden-section search. Keep the dependency footprint small.
- Mondrian split conformal: class-conditional thresholds for each recall floor, with the finite-sample check in I-4. Optional group keys (counselor, clinic, payer) produce per-group thresholds, reporting a pooled threshold when a group is too small without claiming the original subgroup guarantee. A required subgroup floor lacking evidence forces Review; pooled fallback cannot bypass I-4.
- Artifact format: JSON plus an Ed25519 signature, with the fields spec id and version, deployment id, weights sha256, tokenizer, prompt/template, runtime/quantization, scoring transformation, candidate-completeness contract, route-policy revision, method, temperature, per-class thresholds and `n_pos`, groups, the dataset content hash, `fitted_at`, `valid_until` and a coverage report.
- Coverage report: held-out class/subgroup recall with uncertainty and sample counts, average set size, automation rate and error among automated outcomes, plus ECE before/after fitting. The I-4 minimum permits a finite conformal quantile under its sampling assumptions; it is not proof of deployed recall or automated-decision risk. See [conformal prediction reference](https://arxiv.org/abs/2107.07511).

**Exit gate:**

- On synthetic data with known calibration, empirical coverage is at or above the floor in ≥95% of 1,000 bootstrap trials for each class.
- An artifact with any mismatched pipeline or route identity is rejected. Synthetic coverage simulations check the implementation only; real held-out data is required for deployment claims.

### M4 — `decide-encoder` (week 5–7)

**Tasks:**

- A candle ModernBERT forward pass. Vendor or upstream the f16 attention-mask fix already made in `laya-rust` and `candle-semantic-router`, and run the Metal, CUDA and CPU backends.
- Zero-shot label-conditioned scoring (Laya, GLiClass style) and fine-tuned linear heads loaded from safetensors.
- Complete the M1a `julia-onnx` baseline through a Rust adapter over embedded native ONNX Runtime on Windows, macOS, Linux, Android and iOS. Verify exact tokenizer, input formatting, tensor layout, output decoding and Choice/Score/Noul semantics. Bundle weights/tokenizer/runtime/manifest before first launch, isolate ONNX/FFI from pure core, and keep optional mmBERT heads separate.
- Establish safe bounded allocation and explicit failure behavior for malformed, overlength and unsupported-cardinality input, missing/corrupt assets and memory pressure. No silent truncation, downloaded replacement or remote fallback; the trusted host exposes Review/refusal and preserves Escalate. Exercise crash/restart and audit failure through the actual application integration.
- Keep native CPU as the baseline. Quantized graphs or accelerator providers require separate per-platform parity, task-quality, performance and pipeline-specific calibration before selection.
- `training/encoder/`: a uv-managed Python pipeline (SetFit and full fine-tune) that exports safetensors, the head config and label maps. Training never runs on PHI outside the clinic tier.

**Exit gate:**

- Julia 1 Rust/ONNX outputs match the upstream reference within declared numerical tolerances (initial FP32 target 1e-3 on 500 fixtures) and preserve Choice, fractional Score and independent Noul behavior. Optional encoder heads have their own parity evidence.
- Each Windows/macOS/Linux and Android/iOS native application passes clean-install offline/no-key/no-config operation with all baseline assets already installed. Record cold/warm latency, peak RSS and package footprint against approved device-specific budgets, plus malformed/oversize/OOM handling, crash/restart, guard and audit outcomes. A build or emulator-only receipt cannot certify an untested device family.
- Latency meets [§11](#11-performance-budgets).
- `pa.doctype.v1` and `counselme.route.v1` run end to end on synthetic data.

### M5 — `decide-policy` and `decide-audit` (week 7–8)

**Tasks:**

- Complete the M1a shared cascade with per-layer τ, budgets, mandatory guards, destination grants and health fallbacks. Optional scoring exits cannot bypass guards. A failed required backend/guard degrades to Review unless escalation is already mandatory. The host commits the audit before release; exercise audit failure and explicit urgent escalation delivery (§5).
- The audit record: the spec, a redacted state hash, the output of each layer, the calibration ref, the outcome and the `prev_hash`, chained with BLAKE3.
  - Hosts provide storage through `AuditSink`. Adapters: SQLite (KnowMe and desktop), Postgres (prior-auth `audit_events`), SurrealDB (UAR) and JSONL (CLI).
- Host feedback capture: the authenticated `record_override` command (§5) writes an idempotent label event linked to the original audit record. Actor role comes from the host session. Add representative human sampling of Act, Review and Escalate, separate labeling provenance and leakage-safe splits; overrides alone create selection bias.
- Cedar context export: `Decision → cedar::Context` for UAR's `ToolApprovalGate` and KnowMe's grants.

**Exit gate:**

- The chain verifies after 1M appends.
- Tampering with any record fails verification.
- Property tests pass for I-1, I-2, I-5 and I-7.

### M6 — `decide-mcp`, `decide-server` and the `knowme-decide` binary (week 8–11)

**Tasks:**

- **`decide-server` (Axum 0.8.9):**
  - `POST /v1/systemone` with exact Jev wire compatibility (I-13), `POST /v1/decide`, SSE streaming on both (`route`, `answer`, `escalate`, `outcome`, `usage`, `done`, `error`), and the registry, health and metrics routes ([§5a](#5a-decision-proxy)).
  - MCP Streamable HTTP mounted at `/mcp`, and the feature-gated legacy HTTP+SSE shim.
  - A per-launch bearer token on loopback.
- **MCP acceptance** for each enabled revision and capability in §5a. Complete core stdio/Streamable HTTP first; then implement and separately verify selected optional extensions. Disabled or untested features are absent from advertised capabilities.
- An rmcp server using the `#[tool_router]` style from UAR's `mcp_server.rs`. It exposes:
  - **Tools:** `decide_choice`, `decide_score`, `decide_noul`, `decide_batch`, `route_intent`, `tripwire_scan`, `guard_check`, `sufficiency_check`, `decision_explain`, `decision_log_query` and `calibrate_fit` (admin).
  - **Resources:** `decide://specs/{id}`, `decide://calibration/{spec}@{ver}`, `decide://models` and `ui://decide/review-card` (an MCP App).
  - **Annotations:** `readOnlyHint` on decision tools; `calibrate_fit` is explicitly mutating and admin-gated. These hints are descriptive, never authorization. The host feedback command is a separate mutating app contract.
- Binary modes:
  - `knowme-decide mcp --stdio`.
  - `knowme-decide serve --port 0` prints `READY:{port}` on stdout, binds only to `127.0.0.1`, and exits when stdin closes. This matches `uar-sidecar` and The Boss's `UarSidecarService`.
  - `knowme-decide models {list,pull,verify}`.
  - `knowme-decide calibrate fit|report`.
  - `knowme-decide eval run <suite>`.
- Config: built-in defaults work without a TOML file or environment keys; optional TOML overrides select per-profile models, spec directories, audit sink and locality. The egress allowlist is empty by default. Ship the baseline asset bundle alongside the binary; CLI model downloads are only for explicitly selected optional models.
- The review card: a small HTMX/Alpine MCP App that renders each finalized answer, uncertainty, outcome, audit status and citations. Confirm/override invokes the authenticated host bridge command in §5, not a model-visible mutation tool. A host without the bridge provides a read-only card; host compatibility remains an ADR and real interoperability gate.

**Exit gate:**

- The MCP Inspector conformance run is clean over stdio and Streamable HTTP, for **both** protocol revisions (2026-07-28 and 2025-11-25).
- The TypeSafe Python/TS SDKs, pointed at `knowme-decide` with only the base URL changed, pass their examples. Recorded Jev responses retain schema/semantic fidelity within the advisory scope; JSON byte order is not the safety contract. Policy-required Review/Escalate and audit failures return explicit refusals without ordinary answers.
- SSE clients observe provisional progress and only finalized, audited per-question answers; guard/audit failures produce no actionable answer. Test individual batch failures and plain-Jev whole-batch refusal.
- The Boss can spawn the binary and list its tools in a local dev build.
- The binary's cold start is under 1.5 s without models loaded.

### M7 — `decide-llm` and `decide-guard` (week 10–14)

**Tasks:**

- **`decide-backends`, in this order:**
  1. Complete the M1a `jev` and generic `systemone-http` adapters. Every retry rechecks destination authorization and audit context; run the same conformance tests for each registered deployment (`laya-serve`, openjev-sglang, Kev).
  2. `qwen-remote` only on a permitted API service with verified scoring capability. Incomplete candidate scores force Review; any approximation or hierarchy is separately evaluated and calibrated, with no flat Jev-equivalence claim. Subscription credentials do not enable this backend.
  3. Optional `laya-candle` and additional `onnx-encoder` heads (from M4); retain the completed built-in `julia-onnx` default.
  4. `laya-mlx` as a supervised worker on Apple Silicon.
  5. `candle-vllm:<instance>` for Qwen3.8-27B and the smaller local Qwen models.
- **Remote scoring adapter:** authorized non-sensitive evals only, compiled only with `llm-remote`. Probe actual endpoint scoring/constraint support before relying on it; restricted generation does not by itself establish a complete candidate distribution.
- **LitJev local backend** in the candle-vllm fork:
  - Prefill the shared state once.
  - Fork each question: KV for the attention layers, plus a **snapshot of the DeltaNet recurrent state** (from Spike C).
  - Read the option-token logits with single-letter aliases for multi-token labels.
  - Batch the questions as rows.
- **LoRA plus pointer head** (Kev recipe), trained with soft targets. Weights load as adapters on the frozen Qwen3.8 base.
- **llguidance** for generated fields: action items, criteria decomposition and missing-evidence lists.
- **`decide-guard`:**
  - Qwen3Guard-Gen/Stream category parsing, with a streaming hook that consumes token deltas from the host.
  - Granite Guardian 4.1 yes/no logprob scoring with bring-your-own-criteria templates.
  - Shared runtime with `decide-llm`.

**Exit gate:**

- On Kev's frozen suites, the LitJev backend is within 2 points of accuracy and 0.02 Brier of Kev-27B on the same base. If it isn't, ADR-004 falls back to running Kev as a managed subprocess.
- Four-question batches beat four serial calls by at least 2.5×.
- Every backend passes the same golden suites through the proxy, with its own calibration artifact.

### M7b — Routing: sensitivity gate and backend router (week 13–15)

**Tasks:**

- Implement `proxy.sensitivity.v1`:
  - Authenticated host grants and trusted provenance establish eligible destinations; spec tags, Cedar denials and model checks only narrow them.
  - The PHI tripwire pack (HIPAA identifiers, MRN, member ID, ICD/CPT codes, medication lexicon).
  - The local Laya data-class Choice plus the sensitivity Noul, fitted with a **0.999 recall floor** on `phi` and `personal`.
- Implement `proxy.backend.v1`: capability filters, the Laya difficulty Score, and tier escalation inside the ceiling ([§5a](#5a-decision-proxy)).
- Shadow mode: mirror only separately authorized non-sensitive traffic to a second eligible destination; record redacted agreement and route-policy revision. Test that local-only/unknown/clinical inputs cannot be mirrored.
- Collect at least 1,000 **real**, human-reviewed PHI-positive calibration examples, and enough real personal-data positives to satisfy I-4, with separate held-out evaluation data. Keep synthetic training/regression examples separate; they never count toward `n_pos`. This minimum enables finite-sample calibration under its assumptions, not a claim of zero deployment disclosure.

**Exit gate:**

- Zero PHI-positive examples from the held-out set reach a hosted backend.
- Fault injection (a backend down, a timeout, a malformed response) never widens the ceiling (I-12).
- On representative authorized non-sensitive traffic, evaluate the complete router-plus-backend system, report accuracy, calibrated coverage, errors among Act results, latency and uncertainty against a fixed baseline. Enable learned routing only if it meets the predeclared spec gates; otherwise retain deterministic routing.

### M8 — The Boss integration and marketplace (week 12–15, overlaps M7)

**Tasks (PRs into `the-boss`):**

- Add `knowme-decide` to `build/integration-sources.json` (repo, rev, cargo package, features `decide-desktop`, Rust 1.97.1) and to `build/integration-artifacts.json` (an https URL and sha256 per platform). Add it to `scripts/release-profile.cjs`.
- Add it to `BUNDLED_TOOLS` in `BinaryManager.ts`, resolved through `getBinaryPath('knowme-decide')`.
- Implement the `@prometheus/decide` preset in the `prometheus-005-mcp-server-presets` change (`installSource: 'builtin'`, stdio by default).
- Build `DecideSidecarService` by copying `UarSidecarService.ts` (READY handshake, `ensureReady()`, process-tree kill) for shared-HTTP mode when UAR is enabled.
- Add an operator panel that shows requested vs. effective state: loaded specs, calibration versions, backends, automation rate at the current floors, baseline asset integrity and optional-model download status.
- Add a marketplace installer that reads `.claude-plugin/marketplace.json`, with `knowme-decisions` as a default source.

**Tasks (this repo):**

- Publish `marketplace/` with the four plugins and 14 skills. Validate them with `skills-ref validate` and `claude plugin validate`.

**Exit gate:**

- A clean install of The Boss on each advertised desktop target auto-registers `@prometheus/decide` and runs bundled Julia 1 offline without a key, configuration file or first-use download. Record native receipts separately for Windows, macOS and Linux; targets without receipts remain unverified.
- The `escalation-gate` skill runs end to end against the bundled sidecar with synthetic data.

### M9 — UAR and KnowMe integration (week 14–18)

**UAR:**

- Add `ClassifierBackend::Decision` behind `IntentClassifier`. Its prediction set replaces `should_accept` and the `out_of_scope` heuristic.
- Replace the LLM prompt in `RouterNode` with `route_intent`.
- Add the task-type Choice to `ModelRouter`.
- Register the decide tools as `NativeSkill`s and add them to `UarRuntimeMcpServer`.
- Add a `decision_models:` config section.
- Write a new openspec change that replaces the keyword approval heuristic with decision-backed Cedar context, which supersedes the ML exclusion in `mount-governance-guardrails`.
- Bump rmcp to `=3.5.0`.

**KnowMe:**

- Add `gen_ui_decide` (L2) behind a `DecisionProvider` trait in `gen_ui_types`.
- Expose it over FFI with the `decide-lite` profile on Android and iOS and in-process through `tauri-plugin-gen-ui` on desktop. Both use the installed Julia 1/ONNX baseline without configuration or network setup. Optional Jev calls belong to the separate trusted host networking boundary; `decide-lite` remains remote-free.
- Emit decisions through the existing `agui.guardrail` and `uar.guardrail.flagged` events.
- Make `decide-mcp` the first outbound MCP server (skill-support §3).
- Plan the candle 0.11 bump.

**Exit gate:**

- UAR routing on its existing skill suites is at least as accurate as the TF-IDF default, with calibrated abstention.
- KnowMe Android and iOS native apps run CM-01 tripwires and CM-02 routing fully on device in airplane mode after a clean installation, subject to the unchanged calibration/clinical outcome gates. Windows, macOS and Linux desktop hosts provide the same baseline and key-optional Jev behavior. Record packaging, cold/warm memory/latency, failure and audit receipts per supported device family; unavailable devices remain unverified.

### M9b — Browser tier (week 16–19)

**Tasks:**

- Build `decide-wasm` with `wasm-bindgen`: the pure crates plus a JS `DecisionProvider` with the same outcome contract.
- The encoder runs through ONNX Runtime Web (WebGPU with a WASM fallback): Julia 1 or a Laya-for-web int4/int8 checkpoint in Cache Storage, with its own calibration artifact (I-2 binds calibration to the weights hash).
- Add a local PGlite audit/label store. Sync is separately granted and disabled for DeviceOnly data; measure inference egress and storage/label egress independently.
- Integrate into prior-auth web (PA-11 document type, PA-04 void source) and KnowMe web (`gen_ui_wasm`).
- Build a workflow-DAG demo inspired by layaForWorkflows. Clearly label recorded/simulated runs; acceptance uses live inference. Missing low-confidence branches must produce Review, not proceed with an uncertainty flag.
- Add an opt-in loopback bridge to a local `knowme-decide` (Private Network Access headers plus a token).

**Exit gate:**

- Live browser inference produces no network requests; DeviceOnly protected data also produces no audit/label synchronization. Separately authorized sync is tested and labeled distinctly from DeviceOnly mode.
- The browser calibration artifact meets its floors on the golden suite.
- The page loads with cached weights in under 3 s on a mid-range laptop.

### M10 — Clinical rollouts (week 16+)

These are gated by [§15](#15-clinical-and-regulatory-gates).

**Prior-auth (shadow, then proposals):**

- Add the `aso-decide` kernel crate beside `clinical-docs` (no I/O), behind a port in `aso-host`. Bump prior-auth's rmcp from `3.4.0` to `=3.5.0` in the same change.
- Shadow mode: PA-03, PA-06 and PA-07 run on every case. Proposals are logged but not shown, then compared with coordinator and surgeon actions.
- Encode 3–5 spine policies (lumbar fusion first) through PA-02, with human verification. Label 100+ chart and criteria pairs.
- Fit conformal floors on `void` and `gap`, then turn on proposal display. Abstentions go to `classification_needs_review`.

**CounselMe (pilot):**

- Ship CM-01 (the tripwire pack plus a fine-tuned crisis classifier) before anything else.
- Run CM-03 with every draft held until the counselor-labeled set supports the ≥0.95 recall floor on `hold_for_clinician`. Report the measured automation rate to the counselor, then decide.
- Enforce CM-04 jurisdiction rules from day one.

**Exit gate:** see [§15](#15-clinical-and-regulatory-gates).

---

## 7. Models and weights

`models/registry.toml` is the planned single manifest. The binary must refuse unregistered models. This proposed schema uses explicit placeholders; no hash, checkpoint acceptance or service authorization is asserted.

```toml
[[model]]
id        = "julia-1"
role      = "encoder"
backend   = "julia-onnx"         # proposed built-in deployment id
source    = "hf://SupersonicLabs/Julia-1"
sha256    = "<verified-release-sha256>" # placeholder; acceptance records actual file hashes
license   = "Apache-2.0"
tiers     = ["desktop", "mobile", "server"]
accept    = "none"              # notices still bundled; model presence does not grant Act

[[model]]
id        = "laya-modernbert-large-en"
role      = "encoder"            # encoder | llm | guard | extractor
source    = "hf://…"             # or ipfs://<cid>, https://…
sha256    = "…"
license   = "Apache-2.0"
tiers     = ["desktop", "server"]
accept    = "none"               # none | click-through | legal

[[model]]
id        = "medgemma-27b-text-it"
role      = "extractor"          # I-8: never "llm" or "guard"
license   = "HAI-DEF"
accept    = "legal"              # requires recorded acceptance before pull

[[model]]
id        = "laya-mlx-typed-decisions-fp16"
role      = "encoder"
backend   = "laya-mlx"           # Apple Silicon only
source    = "hf://…"             # pinned laya-mlx conversion of the upstream Convai checkpoint
repo_rev  = "mizorewww/laya-mlx@<commit>"
sha256    = "…"
license   = "Apache-2.0"
tiers     = ["mac"]
accept    = "none"

[[remote]]
id        = "jev"
endpoint  = "https://api.typesafe.ai/v1/systemone"
env       = ["JEV_API_KEY"]
locality  = "hosted"             # I-11: non-PHI only
baa       = false

[[remote]]
id        = "qwen-remote"
enabled   = false               # until permitted service and scoring capability are verified
# Authorized endpoint and secret reference are selected at M0; no token-plan entitlement.
locality  = "hosted"
baa       = false
```

- **Distribution:** release engineering mirrors approved weights to Pinata/IPFS (`ipfs.prometheusags.ai`) and pins them by CID plus sha256; Hugging Face is a build/intake fallback. The baseline app release includes the verified Julia 1 graph/weights, tokenizer, native runtime, manifest and notices in the installed asset set before first launch. IPFS and `models pull` are not startup dependencies. Only separately selected optional models may require a later download. Sign/update the bundle atomically, retain rollback compatibility, and reject a model/calibration identity mismatch.
- **License gates:**
  - Arch-Router (Katanemo license) and MedGemma (HAI-DEF) need recorded acceptance before `models pull`.
  - Apache-2.0 models don't: Kev, Laya, Julia 1, Qwen3Guard, Granite Guardian and gpt-oss-safeguard.
- **Baseline:** Julia 1 through native ONNX Runtime for Windows/macOS/Linux, Android and iOS; optional Jev via a TypeSafe.ai key and eligible host policy. CLM is excluded from current implementation scope.
- **Optional expansion set (explicit installation and acceptance):**
  - **Phone:** additional mmBERT heads or Qwen3Guard-0.6B where resource/quality gates pass.
  - **Desktop:** Laya-rust, Kev-4B/9B or LitJev adapters, Qwen3Guard-Stream-4B, and Granite Guardian 8B at Q4.
  - **Mac (Apple Silicon):** desktop options plus `laya-mlx` checkpoints (English, multilingual, typed-decisions).
  - **Browser:** Julia 1 WebGPU, or a Laya-for-web int4/int8 ONNX checkpoint.
  - **Clinic:** LitJev on Qwen3.8-27B, Granite Guardian 8B, and MedGemma 27B as an extractor.
  - **Async audit:** gpt-oss-safeguard-20b.
  - **Hosted (non-PHI only):** `jev` (TypeSafe) and `qwen-remote` on a permitted, capability-verified API service; subscription token plans are not an application-backend entitlement.
  - **Local Qwen via candle-vllm:** Qwen3.8-27B for the clinic tier, plus the smaller Qwen3.5/3.8 sizes (0.8B, 4B, 9B) for desktop.
- **Checkpoint intake:** a candidate from the open ecosystem (awesome-jev lists, jev001.org) is added only after it passes, in order: license, wire conformance (`systemone-http`), golden suites (accuracy, Brier, ECE) and latency budget.

---

## 8. Data, labels and calibration

- **Labels represent the deployed population.** Resolved Reviews use the authenticated host command; additionally sample Act and Escalate outcomes for human adjudication. Record source, sampling probability and adjudication provenance, and evaluate selection bias. Overrides alone miss confidently wrong automation. Host products provide these workflows; no separate labeling product is required.
- **PHI stays at the tier it came from.** Counseling labels live on the counselor's device or practice store. Prior-auth labels live in the clinic's Postgres. Fitting happens where the data lives, using `knowme-decide calibrate fit`, and only the signed artifact (thresholds, not data) moves.
- **Splits:** train, then calibration, then test, split by time with no leakage across patients or cases. The calibration split is never used for training heads.
- **Rare classes:** crisis classes are oversampled with synthetic examples that a clinician has reviewed. Synthetic examples may train heads but **never** count toward the calibration `n_pos` in I-4.
- **Minimums (I-4):** a 0.99 floor needs ≥99 real positives, and a 0.95 floor needs ≥19. Until a class meets its minimum, it forces `Review`. The operator panel shows progress toward each minimum.
- **Recalibration triggers:** changes to deployment, weights, prompt/template, tokenizer, quantization/runtime, candidate scoring/transform, spec version or route selection policy; `valid_until` expiry (default 90 days); or drift alarms (§16). Bind artifacts to the complete pipeline, and re-evaluate routing as a system. A stale or mismatched identity forces Review. The finite-sample minimum is necessary, not proof of deployment recall, subgroup coverage or low error among Act outcomes.

---

## 9. Evaluation and promotion gates

| Suite | Contents | Used for |
|---|---|---|
| `kev-frozen` | Kev's locked OOD suites | LitJev parity (M7) |
| `typesafe-public` | TypeSafe's published eval tasks | Cross-model comparison |
| `jev-replay` | Recorded non-PHI Jev traffic | A/B test against the hosted baseline |
| `golden/<spec>` | Separate real representative held-out labels and explicitly synthetic regression fixtures | Real data supports calibration/promotion claims; synthetic cases support regression only |
| `crisis-regression` | The clinician-owned tripwire and classifier corpus | A hard gate on every release |
| `sensitivity` | PHI and personal-data positives and negatives for `proxy.sensitivity.v1` | A hard gate: zero PHI positives may reach a hosted backend |
| `proxy-shadow` | Separately authorized non-sensitive traffic, answered by two eligible backends | Agreement is comparative evidence, not truth labels or calibration |
| `systemone-conformance` | Recorded Jev request/response pairs | I-13 wire fidelity, for the proxy and every registered `systemone-http` server |

**Metrics per spec and full routed pipeline:** accuracy, macro-F1, class/group recall with uncertainty and real sample counts, Brier/ECE only for declared valid probability outputs, uncertainty/set size, automation rate, error among Act outcomes, and p50/p95 latency. State exchangeability/sampling assumptions and limits; pooled coverage cannot be presented as subgroup coverage.

**Promotion rules:**

- A spec moves from `shadow` to `review-only` to `act-enabled` only when its golden-suite metrics meet the thresholds in its spec file, and (for clinical specs) the [§15](#15-clinical-and-regulatory-gates) checklist is signed.
- Any regression in `crisis-regression` blocks the release. There is no override flag.

---

## 10. Testing strategy

- **Unit and property** (`proptest`): outcome mapping, locality guard, conformal coverage on synthetic data, and audit chain integrity.
- **Snapshot** (`insta`): the `/v1/systemone` wire format, MCP tool schemas and spec JSON Schema.
- **Fuzz** (`cargo-fuzz`): the rule-pack parser, tripwire scanner, spec parser and systemone decoder.
- **Parity:** Julia 1 Rust/native ONNX vs. upstream reference tensors and all three primitive semantics; Rust vs. Python logits for optional encoder heads, and LitJev vs. Kev on shared fixtures. Quantization/provider changes require new evidence.
- **Baseline application acceptance:** actual native Windows/macOS/Linux and Android/iOS installs with prebundled assets, no configuration/key/network and no separate model service. Capture cold/warm latency, peak RSS and package size. Cover corrupt/missing assets, malformed/overlength requests, more than 20 options, OOM, crash/restart, guard and audit failures. Confirm a key does not change the default, and no unsupported request silently leaves the device.
- **Conformance:**
  - MCP Inspector over stdio and Streamable HTTP, for both protocol revisions (2026-07-28 and 2025-11-25), covering core lifecycle/tools first and each advertised optional feature separately. `subscriptions/listen`, MRTR, Tasks and MCP Apps require their own enabled-feature and actual-host receipts.
  - The legacy SSE shim, when its feature is enabled.
  - TypeSafe SDK examples against `/v1/systemone`.
  - `claude plugin validate` for the marketplace.
- **Proxy:**
  - Fault injection: backend down, timeouts, 429, 529 and malformed responses. The assertion is I-12: the ceiling never widens.
  - SSE finalization, no answer before mandatory guards/outcome/audit commit, and explicit audit failure without invented ids.
  - Missing candidate scores, hierarchy routing errors, representative-label sampling and calibration/pipeline mismatch.
  - DeviceOnly storage/label egress, authenticated grants, shadow dispatch and tenant/actor linkage on host overrides.
  - The per-request `model` override honors the ceiling (e.g., `model: "jev-latest"` on a PHI spec returns 403 with an audit record, never a hosted call).
- **Cross-host integration:** a `tests/hosts/` harness that runs the sidecar the way The Boss spawns it (READY handshake, stdin-close exit), and links `decide-policy` as UAR does (`embedded-mobile` features).
- **Build matrix:** `wasm32-unknown-unknown` for core and `decide-wasm`; Android and iOS native app/FFI builds; Windows x64/ARM64, macOS ARM64/x64 and Linux desktop targets. Verify target/link/runtime combinations at M0 before pinning. Test optional `laya-mlx` separately on eligible macOS ARM64 deployments. Compiling a target does not close native runtime or device acceptance.
- **Benchmarks** (`criterion`): each layer against [§11](#11-performance-budgets). CI fails if p95 regresses by more than 15%.

---

## 11. Performance budgets

| Layer / tier | Phone CPU | Mac M-series | Windows CUDA | Clinic GPU |
|---|---|---|---|---|
| Tripwire scan (2k chars) | < 1 ms | < 0.3 ms | < 0.3 ms | < 0.3 ms |
| Encoder decision | < 250 ms | < 40 ms | < 25 ms | < 20 ms |
| LLM head, 1 question | — | < 600 ms (4B) | < 300 ms (9B) | < 400 ms (27B) |
| LLM head, 4-question batch | — | < 1.0 s | < 0.6 s | < 0.8 s |
| Guard (Granite 8B Q4) | — | < 900 ms | < 400 ms | < 300 ms |
| Full cascade, encoder exit | < 300 ms | < 60 ms | < 40 ms | < 40 ms |
| Sidecar cold start (no models) | — | < 1.5 s | < 1.5 s | < 1.5 s |
| Laya MLX decision (incl. worker hop) | — | < 20 ms (author reports 7–13 ms p50 on M3 Max) | — | — |
| Sensitivity gate + backend routing | < 30 ms | < 20 ms | < 15 ms | < 15 ms |
| Proxy overhead (excluding the backend) | — | < 3 ms p95 | < 3 ms p95 | < 3 ms p95 |
| Hosted `jev` (network included) | — | ~240 ms observed | — | — |
| Historical Qwen token-plan probe (network included) | — | ~1.7 s recorded by prior analysis; not independently reproduced or authorized for production | — | — |

These are targets to validate in M0 and M4–M7, not measured Julia 1 guarantees. M0 Spike F must add approved cold-start, warm latency, peak RSS and installed-package budgets for each baseline native device family, including Linux and iOS. The upstream approximately 203 ms Android-tablet figure used Python-driven ONNX and does not satisfy native mobile acceptance. Adjust targets by ADR, never silently.

---

## 12. Security and privacy

**Threat model:**

- A malicious or buggy host passes crafted state.
- A tampered rule pack or calibration artifact.
- A poisoned model file, or an unverified third-party conversion (for example, a community MLX or ONNX port).
- PHI routed to a hosted backend because a router made a mistake.
- Secrets from `.env` leaking into logs, audit records or SSE streams.
- Data leaving the device through a remote backend.
- A compromised audit log.
- Prompt injection through documents in prior-auth charts.

**Controls:**

- Ed25519 signatures on rule packs, calibration artifacts and signed spec bundles, with public keys pinned in the binary.
- A sha256 check on every weights file before it loads.
- `cargo deny` and `cargo audit` in CI.
- The egress allowlist is empty by default. The `remote` features are compiled out of `decide-lite`, and `DeviceOnly` specs can't reach a network backend (I-5).
- Audit records store a redacted state hash, never raw text. The host keeps any raw text under its own retention policy.
- A BLAKE3-chained audit log. Chain heads can optionally be anchored by pinning a head CID to IPFS each day.
- Prompt-injection posture: decision backends only produce distributions over fixed options, so injected text can't create new actions. Guards score citations against source quotes, and tripwires scan retrieved text as well as user text.
- The sidecar binds only to loopback in HTTP mode, and requires a per-launch bearer token passed through the environment by the host.
- `.env` holds secrets only and is gitignored; the repo ships `.env.example`. Hosted keys are read once at startup and redacted from every log, audit record and SSE event. A hosted endpoint joins the allowlist only after service-use authorization and deployment review; each request additionally needs authenticated tenant/destination grants and trusted non-sensitive provenance. Keys and `router.hosted_allowed = true` alone are insufficient.
- Third-party conversions (`laya-mlx`, Laya-for-web ONNX) are pinned by repo commit plus checkpoint sha256. They must match the upstream PyTorch outputs on our golden suites before registration.
- MCP HTTP follows the 2026-07-28 auth rules: OAuth 2.1 resource server, protected-resource metadata, `iss` validation and Client ID Metadata Documents. Loopback sidecar mode keeps the per-launch token.

---

## 13. Release engineering

- **Versioning:** one workspace version (semver). Specs, rule packs and calibration artifacts have their own versions and are released independently of the binary.
- **Baseline assets and mobile packaging:** each supported app installation must contain the verified Julia 1 graph/weights and tokenizer, platform ONNX Runtime libraries, manifest, license notices and default settings before first launch. Record total download/installed size separately from peak working memory, and validate platform distribution limits. Include native Android/iOS packages and FFI/runtime linking evidence. Failure to meet a package budget blocks that platform's default claim; it does not authorize a hidden first-run download or hosted fallback.
- **Artifacts per release:** `knowme-decide-<ver>-<platform>.{tar.zst,zip}` with sha256, pinned to IPFS through Pinata, with the URL and hash recorded for The Boss's `integration-artifacts.json`. Keep a GitHub release as a mirror.
- **Signing:** notarize macOS builds (Developer ID) and Authenticode-sign Windows builds.
- **Release checklist** (`xtask release`):
  1. CI is green across the full matrix.
  2. `crisis-regression` passes.
  3. The MCP conformance run is clean.
  4. The `models/registry.toml` hashes and complete baseline asset manifests verify, including tokenizer, graph/external data, runtime and notices. Clean offline/no-key/no-config installations pass on every advertised native platform with approved package/memory/latency budgets.
  5. The changelog is updated.
  6. Artifacts are pinned, and the CIDs and sha256 are written to `dist/release.json`.
  7. The Boss pin-bump PR is opened.

---

## 14. Host integration contracts

Every host PR must satisfy these contracts.

1. **Act only on the finalized effective `outcome` with a committed audit receipt, never on an informational answer.** Use native outcome-aware APIs; plain Jev compatibility is not a clinical/automation integration contract.
2. **Route every `Review` to a human surface**, either the review card or the host's own UI, and call `record_override` when it is resolved.
3. **Clinical state changes go through the host's own confirmed commands.** In prior-auth, these are the `evidence_assembly`, `reassessment` and `determination` commands. In CounselMe, sending a held draft requires counselor approval.
4. **Provide the trusted-host audit adapter** with required retention and failure handling (§5). Kernels never persist. Withhold Act on audit failure while delivering explicit urgent escalation to the human path.
5. **Never expose affirm, sign, submit or treat tools** in the same MCP session as the decide tools without a separate approval gate.
6. **Display locality to operators.** Users must be able to see where each decision ran.
7. **Supply authenticated grants and trusted provenance.** Spec ids/tags and `X-Data-Class` hints can restrict permissions, never independently grant them. Hosted model overrides on clinical/unknown data are refused and audited. Apply the same policy to retry, shadow, telemetry and sync.
8. **Ship the built-in baseline.** Include the complete Julia 1/ONNX asset set before first launch on desktop and mobile. No model setup or key is required. Jev is optional and explicitly selected through trusted host policy; mobile networking remains outside `decide-lite`. Document unsupported input and resource failures without silent remote fallback.
9. **Own feedback writes.** Authenticate the review-card bridge and derive actor/tenant identity server-side; require audit linkage and idempotency. Provide representative human labeling across all outcomes. Unsupported bridges expose read-only controls.

The integration details for each host (files, types and seams) are in [`architecture/knowme-decision-layer.html`](architecture/knowme-decision-layer.html), §07 "Product integration".

---

## 15. Clinical and regulatory gates

A clinical spec can't move beyond `shadow` until every applicable box is checked and signed. Record this in `docs/adr/` or `openspec/` as the product requires.

**CounselMe:**

- [ ] The clinician owns the `counselme-crisis` rule pack and regression corpus, and has signed off.
- [ ] The after-hours escalation protocol and safety plan are defined by the counselor, and 988 wording has been reviewed.
- [ ] A counsel opinion covers Illinois HB 1806 (Public Act 104-0054) and every other state in the pilot footprint. The CM-04 jurisdiction table is versioned and reviewed.
- [ ] Wellness-signal wording (CM-08) has been reviewed against the FDA January 2026 CDS guidance, so it stays wellness-framed with no clinical pattern interpretation.
- [ ] Consent flows cover recordings with third-party voices (CM-10).
- [ ] The labeled set meets the I-4 minimums for `hold_for_clinician` and all crisis classes.
- [ ] A HIPAA risk assessment is complete, and a BAA is in place with any hosting provider in the path. There is none in the device-only mode.
- [ ] Hosted routing is off for the CounselMe tenant, and the `sensitivity` suite gate is green.

**Prior-auth:**

- [ ] Proposal-only operation has been verified. No code path writes clinical state without a human command (I-6).
- [ ] The MedGemma license posture is confirmed: extractor-only, with human review of its output (I-8).
- [ ] Transparency: each proposal shows its criterion, citations and calibration version. This is the FDA CDS "basis for recommendation".
- [ ] Texas SB 1188 and TRAIGA AI-disclosure reporting is fed from `audit_id`.
- [ ] Hosted backends are disabled for the clinical tenant (`router.hosted_allowed = false`). No clinical spec dispatches hosted. A BAA alone does not override I-11; any future change requires an ADR and every affected host owner's sign-off.
- [ ] Shadow-mode agreement has been reviewed by the surgeon and coordinator.
- [ ] Criteria for each policy version have been verified by a person (PA-02).

---

## 16. Operations runbooks

- **A crisis false negative is reported.**
  1. Freeze CM-03 to hold every draft.
  2. Add the case to the `crisis-regression` corpus.
  3. Patch the rule pack, re-sign it and hotfix-release it.
  4. Refit the crisis classifier's calibration.
  5. Run a post-incident review with the clinician.
- **Coverage drift alarm** (representatively sampled, adjudicated outcomes show a recall/coverage failure or insufficient evidence; override-only rates are diagnostic, not population estimates):
  1. The spec automatically downgrades to `review-only`.
  2. Refit with fresh labels.
  3. Re-promote the spec through [§9](#9-evaluation-and-promotion-gates).
- **Model rollback:** point the registry at the previous CID. Calibration artifacts must match the entire deployment/scoring/route identity and remain valid; only then may a previous artifact reactivate. Otherwise the spec falls back to Review (I-2).
- **Audit export for counsel or payers:** use `decision_log_query` plus the chain verification report. Redaction follows the host's policy.
- **Backend outage:** the cascade degrades to Review unless a tripwire or required guard has already fixed Escalate; operators see the failure. Never fail open.
- **A hosted backend is degraded (429, 529 or a revoked key):** the router drops it from the eligible set and escalates within the ceiling. Operators see the change on `/v1/backends` and in the panel.
- **Suspected PHI sent to a hosted backend:**
  1. Set `router.hosted_allowed = false` for every tenant at once.
  2. Pull the audit records for the affected requests, which carry the backend and the ceiling reason.
  3. Start the HIPAA breach-assessment process with counsel.
  4. Add the case to the `sensitivity` suite.
  5. Refit, and re-promote only after the gate is green.

---

## 17. ADR backlog

| ADR | Decision |
|---|---|
| 000 | Record architecture decisions (template) |
| 001 | Separate repo and crate boundaries |
| 002 | Dependency pins: rmcp `=3.5.0`, axum `=0.8.9`, candle `=0.11.0`, llguidance `=1.8.0`, candle-vllm fork rev (recorded in `versions.toml` by hand) |
| 003 | Outcome semantics and invariants I-1…I-13 |
| 004 | LLM backend: LitJev on the candle-vllm fork vs. Kev subprocess (from Spike C) |
| 005 | Calibration method: temperature plus Mondrian split conformal; group keys |
| 006 | Rule-pack format and signing keys |
| 007 | Audit chain format and storage adapters |
| 008 | Sidecar transport and auth (stdio default; HTTP loopback with a bearer token) |
| 009 | Weight distribution through IPFS/Pinata, and license gates |
| 010 | Marketplace layout and skill naming |
| 011 | Clinical promotion process (shadow → review-only → act-enabled) |
| 012 | Decision proxy: Jev-compatible API as the public contract, with the native API and MCP beside it |
| 013 | Authenticated destination grants and provenance first; sensitivity model only narrows, with 0.999 PHI/personal target and no zero-disclosure claim (I-11, I-12) |
| 014 | MCP protocol support: 2026-07-28 native, 2025-11-25 compatibility, legacy HTTP+SSE shim off by default |
| 015 | Laya MLX integration: supervised worker (v1) vs. native `mlx-rs` (v2), from Spike D |
| 016 | Remote-service authorization and scoring completeness; incomplete scores force Review, approximations/hierarchies require scoped pipeline evaluation (Spike E) |
| 017 | Browser tier: ONNX Runtime Web, local PGlite audit sink, separately granted sync and calibration per deployment |
| 018 | Review-card stack and host bridge compatibility: read-only fallback, authenticated human override command, host-specific evidence |
| 019 | Built-in Julia 1 through Rust/native ONNX Runtime: offline installed bundle, desktop/mobile acceptance, local default plus optional TypeSafe-key Jev, calibration limits and CLM deferral (Spike F) |

---

## 18. Open questions

1. Does the candle-vllm fork's paged attention let us fork DeltaNet state cheaply, or does LitJev need its own scheduler? Spike C answers this.
2. Should the review card be one MCP App shared by all hosts, or a host-native component per host fed by the same resource?
3. Where does counseling calibration run: on the counselor's device, or in a practice-level store? This affects the Mondrian group keys.
4. Can Jev A/B testing on non-PHI traffic run from The Boss, or only from a server?
5. Is a pinned daily audit anchor on IPFS acceptable to counsel, given that the head hash reveals only activity volume?
6. Who holds the Ed25519 signing keys for rule packs and calibration (KnowMe, LLC vs. the clinic), and how are they rotated?
7. Which permitted remote API service and contractual terms meet the product's needs? A future BAA still requires an explicit ADR and affected-host sign-off before any change to I-11; the present scope remains non-sensitive only.
8. Should the proxy also expose an OpenAI-compatible `/v1/chat/completions` facade for agent frameworks that can't speak `/v1/systemone`?
9. Which ecosystem adapters pass the checkpoint-intake gates? The initial Reddit fetch was blocked, but the subsequent review accessed it and identified System One Connector and jev-mcp as integration references, not safety/calibration evidence.
10. Should the browser tier ship Laya-for-web int4 (about 278 MB) or int8 (about 422 MB) weights? Decide from M9b calibration quality at each size; these are not Julia 1 native package estimates.
11. Which exact Julia 1 graph/tokenizer, Rust wrapper/native ONNX Runtime versions and native device tiers pass Spike F? Establish minimum OS/device resources and package budgets before claiming availability. FP32 is the initial reference; quantization remains conditional on evidence.

---

## 19. Definition of done

The full M0–M10 program is "production" when all of these are true. The Julia 1 + optional Jev baseline is a distinct release scope: its M0, M1a local, M4/M5/M6 and relevant host gates must pass; enabling Jev additionally requires the M1a hosted gate, while optional model/router/browser expansion can remain disabled and pending. Do not delay a validated baseline solely to bundle optional heavy models, or claim full-program completion from baseline receipts.

- [ ] Every crate in [§3](#3-repository-layout) is released, the invariants I-1…I-13 are enforced by tests, and CI covers the full matrix.
- [ ] `knowme-decide serve` passes TypeSafe SDK examples on `/v1/systemone`, streams over SSE, and passes MCP conformance for 2026-07-28 and 2025-11-25 with rmcp `=3.5.0`.
- [ ] The built-in Julia 1/Rust/native ONNX baseline passes clean-install, offline, no-key and no-configuration native acceptance on every advertised Windows/macOS/Linux, Android and iOS target. All weights/tokenizer/runtime assets are installed before first launch; measured package/RSS/latency budgets pass. Missing calibration still forces Review or mandatory Escalate.
- [ ] Optional Jev requires a TypeSafe.ai key and explicit eligible host selection; the key never changes the default or authorizes sensitive-data egress, including unsupported/oversized local requests.
- [ ] Expanded, explicitly configured `auto` routing is live across `julia-onnx`, `jev`, `qwen-remote`, `laya-mlx`, `laya-candle` and at least one `candle-vllm` instance. The `sensitivity` suite shows zero PHI reaching a hosted backend.
- [ ] The browser tier runs live calibrated inference in prior-auth web with no inference network calls, and no protected-data sync in DeviceOnly mode. Any separately authorized sync has independent evidence.
- [ ] `knowme-decide` ships in The Boss as `@prometheus/decide`, with the operator panel and separate Windows/macOS/Linux baseline evidence for its supported desktop targets.
- [ ] UAR and KnowMe link the crates natively. KnowMe mobile runs tripwires and routing fully offline.
- [ ] The `knowme-decisions` marketplace is published and installable in The Boss and Claude Code.
- [ ] Prior-auth runs PA-03, PA-06 and PA-07 as calibrated proposals, and the [§15](#15-clinical-and-regulatory-gates) boxes are signed.
- [ ] The CounselMe pilot runs CM-01 through CM-04 with the [§15](#15-clinical-and-regulatory-gates) boxes signed and a measured automation rate the counselor has accepted.
- [ ] Runbooks from [§16](#16-operations-runbooks) have been exercised at least once in a drill.
