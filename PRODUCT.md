# PRODUCT — know-me-decision

Owner: `product-manager` role. Sources: `docs/PLAYBOOK.md`, `docs/architecture/knowme-decision-layer.html`, `docs/research/*`. If this file and the playbook disagree, the playbook wins.

## What it is

A planned decision layer and proxy for KnowMe's products. It combines open-weight models on the device or clinic hardware with eligible hosted providers behind a common API. Native answers preserve **Choice** distributions, fractional expected **Score** values, and independent **Noul** probabilities, separately from the per-question outcome the host acts on: `Act`, `Review`, or `Escalate`. Plain Jev compatibility is advisory and non-clinical; requests requiring safety outcomes that the client cannot enforce must be refused.

## Planned default experience

The out-of-box local backend is **Julia 1 via Rust and embedded native ONNX Runtime** (proposed backend ID `julia-onnx`), selected for Windows, macOS, Linux, Android and iOS pending actual platform acceptance. The application installation includes compatible model weights, tokenizer, native runtime, trusted asset manifest and default settings. First launch works fully offline, with no Python, model server, credentials, model download or manual configuration. Rust owns the integration; ONNX Runtime is a native C/C++ dependency.

A TypeSafe key adds optional hosted Jev without changing the local default. Jev needs explicit selection and a trusted grant for approved non-sensitive data; unknown, PHI and DeviceOnly inputs stay local. Missing, invalid or revoked keys do not prevent local startup. Server/developer deployments use `JEV_API_KEY` in a gitignored environment file; desktop/mobile use host-protected secret storage and never ship a shared key. Optional mobile hosted support remains a host adapter outside `decide-lite`, whose remote inference dependency stays compiled out.

The local Julia capability is 2–20 candidates with a validated formatted-input token limit. Its architectural 8,192-token ceiling does not establish long-input decision quality. Unsupported requests receive explicit Review/refusal without silent truncation, invented scores or hierarchy; a separately selected authorized remote route remains possible. Fractional expected Score and independent Noul answers retain the common contract. Zero setup does not mean arbitrary specifications can Act: required guards, matching signed calibration and committed host audit still apply.

