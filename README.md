# know-me-decision

**A planned bundled local decision model for desktop and mobile, with optional TypeSafe Jev, a Rust API and an MCP server.**

`know-me-decision` is the decision layer shared by KnowMe's products. It plans a common API for open-weight models on the user's device or clinic hardware and eligible hosted providers such as TypeSafe's Jev. Native answers carry outcomes that the host enforces. Recall floors are acceptance inputs; statistical coverage claims require representative calibration evidence and their stated assumptions.

> **Status:** pre-implementation. This repo currently holds the design, research and build playbook. Code starts at milestone M0 in [`docs/PLAYBOOK.md`](docs/PLAYBOOK.md). Julia 1 is the selected bundled-default candidate; native platform acceptance remains pending.

## Out of the box

The planned default is **Julia 1 through Rust and embedded native ONNX Runtime** (proposed backend ID `julia-onnx`) on Windows, macOS, Linux, Android and iOS. Installations include compatible weights, tokenizer, runtime, trusted asset manifest and default settings. First launch must work fully offline: no Python, model server, key, model download or manual backend configuration. ONNX Runtime is a C/C++ dependency behind the Rust-facing adapter; this is not a pure-Rust inference stack.

Adding a **TypeSafe Jev key** makes Jev available for explicit selection; local inference remains the default. Hosted calls still require trusted grants for approved non-sensitive data. Unknown, PHI and DeviceOnly input stays local, and a missing or invalid key never prevents local startup. Optional Laya/Qwen backends remain later additions; CLM implementation is deferred.

Julia's native scoring supports 2–20 candidates. Requests outside validated candidate or formatted-input limits receive explicit Review/refusal; the framework's wider Choice contract does not authorize silent truncation, hierarchical scoring or fabricated probabilities. A separately selected authorized remote provider can serve eligible requests. Model availability does not imply calibration: new specifications without a valid matching artifact remain Review or Escalate.

