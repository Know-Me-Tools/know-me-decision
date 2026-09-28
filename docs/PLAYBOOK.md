# know-me-decision — Production Build Playbook

This playbook covers how to build the production version of the KnowMe decision layer in this repository: a Rust crate family, an MCP sidecar, a skills marketplace, and the integrations into The Boss, UAR, KnowMe and the Prior Authorization Workbench.

It is written for two readers: the engineers doing the work, and the coding agents (Claude Code, Codex, UAR agent teams) they point at it. Every milestone has an entry condition, concrete tasks, deliverables and an exit gate. Don't start a milestone until the previous gate is green.

The design this playbook implements is in [`architecture/knowme-decision-layer.html`](architecture/knowme-decision-layer.html), which is also [pinned on IPFS](https://ipfs.prometheusags.ai/ipfs/bafkreiebxmldfdhyih57xwqnxq3beqa3whbhbiz556feamkz2r2botipay). The model research behind it is in [`research/open-decision-models-2026-09.md`](research/open-decision-models-2026-09.md).

---

## 0. Contents

1. [Scope and non-goals](#1-scope-and-non-goals)
2. [Invariants](#2-invariants)
3. [Repository layout](#3-repository-layout)
4. [Toolchain and conventions](#4-toolchain-and-conventions)
5. [Core contracts](#5-core-contracts)
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
  - `decide-encoder`, ModernBERT/mmBERT heads via candle, with an ONNX fallback.
  - `decide-llm`, the Jev-style logit reader over Qwen3.8 through the candle-vllm fork, plus a remote logprobs adapter.
  - `decide-guard`, Qwen3Guard and Granite Guardian.
  - `decide-calibrate`, temperature scaling and Mondrian split conformal.
  - `decide-policy`, the cascade, locality and outcome mapping.
  - `decide-audit`, a hash-chained decision log with override capture.
  - `decide-mcp`, the rmcp server.
- **The `knowme-decide` binary.** It runs as an MCP stdio server, as a streamable-HTTP sidecar using the `READY:{port}` handshake, and as a CLI for weights, calibration and evals.
- **Spec and rule-pack libraries** for CounselMe (CM-01…CM-12) and prior-auth (PA-01…PA-11).
- **The `knowme-decisions` plugin marketplace**, AgentSkills.io compatible, with four plugins and 14 skills.
- **Integration PRs** into `the-boss`, `universal-agent-runtime`, `know-me-system` and `TribeHealth/kevin/prior-auth`.

### Non-goals

- **Training frontier models.** We fine-tune heads and small classifiers. We don't pre-train.
- **Hosted inference for PHI.** Remote adapters exist only for non-PHI evaluation and A/B testing against Jev.
- **Autonomous clinical action.** No tool approves, denies, signs, submits or treats. See [§2](#2-invariants).
- **A labeling product.** Labels come from overrides in the host products, through the review card. This repo only provides the capture contract and the dataset tooling.

---

## 2. Invariants

These rules are enforced in code and tests, not by convention. A PR that weakens one needs an ADR and sign-off from the product owner of every affected host.

| # | Invariant | Enforced by |
|---|---|---|
| I-1 | **Tripwires run first and can't be overridden.** A hit always gives `Outcome::Escalate`. | `decide-policy` cascade order; a property test that no backend output can flip a tripwire escalation |
| I-2 | **No calibration artifact means no `Act`.** A spec without a valid, signed, in-date calibration artifact can only return `Review` or `Escalate`. | `decide-policy::outcome()`; unit tests for each primitive |
| I-3 | **Recall floors are inputs; automation rate is an output.** Floors are set in the spec. The fitter reports the resulting automation rate and never lowers a floor to raise it. | The `decide-calibrate` API has no "target automation" parameter |
| I-4 | **Finite-sample honesty.** A class with a recall floor of 1−α needs at least ⌈1/α⌉−1 calibration positives, or its guarantee isn't claimed and the class forces `Review`. | `decide-calibrate` validation; artifact carries `n_pos` per class |
| I-5 | **Locality never escalates on its own.** A `DeviceOnly` spec never reaches a remote backend. Moving up a locality needs a host-supplied grant (Cedar or a user prompt). | `decide-policy` locality guard; the `remote` feature is compiled out of `decide-lite` |
| I-6 | **Clinical specs propose; they never write.** Specs tagged `clinical` can return `Act` only for non-clinical side effects such as "show to coordinator". Hosts must route clinical state changes through their own human-confirmed commands. | Spec lint (`xtask spec-lint`); the integration contract in [§14](#14-host-integration-contracts) |
| I-7 | **Every decision is audited.** This includes tripwire-only exits and errors. There are no silent drops. | `Decider::decide` returns `(Decision, AuditRecord)`; the audit sink is required at build time |
| I-8 | **MedGemma never decides.** HAI-DEF-licensed models can be registered only as `role = "extractor"`. | Model registry lint |
| I-9 | **Decision MCP tools are read-only.** Only `calibrate_fit` changes state, and it is admin-gated. | `decide-mcp` annotations; a conformance test |
| I-10 | **`decide-core` does no I/O and builds on `wasm32-unknown-unknown`.** | CI job `core-wasm` |

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
│   └── decide-mcp/
├── bins/
│   └── knowme-decide/             # sidecar + CLI
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
  - **rmcp.** UAR pins `=3.1.2`; prior-auth uses `3.4.0`. Target `=3.4.x` and open the UAR bump PR in M9. `decide-mcp` must not leak rmcp types through its public API, so hosts on a different minor version can still link `decide-policy`.
  - **candle.** UAR uses `0.11`; KnowMe declares `0.7` through its mistral.rs fork patch. Target `0.11`. KnowMe links the `onnx` encoder feature until it bumps.
  - **candle-vllm.** Use the GQAdonis fork, pinned by git rev. The DeltaNet state-fork work lands there first (M7).
- **Features:** keep them additive, and have CI test the matrix below.

  | Profile | Features | Consumers |
  |---|---|---|
  | `decide-lite` | core, schema, tripwire, calibrate, policy, audit, `encoder-onnx` | KnowMe mobile (FFI), UAR `embedded-mobile` |
  | `decide-desktop` | lite + `encoder-candle` + `llm-local` + `guard` + `mcp` | The Boss sidecar, KnowMe desktop, UAR `desktop-full` |
  | `decide-server` | desktop + `llm-remote` (non-PHI only) + `mcp-http` | UAR `server-full`, prior-auth on-prem |

- **Lints:** `#![forbid(unsafe_code)]` in core, schema, tripwire, calibrate, policy and audit. `unsafe` is allowed only in backend crates, behind a `// SAFETY:` comment. Enforce Clippy `pedantic` with a curated allow-list, and `cargo deny check`.
- **Errors:** `thiserror` in libraries and `anyhow` only in `bins/`. Library code never panics: no `unwrap` or `expect` outside tests (Clippy lint).
- **Observability:** `tracing` spans for every cascade layer, using the fields `spec`, `layer`, `latency_us`, `outcome` and `audit_id`. Never log state text. Log redacted hashes instead.
- **Workflow:** openspec change proposals for anything that crosses a host boundary, as in the sibling repos. ADRs for every decision in [§17](#17-adr-backlog).

---

## 5. Core contracts

These sketches are normative for M1. Field names are the wire names.

```rust
// decide-core — no I/O, no async runtime, wasm32-safe
pub struct DecisionSpec {
    pub id: SpecId,                    // "counselme.sufficiency.v3"
    pub version: semver::Version,
    pub primitive: Primitive,          // Choice | Score | Noul
    pub question: String,
    pub options: Vec<OptionDef>,       // Choice ≤ 255; Score ordered; Noul = statements
    pub recall_floors: BTreeMap<OptionId, Probability>,  // I-3
    pub tripwires: Vec<RulePackRef>,   // "counselme-crisis@2026.10"
    pub locality: Locality,            // DeviceOnly | Clinic | Server
    pub tags: BTreeSet<Tag>,           // clinical, phi, safety-critical, regulatory …
    pub backends: BackendPlan,         // ordered cascade: encoder → llm → guard
    pub hierarchy: Option<Hierarchy>,  // two-level routing
}

pub enum Outcome {
    Act(OptionId),                                     // set size 1, calibrated, not clinical-write
    Review { set: Vec<OptionId>, reason: ReviewReason },
    Escalate { reason: EscalationReason },             // tripwire or escalate-class in set
}

pub struct Decision {
    pub spec: SpecId,
    pub value: OptionId,                               // argmax, informational only
    pub probs: BTreeMap<OptionId, Probability>,
    pub prediction_set: Vec<OptionId>,
    pub outcome: Outcome,                              // hosts act on THIS, never on `value`
    pub decided_by: Layer,                             // tripwire | encoder | llm | guard
    pub calibration: Option<CalibrationRef>,
    pub citations: Vec<Citation>,                      // doc, page, date, content hash
    pub audit_id: AuditId,
}

pub trait DecisionBackend {           // encoder, llm, guard implement this
    fn scores(&self, spec: &DecisionSpec, state: &State) -> Result<RawScores, BackendError>;
}
pub trait Calibrator { fn apply(&self, raw: &RawScores) -> Result<Calibrated, CalError>; }
pub trait Tripwire  { fn scan(&self, text: &str) -> Vec<Hit>; }
pub trait AuditSink { fn append(&self, rec: AuditRecord) -> Result<AuditId, AuditError>; }
```

In `decide-policy`, `Decider::decide` is async and runs these steps:

1. Tripwires (I-1).
2. The locality guard (I-5).
3. The backend cascade. A layer exits early if its calibrated top-1 set is a single option at or above τ for that layer.
4. Calibration (I-2, I-4).
5. The outcome mapping below.
6. The audit append (I-7).

**Outcome mapping** (checked in order):

1. Any tripwire hit → `Escalate`.
2. No valid calibration → `Review { set: all options above ε }`.
3. The prediction set contains an escalate-class option (tagged `escalate`) → `Escalate`.
4. The set has size 1 and the spec isn't `clinical`, or the option is tagged `non_clinical_effect` → `Act`.
5. Otherwise → `Review { set }`.

**Wire compatibility:** `decide-schema` round-trips TypeSafe `/v1/systemone` requests and responses (Choice, Score, Noul, and batched questions over one state). This lets Kev eval suites, Jev SDK clients and non-PHI Jev replay run unchanged. The wire format is snapshot-tested with `insta`.

---

## 6. Milestones

Durations assume one senior Rust engineer plus agent teams. Treat them as sequencing, not commitments.

### M0 — Bootstrap and spikes (week 1–2)

**Entry:** this playbook is accepted.

**Tasks:**

- Create the workspace skeleton from [§3](#3-repository-layout), plus `rust-toolchain.toml`, `deny.toml` and CI (fmt, clippy, test, deny, and the `core-wasm` job).
- Copy the Prometheus base agent rules into `AGENTS.md`/`CLAUDE.md`, and seed `openspec/`.
- **Spike A:** run Kev-4B (Python server) and `laya-rust` on the M-series Mac and on a Windows CUDA box. Record p50/p95 latency and memory for 1, 3 and 10 questions per state.
- **Spike B:** replay TypeSafe's public evals and Kev's frozen suites through both. Record accuracy, Brier and ECE.
- **Spike C:** in the candle-vllm fork, confirm whether Qwen3.8's Gated DeltaNet state can be snapshotted and forked per request. Timebox it to 3 days, and write ADR-004 with the result.
- Write ADR-001 (repo and crate boundaries), ADR-002 (pins), ADR-003 (outcome semantics) and ADR-004 (LLM backend strategy).

**Exit gate:** CI is green on an empty workspace, and the spike reports are committed to `evals/reports/`. ADRs 001–004 are accepted.

### M1 — `decide-core` and `decide-schema` (week 2–3)

**Tasks:**

- Implement the types and traits from [§5](#5-core-contracts), plus the outcome mapping as a pure function.
- Write the spec JSON Schema (via `schemars`) and `xtask spec-lint`. The lint enforces I-6 and I-8 tags, the option cardinality limit (≤255), the rule that floors reference real options, and that `clinical` specs have no `Act` option unless it is tagged `non_clinical_effect`.
- Implement the `/v1/systemone` codec, with snapshot fixtures taken from the Kev repo's examples.
- Author all 23 specs in `specs/` (CM-01…12, PA-01…11), plus `uar.route.*`, from the architecture doc catalog.

**Exit gate:**

- Proptest: outcome mapping honors I-1 and I-2 for 10k random inputs.
- Every spec passes lint.
- The core builds for wasm32.

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
- Mondrian split conformal: class-conditional thresholds for each recall floor, with the finite-sample check in I-4. Optional group keys (counselor, clinic, payer) produce per-group thresholds, falling back to the pooled threshold when a group is too small. The fallback is recorded.
- Artifact format: JSON plus an Ed25519 signature, with the fields spec id and version, backend id and weights sha256, method, temperature, per-class thresholds and `n_pos`, groups, the dataset content hash, `fitted_at`, `valid_until` and a coverage report.
- Coverage report: empirical recall per class on a held-out split, average set size, the implied automation rate and ECE before and after fitting.

**Exit gate:**

- On synthetic data with known calibration, empirical coverage is at or above the floor in ≥95% of 1,000 bootstrap trials for each class.
- An artifact with a mismatched backend or weights hash is rejected.

### M4 — `decide-encoder` (week 5–7)

**Tasks:**

- A candle ModernBERT forward pass. Vendor or upstream the f16 attention-mask fix already made in `laya-rust` and `candle-semantic-router`, and run the Metal, CUDA and CPU backends.
- Zero-shot label-conditioned scoring (Laya, GLiClass style) and fine-tuned linear heads loaded from safetensors.
- An ONNX Runtime backend (`ort`) for Julia 1 or mmBERT-small on Android, Windows and in KnowMe while its candle stays on 0.7.
- `training/encoder/`: a uv-managed Python pipeline (SetFit and full fine-tune) that exports safetensors, the head config and label maps. Training never runs on PHI outside the clinic tier.

**Exit gate:**

- Rust and Python logits match to within 1e-3 on 500 fixtures.
- Latency meets [§11](#11-performance-budgets).
- `pa.doctype.v1` and `counselme.route.v1` run end to end on synthetic data.

### M5 — `decide-policy` and `decide-audit` (week 7–8)

**Tasks:**

- The `Decider` cascade with per-layer τ, time and token budgets, a locality guard and backend health fallbacks. A failed backend degrades to `Review`, never to `Act`.
- The audit record: the spec, a redacted state hash, the output of each layer, the calibration ref, the outcome and the `prev_hash`, chained with BLAKE3.
  - Hosts provide storage through `AuditSink`. Adapters: SQLite (KnowMe and desktop), Postgres (prior-auth `audit_events`), SurrealDB (UAR) and JSONL (CLI).
- Override capture: `record_override(audit_id, human_outcome, actor_role)` writes a label event linked to the original record. This is the only source of calibration labels.
- Cedar context export: `Decision → cedar::Context` for UAR's `ToolApprovalGate` and KnowMe's grants.

**Exit gate:**

- The chain verifies after 1M appends.
- Tampering with any record fails verification.
- Property tests pass for I-1, I-2, I-5 and I-7.

### M6 — `decide-mcp` and the `knowme-decide` binary (week 8–10)

**Tasks:**

- An rmcp server using the `#[tool_router]` style from UAR's `mcp_server.rs`. It exposes:
  - **Tools:** `decide_choice`, `decide_score`, `decide_noul`, `decide_batch`, `route_intent`, `tripwire_scan`, `guard_check`, `sufficiency_check`, `decision_explain`, `decision_log_query` and `calibrate_fit` (admin).
  - **Resources:** `decide://specs/{id}`, `decide://calibration/{spec}@{ver}`, `decide://models` and `ui://decide/review-card` (an MCP App).
  - **Annotations:** `readOnlyHint` on everything except `calibrate_fit`.
- Binary modes:
  - `knowme-decide mcp --stdio`.
  - `knowme-decide serve --port 0` prints `READY:{port}` on stdout, binds only to `127.0.0.1`, and exits when stdin closes. This matches `uar-sidecar` and The Boss's `UarSidecarService`.
  - `knowme-decide models {list,pull,verify}`.
  - `knowme-decide calibrate fit|report`.
  - `knowme-decide eval run <suite>`.
- Config: a TOML file with per-profile models, spec directories, audit sink, locality ceiling and an egress allowlist, which is empty by default.
- The review card: a small HTMX/Alpine MCP App that renders the decision, its prediction set and citations, and posts the confirm or override to `record_override`.

**Exit gate:**

- The MCP Inspector conformance run is clean, over both stdio and streamable HTTP.
- The Boss can spawn the binary and list its tools in a local dev build.
- The binary's cold start is under 1.5 s without models loaded.

### M7 — `decide-llm` and `decide-guard` (week 10–14)

**Tasks:**

- **Remote logprobs adapter first,** for non-PHI evals only. It targets OpenAI-compatible endpoints through liter-llm with `logprobs`, `top_logprobs` and a restricted vocabulary. It is compiled only with `llm-remote`.
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

### M8 — The Boss integration and marketplace (week 12–15, overlaps M7)

**Tasks (PRs into `the-boss`):**

- Add `knowme-decide` to `build/integration-sources.json` (repo, rev, cargo package, features `decide-desktop`, Rust 1.97.1) and to `build/integration-artifacts.json` (an https URL and sha256 per platform). Add it to `scripts/release-profile.cjs`.
- Add it to `BUNDLED_TOOLS` in `BinaryManager.ts`, resolved through `getBinaryPath('knowme-decide')`.
- Implement the `@prometheus/decide` preset in the `prometheus-005-mcp-server-presets` change (`installSource: 'builtin'`, stdio by default).
- Build `DecideSidecarService` by copying `UarSidecarService.ts` (READY handshake, `ensureReady()`, process-tree kill) for shared-HTTP mode when UAR is enabled.
- Add an operator panel that shows requested vs. effective state: loaded specs, calibration versions, backends, automation rate at the current floors, and weight download status.
- Add a marketplace installer that reads `.claude-plugin/marketplace.json`, with `knowme-decisions` as a default source.

**Tasks (this repo):**

- Publish `marketplace/` with the four plugins and 14 skills. Validate them with `skills-ref validate` and `claude plugin validate`.

**Exit gate:**

- A clean install of The Boss on darwin-arm64 and win32-x64 auto-registers `@prometheus/decide`.
- The `escalation-gate` skill runs end to end against the bundled sidecar with synthetic data.

### M9 — UAR and KnowMe integration (week 14–18)

**UAR:**

- Add `ClassifierBackend::Decision` behind `IntentClassifier`. Its prediction set replaces `should_accept` and the `out_of_scope` heuristic.
- Replace the LLM prompt in `RouterNode` with `route_intent`.
- Add the task-type Choice to `ModelRouter`.
- Register the decide tools as `NativeSkill`s and add them to `UarRuntimeMcpServer`.
- Add a `decision_models:` config section.
- Write a new openspec change that replaces the keyword approval heuristic with decision-backed Cedar context, which supersedes the ML exclusion in `mount-governance-guardrails`.
- Bump rmcp to 3.4.

**KnowMe:**

- Add `gen_ui_decide` (L2) behind a `DecisionProvider` trait in `gen_ui_types`.
- Expose it over FFI with the `decide-lite` profile on mobile and in-process through `tauri-plugin-gen-ui` on desktop.
- Emit decisions through the existing `agui.guardrail` and `uar.guardrail.flagged` events.
- Make `decide-mcp` the first outbound MCP server (skill-support §3).
- Plan the candle 0.11 bump.

**Exit gate:**

- UAR routing on its existing skill suites is at least as accurate as the TF-IDF default, with calibrated abstention.
- KnowMe mobile runs CM-01 tripwires and CM-02 routing fully on device in airplane mode.

### M10 — Clinical rollouts (week 16+)

These are gated by [§15](#15-clinical-and-regulatory-gates).

**Prior-auth (shadow, then proposals):**

- Add the `aso-decide` kernel crate beside `clinical-docs` (no I/O), behind a port in `aso-host`.
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

`models/registry.toml` is the single manifest. The binary refuses to load anything that isn't in it.

```toml
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
```

- **Distribution:** mirror approved weights to Pinata/IPFS (`ipfs.prometheusags.ai`), the same as The Boss's releases, and pin them by CID plus sha256. Hugging Face is only a fallback.
- **License gates:**
  - Arch-Router (Katanemo license) and MedGemma (HAI-DEF) need recorded acceptance before `models pull`.
  - Apache-2.0 models don't: Kev, Laya, Julia 1, CLM-8B, Qwen3Guard, Granite Guardian and gpt-oss-safeguard.
- **Starting set:**
  - **Phone:** Julia 1 or an mmBERT-small head, and optionally Qwen3Guard-0.6B.
  - **Desktop:** Laya-rust, Kev-4B/9B or LitJev adapters, Qwen3Guard-Stream-4B, and Granite Guardian 8B at Q4.
  - **Clinic:** LitJev on Qwen3.8-27B, Granite Guardian 8B, and MedGemma 27B as an extractor.
  - **Async audit:** gpt-oss-safeguard-20b.

---

## 8. Data, labels and calibration

- **Labels come from overrides.** Every `Review` resolved in a host calls `record_override`. That override plus the original audit record is the labeled example. There is no separate labeling tool in v1.
- **PHI stays at the tier it came from.** Counseling labels live on the counselor's device or practice store. Prior-auth labels live in the clinic's Postgres. Fitting happens where the data lives, using `knowme-decide calibrate fit`, and only the signed artifact (thresholds, not data) moves.
- **Splits:** train, then calibration, then test, split by time with no leakage across patients or cases. The calibration split is never used for training heads.
- **Rare classes:** crisis classes are oversampled with synthetic examples that a clinician has reviewed. Synthetic examples may train heads but **never** count toward the calibration `n_pos` in I-4.
- **Minimums (I-4):** a 0.99 floor needs ≥99 real positives, and a 0.95 floor needs ≥19. Until a class meets its minimum, it forces `Review`. The operator panel shows progress toward each minimum.
- **Recalibration triggers:** a new backend or weights hash, a spec version bump, `valid_until` expiring (default 90 days), or a drift alarm ([§16](#16-operations-runbooks)).

---

## 9. Evaluation and promotion gates

| Suite | Contents | Used for |
|---|---|---|
| `kev-frozen` | Kev's locked OOD suites | LitJev parity (M7) |
| `typesafe-public` | TypeSafe's published eval tasks | Cross-model comparison |
| `jev-replay` | Recorded non-PHI Jev traffic | A/B test against the hosted baseline |
| `golden/<spec>` | 200–2,000 labeled examples per spec, synthetic until real labels exist | Promotion gate for each spec |
| `crisis-regression` | The clinician-owned tripwire and classifier corpus | A hard gate on every release |

**Metrics per spec:** accuracy, macro-F1, recall per class at the floor, Brier, ECE (15 bins), average prediction-set size, automation rate, and p50/p95 latency by tier.

**Promotion rules:**

- A spec moves from `shadow` to `review-only` to `act-enabled` only when its golden-suite metrics meet the thresholds in its spec file, and (for clinical specs) the [§15](#15-clinical-and-regulatory-gates) checklist is signed.
- Any regression in `crisis-regression` blocks the release. There is no override flag.

---

## 10. Testing strategy

- **Unit and property** (`proptest`): outcome mapping, locality guard, conformal coverage on synthetic data, and audit chain integrity.
- **Snapshot** (`insta`): the `/v1/systemone` wire format, MCP tool schemas and spec JSON Schema.
- **Fuzz** (`cargo-fuzz`): the rule-pack parser, tripwire scanner, spec parser and systemone decoder.
- **Parity:** Rust vs. Python logits for encoder heads, and LitJev vs. Kev on shared fixtures.
- **Conformance:** MCP Inspector over stdio and HTTP, and `claude plugin validate` for the marketplace.
- **Cross-host integration:** a `tests/hosts/` harness that runs the sidecar the way The Boss spawns it (READY handshake, stdin-close exit), and links `decide-policy` as UAR does (`embedded-mobile` features).
- **Build matrix:** `wasm32-unknown-unknown` for core, `aarch64-linux-android` for lite, plus darwin-arm64, darwin-x64, win32-x64 and win32-arm64 for the binary.
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

These are targets to validate in M0 and M4–M7. Adjust them by ADR, never silently.

---

## 12. Security and privacy

**Threat model:**

- A malicious or buggy host passes crafted state.
- A tampered rule pack or calibration artifact.
- A poisoned model file.
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

---

## 13. Release engineering

- **Versioning:** one workspace version (semver). Specs, rule packs and calibration artifacts have their own versions and are released independently of the binary.
- **Artifacts per release:** `knowme-decide-<ver>-<platform>.{tar.zst,zip}` with sha256, pinned to IPFS through Pinata, with the URL and hash recorded for The Boss's `integration-artifacts.json`. Keep a GitHub release as a mirror.
- **Signing:** notarize macOS builds (Developer ID) and Authenticode-sign Windows builds.
- **Release checklist** (`xtask release`):
  1. CI is green across the full matrix.
  2. `crisis-regression` passes.
  3. The MCP conformance run is clean.
  4. The `models/registry.toml` hashes verify.
  5. The changelog is updated.
  6. Artifacts are pinned, and the CIDs and sha256 are written to `dist/release.json`.
  7. The Boss pin-bump PR is opened.

---

## 14. Host integration contracts

Every host PR must satisfy these contracts.

1. **Act on `outcome`, never on `value`.**
2. **Route every `Review` to a human surface**, either the review card or the host's own UI, and call `record_override` when it is resolved.
3. **Clinical state changes go through the host's own confirmed commands.** In prior-auth, these are the `evidence_assembly`, `reassessment` and `determination` commands. In CounselMe, sending a held draft requires counselor approval.
4. **Provide an `AuditSink`** with the retention the host's compliance posture requires.
5. **Never expose affirm, sign, submit or treat tools** in the same MCP session as the decide tools without a separate approval gate.
6. **Display locality to operators.** Users must be able to see where each decision ran.

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

**Prior-auth:**

- [ ] Proposal-only operation has been verified. No code path writes clinical state without a human command (I-6).
- [ ] The MedGemma license posture is confirmed: extractor-only, with human review of its output (I-8).
- [ ] Transparency: each proposal shows its criterion, citations and calibration version. This is the FDA CDS "basis for recommendation".
- [ ] Texas SB 1188 and TRAIGA AI-disclosure reporting is fed from `audit_id`.
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
- **Coverage drift alarm** (rolling empirical recall on overrides drops below the floor):
  1. The spec automatically downgrades to `review-only`.
  2. Refit with fresh labels.
  3. Re-promote the spec through [§9](#9-evaluation-and-promotion-gates).
- **Model rollback:** point the registry at the previous CID. Calibration artifacts are bound to the weights hash, so the matching artifact reactivates, or the spec falls back to `Review` (I-2).
- **Audit export for counsel or payers:** use `decision_log_query` plus the chain verification report. Redaction follows the host's policy.
- **Backend outage:** the cascade degrades to `Review`, and the operator panel shows it. Never fail open.

---

## 17. ADR backlog

| ADR | Decision |
|---|---|
| 000 | Record architecture decisions (template) |
| 001 | Separate repo and crate boundaries |
| 002 | Dependency pins: rmcp 3.4, candle 0.11, candle-vllm fork rev |
| 003 | Outcome semantics and invariants I-1…I-10 |
| 004 | LLM backend: LitJev on the candle-vllm fork vs. Kev subprocess (from Spike C) |
| 005 | Calibration method: temperature plus Mondrian split conformal; group keys |
| 006 | Rule-pack format and signing keys |
| 007 | Audit chain format and storage adapters |
| 008 | Sidecar transport and auth (stdio default; HTTP loopback with a bearer token) |
| 009 | Weight distribution through IPFS/Pinata, and license gates |
| 010 | Marketplace layout and skill naming |
| 011 | Clinical promotion process (shadow → review-only → act-enabled) |

---

## 18. Open questions

1. Does the candle-vllm fork's paged attention let us fork DeltaNet state cheaply, or does LitJev need its own scheduler? Spike C answers this.
2. Should the review card be one MCP App shared by all hosts, or a host-native component per host fed by the same resource?
3. Where does counseling calibration run: on the counselor's device, or in a practice-level store? This affects the Mondrian group keys.
4. Can Jev A/B testing on non-PHI traffic run from The Boss, or only from a server?
5. Is a pinned daily audit anchor on IPFS acceptable to counsel, given that the head hash reveals only activity volume?
6. Who holds the Ed25519 signing keys for rule packs and calibration (KnowMe, LLC vs. the clinic), and how are they rotated?

---

## 19. Definition of done

The decision layer is "production" when all of these are true:

- [ ] Every crate in [§3](#3-repository-layout) is released, the invariants I-1…I-10 are enforced by tests, and CI covers the full matrix.
- [ ] `knowme-decide` ships in The Boss on all four desktop platforms as `@prometheus/decide`, with the operator panel.
- [ ] UAR and KnowMe link the crates natively. KnowMe mobile runs tripwires and routing fully offline.
- [ ] The `knowme-decisions` marketplace is published and installable in The Boss and Claude Code.
- [ ] Prior-auth runs PA-03, PA-06 and PA-07 as calibrated proposals, and the [§15](#15-clinical-and-regulatory-gates) boxes are signed.
- [ ] The CounselMe pilot runs CM-01 through CM-04 with the [§15](#15-clinical-and-regulatory-gates) boxes signed and a measured automation rate the counselor has accepted.
- [ ] Runbooks from [§16](#16-operations-runbooks) have been exercised at least once in a drill.