**Acceptance:** on every supported native target, a fresh offline install without cached models must complete the real host decision path; primitive parity, package size, peak memory, cold/warm latency and lifecycle behavior must meet predeclared host budgets. Published FP32 weights are approximately 550.5 MiB before tokenizer/runtime/activations. The author's Python-driven Android test is not native Android/iOS certification. Quantized variants require separate identity, parity, quality and calibration evidence. [Model card](https://huggingface.co/SupersonicLabs/Julia-1), [author's measurements](https://supersoniclabs.ia.br/julia-1/).

Laya/Qwen remain optional later backends. CLM implementation is deferred. The native bundled default does not certify the separate browser tier.

## Who uses it

| User | Where they meet it | What they need |
|---|---|---|
| **Counselor** (CounselMe) | The review card in the twin's host, and the held-draft queue | To see why a draft was held, confirm or override through an authenticated host command, and see the escalation delivery and audit status |
| **Care coordinator / surgeon** (prior-auth) | The review card and the prep sheet, which proposes met/gap/void with citations | Citations, the calibration version and the "basis for recommendation". Nothing is ever submitted for them |
| **Operator** (The Boss) | The operator panel | Requested versus effective destinations, backend identity and eligibility, calibration scope, sampled labels across all outcomes, audit failures, and automation rate at the current recall floors |
| **Agent developer** | The `knowme-decisions` marketplace (4 plugins, 14 skills) and the MCP tools | To author specs, calibrate, evaluate and wire decisions into agents without breaking invariants |
| **Host engineers** (The Boss, UAR, KnowMe, prior-auth) | The crates, the sidecar and the host contracts (PLAYBOOK §14) | Stable types and pins, a sidecar that follows the READY handshake, and a clear mapping from outcome to action |

## Use-case catalogs

- **CounselMe CM-01…CM-12:** crisis tripwire and classifier, intent routing, the answer-sufficiency gate (hold for the clinician), jurisdiction rules, commitments, and wellness context.
- **Prior-auth PA-01…PA-11:** criteria decomposition, criterion evidence (met/gap/void) with citations, payer-response parsing and denial triage.
- **UAR:** intent and graph routing, model routing, and governance (Cedar) context.

## Product principles (non-negotiable; PLAYBOOK §2)

1. Tripwires run first and can't be overridden.
2. No calibration artifact means no automated action.
3. Recall floors are set first. The automation rate is measured and reported, never targeted.
4. Clinical decisions are proposals. People confirm them through the host's own commands.
5. Trusted host grants bound data movement. Models only narrow eligible destinations. Unknown provenance, `internal` classification, or a supplied data-class header cannot authorize hosted egress. Apply this to direct calls, fallback, shadow comparisons, telemetry, and synchronization.
6. Every decision requires an audit record. Release `Act` only after host persistence commits. Audit failure withholds ordinary action; urgent escalation remains deliverable with an explicit uncommitted status and host incident handling.
7. Human labels must represent **Act, Review, and Escalate**, including independently sampled automated decisions. Overrides alone cannot establish deployed recall. Synthetic fixtures do not count toward real positive minimums; pooled evidence is not a subgroup guarantee.
8. Provider admission requires permitted service use and verified scoring semantics. A token-plan probe is connectivity evidence, not production entitlement. Missing top-five option scores cannot be replaced with invented probability mass.
9. A confident scoring exit never bypasses required guards. Calibration binds to the actual scoring pipeline and relevant routing policy, not merely the model name.

Recall and coverage claims remain conditional on the applicable sampling assumptions and evaluated population. Finite-sample minimums do not establish zero individual errors or prove deployment recall.

## Human surfaces this repo owns

- **`ui://decide/review-card`**: a planned MCP App resource served by `decide-mcp`. Show primitive-specific answers, outcome, prediction set where applicable, score completeness, citations, calibration identity, locality, and audit status. Confirm/override controls invoke an authenticated, authorized host command outside model-visible decision MCP tools. Caller-supplied role text is not authentication. A host without that bridge displays a read-only card or directs the user to its review queue. Compatibility with each target host remains an acceptance gate.
- **Operator panel:** design belongs here; implementation is planned for The Boss (M8). Show actual backend deployment, effective grants, calibration population and sample provenance, missing evidence, pending persistence incidents, and separately authorized synchronization destinations. A classifier result must never appear as permission to enable hosted routing. Show “local default” separately from optional Jev availability, credential errors and explicit remote selection; never display pending native-platform certification as installed support.

## User workflows and acceptance

| Persona | Required workflow | Acceptance evidence |
|---|---|---|
| Counselor | Open a held draft, inspect hold/escalation reasons, resolve it through the host, and inspect label/audit persistence status | A held draft is not sent by an MCP decision call; forged role text cannot confirm it; urgent escalation remains visible during audit failure |
| Coordinator / surgeon | Inspect criterion evidence and citations, see the recommendation basis, and confirm through the workbench's own command | Review controls never autonomously submit, deny, sign, or write clinical state; outcome and receipt are visible per question |
| Operator | Compare requested versus effective routing, inspect provider eligibility and calibration scope, and investigate a failed audit or rejected dispatch | A forced hosted choice and fallback cannot exceed the host grant; incomplete scores and unsupported protocols remain clearly unavailable |
| Agent developer | Select an approved deployment, consume native outcomes, and test advisory Jev compatibility separately | Fractional Score and independent Noul survive batching; a client that cannot enforce required outcomes receives a refusal |

The browser default is DeviceOnly inference and persistence with no synchronization of decision-derived data. A separate host grant is required for any synchronization profile, including its fields, purpose, and destinations. Local inference and data retention are separate operator-visible properties.

The uncomfortable constraint is that the common API cannot make every client or provider suitable for every task. Human adjudication cost and higher review rates are acceptable consequences of preserving recall floors and data permissions.

## Status

Pre-implementation; the authoritative waypoint is **Spec**. Follow M0 Julia/native-runtime feasibility and service/scoring checks, M1 bundled-asset/capability and host contract acceptance, the M1a real Julia-plus-approved-Jev integration slice immediately after M1, and M4 native desktop/mobile acceptance, then production completion in M2–M6 before provider, learned-router and browser expansion. Local acceptance is independently testable; missing authorized TypeSafe access leaves hosted acceptance pending rather than blocking local evidence or pretending a mock is a live test. Protocol revisions and library versions in the playbook are candidates pending evidence and manual pin acceptance, not claims of installed or implemented support.

The [builtin-local-default proposal](openspec/changes/builtin-local-default/proposal.md) records the selected packaging and default-routing contract with all implementation tasks pending. The [decision-proxy-contract-corrections proposal](openspec/changes/decision-proxy-contract-corrections/proposal.md) records the cross-host requirements and pending implementation tasks. Clinical promotion remains blocked by the open PLAYBOOK §15 gates. Actual clinician, counsel, and host-product owner names and signatures must be supplied by those humans; this update records none as signed. The local HTML has changed since its historical IPFS publication and has not been republished.