The uncomfortable deployment cost is the published FP32 checkpoint's approximately **550.5 MiB**, before tokenizer, native runtime and activations. Quantization is separately gated. Native desktop/mobile parity, fresh-install offline operation, package/memory budgets and cold/warm latency must pass before claiming the default is shipping. The author's Python-driven Android measurements do not certify native Android or iOS. [Julia model card](https://huggingface.co/SupersonicLabs/Julia-1), [deployment measurements](https://supersoniclabs.ia.br/julia-1/).

## What it will do

It answers typed questions about a piece of state:

- **Choice:** pick one of up to 255 options.
- **Score:** an ordinal rubric with a potentially fractional expected score.
- **Noul:** an independent probability for each statement.

Each native answer carries a separate outcome; batches retain one outcome per question:

| Outcome | Meaning |
|---|---|
| `Act` | An eligible non-clinical action after calibration, required guards, and a committed host audit receipt |
| `Review` | A human confirms from a small prediction set |
| `Escalate` | A tripwire or escalation class fired. Always logged, and no model can override it |

The planned native decision path is:

1. Deterministic, signed **tripwire** rule packs.
2. Trusted host data grants and locality checks.
3. An eligible **encoder or LLM decision head**, followed by every required guard even after an early confident score.
4. **Conformal calibration** bound to the deployed scoring pipeline and outcome mapping.
5. Host audit persistence before any `Act` is released.

Audit failures withhold ordinary action. Urgent escalation remains deliverable with explicit uncommitted status and host incident handling. Calibration labels include representative human adjudication of sampled **Act, Review, and Escalate** outcomes, not only overrides. Synthetic fixtures do not count toward real calibration-positive minimums.

## The decision proxy

The planned `knowme-decide serve` Axum server has three entry points:

- **Jev compatibility** (`POST /v1/systemone`) for advisory, non-clinical work. Requests requiring safety outcomes that a plain Jev client cannot enforce are refused; optional metadata does not establish client enforcement.
- **Native API** (`POST /v1/decide`) carrying primitive-specific answers, per-question outcomes, calibration identity, and audit status.
- **MCP**, with proposed stdio and Streamable HTTP support, revision-specific acceptance for 2026-07-28 and 2025-11-25, and an optional legacy HTTP+SSE shim. rmcp 3.5.0 is a candidate pending the M0 pin decision, not an installed dependency or completed conformance claim.

Jev SSE progress is a separate proposed extension. Progress and partial answers never authorize action before guards, outcome mapping, and required audit persistence finish.

| Backend candidate | Runs | Admission requirement |
|---|---|---|
| **Julia 1 — bundled default candidate** | Embedded Rust-facing ONNX Runtime; desktop and mobile | Installed verified assets, validated capabilities, native platform acceptance and matching calibration for Act |
| **Jev** (TypeSafe) | Optional hosted provider | User-supplied TypeSafe key, explicit selection, trusted grant for approved non-sensitive data and permitted service use |
| **Remote Qwen** | Hosted | Permitted general API service or documented application-backend authorization, plus verified scoring semantics |
| **Laya MLX** | Apple Silicon | Verified runtime, weights, capabilities, and calibration |
| **Laya candle / ONNX** | Supported device targets | Measured capabilities and compatible calibration per deployment |
| **Local Qwen** (3.8-27B and smaller) | candle-vllm instances | Local/clinic grant, DeltaNet spike evidence, and scoring conformance |
| **Any Jev-compatible server** | Declared deployment | Verified wire behavior, scoring semantics, deployment identity, and destination grant |

A model may rank only the backends that trusted host policy already permits. Sensitivity classifiers can remove destinations; an unknown provenance or `internal` label cannot authorize hosted egress. Explicit provider selection, fallback, shadow comparisons, telemetry, and synchronization use the same boundary.

A successful token-plan probe proves connectivity, not application-backend entitlement. Missing option scores in a top-five response remain incomplete; invented floor probabilities or subset renormalization cannot establish a complete decision distribution. See the [provider analysis](docs/research/decision-proxy-options-2026-09.md).

The proposed **browser tier** uses local inference and persistence. DeviceOnly also prohibits synchronization of decision-derived data. A separately authorized profile must disclose granted synchronization fields and destinations; local inference alone is not a claim that all data stays on the device.

The uncomfortable constraint: some Jev clients and provider subscriptions cannot satisfy these contracts. They remain ineligible for those workloads even if requests authenticate successfully.

## Where it runs

| Host | How it connects |
|---|---|
| **The Boss** | Bundled `knowme-decide` sidecar, registered as the built-in MCP server `@prometheus/decide` |
| **Universal Agent Runtime** | Linked crate: intent classification, graph routing, model routing and governance context |
| **KnowMe** (desktop + mobile) | Linked on device through the `gen_ui_decide` L2 crate; tripwires and routing work offline |
| **Prior Authorization Workbench** | A pure `aso-decide` kernel that *proposes* met/gap/void and denial paths, and never writes |
| **Any MCP client** (Claude Code, Codex) | The `knowme-decisions` plugin marketplace: 4 plugins and 14 AgentSkills-compatible skills |

## Products it serves first

- **CounselMe:** a counselor's digital twin that works between sessions. It uses crisis detection, intent routing, an answer-sufficiency gate that escalates to the human counselor, session commitments, and wellness context (CM-01…CM-12).
- **Prior Authorization Workbench:** criteria decomposition, criterion evidence (met/gap/void) with citations, payer-response parsing and denial triage (PA-01…PA-11).

## Non-negotiables

- Tripwires run first and can't be overridden.
- No calibration artifact means no automated action.
- Recall floors are set first; the automation rate is measured, never targeted.
- Clinical decisions are proposals. People confirm them through the host's own commands.
- Data never leaves the locality its spec declares.

The full invariant list is in [`docs/PLAYBOOK.md` §2](docs/PLAYBOOK.md#2-invariants).

## Planned layout

```text
crates/   decide-core · decide-schema · decide-tripwire · decide-encoder · decide-llm
          decide-guard · decide-calibrate · decide-policy · decide-audit · decide-mcp
          decide-backends · decide-proxy · decide-server · decide-wasm
bins/     knowme-decide          (proxy server · MCP stdio · READY:{port} sidecar · CLI)
workers/  laya-mlx               (Apple Silicon worker)
specs/    counselme/ · prior-auth/ · uar/      (versioned DecisionSpec JSON)
rulepacks/ models/ evals/ training/ marketplace/ xtask/ openspec/ docs/
```

## Documentation

Start with [`docs/README.md`](docs/README.md). The key documents are:

- [`docs/PLAYBOOK.md`](docs/PLAYBOOK.md): how to build it, milestone by milestone.
- [`docs/architecture/knowme-decision-layer.html`](docs/architecture/knowme-decision-layer.html): the architecture and use-case report. A [historical published snapshot is on IPFS](https://ipfs.prometheusags.ai/ipfs/bafkreidnqfgjwhv2kwnzfcv23u7e6ehyamduswtgwiqmvwydapqa5bxiom); it predates the bundled-default update, which has not been republished.
- [`docs/research/open-decision-models-2026-09.md`](docs/research/open-decision-models-2026-09.md): the survey of open, self-hostable decision models.
- [`docs/research/decision-proxy-options-2026-09.md`](docs/research/decision-proxy-options-2026-09.md): the proxy's backends (Jev, Laya MLX, Qwen local and remote), routing, the browser tier, and MCP 2026-07-28.

## Configuration and acceptance

Configuration remains proposed. The bundled local default requires no user settings. Server/developer Jev deployments use the existing `JEV_API_KEY` reference in gitignored `.env`; desktop/mobile hosts protect user keys in their secret store. Never embed a shared provider key in distributed apps. Provider credentials do not grant data egress or service-use permission. Advanced backend, router, and server policy belongs in `decide.toml`. Subscription probe settings are research context, not production defaults. Dependency candidates must be accepted and recorded by hand in `versions.toml` before implementation.

The [cross-host contract correction proposal](openspec/changes/decision-proxy-contract-corrections/proposal.md) contains testable scenarios and pending implementation gates. The [bundled local default proposal](openspec/changes/builtin-local-default/proposal.md) adds M0 native feasibility, M1 packaging/capability contracts, actual Julia-plus-approved-Jev integration at M1a, and M4 desktop/mobile release gates. Local acceptance is independently testable; absent authorized TypeSafe access leaves the Jev gate pending. Production completion in M2–M6 precedes gated provider, routing, browser and clinical expansion. `decide-lite` stays free of remote inference dependencies; an optional mobile Jev adapter belongs to the host outside the local kernel. No clinical sign-off is supplied by this documentation update.

---

KnowMe, LLC · know-me.tools · *AI that understands you.*
