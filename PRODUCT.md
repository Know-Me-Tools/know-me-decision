# PRODUCT — know-me-decision

Owner: `product-manager` role. Sources: `docs/PLAYBOOK.md`, `docs/architecture/knowme-decision-layer.html`, `docs/research/*`. If this file and the playbook disagree, the playbook wins.

## What it is

A self-hosted decision layer for KnowMe's products. It replaces hosted "System One" APIs (TypeSafe's Jev) with open-weight models that run on the device or on clinic hardware. It answers typed questions (**Choice**, **Score**, **Noul**) and returns an outcome the host acts on: `Act`, `Review` (a person confirms from a small prediction set) or `Escalate`.

## Who uses it

| User | Where they meet it | What they need |
|---|---|---|
| **Counselor** (CounselMe) | The review card in the twin's host, and the held-draft queue | To see why a draft was held, confirm or override in seconds, and trust that crisis cases always reach them |
| **Care coordinator / surgeon** (prior-auth) | The review card and the prep sheet, which proposes met/gap/void with citations | Citations, the calibration version and the "basis for recommendation". Nothing is ever submitted for them |
| **Operator** (The Boss) | The operator panel | Loaded specs, calibration versions, backends, the automation rate at the current floors, progress toward the label minimums, and where each decision ran |
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
5. Data never leaves the locality its spec declares. Show that locality to operators.
6. Every decision is audited. Human overrides are the only source of labels.

## Human surfaces this repo owns

- **`ui://decide/review-card`**: an MCP App resource served by `decide-mcp`. It shows the decision, its prediction set, probabilities, citations, the calibration version and locality, plus confirm and override controls that call `record_override`. It must render in every MCP Apps host: The Boss, Claude, UAR and KnowMe.
- **Operator panel:** designed here and implemented in The Boss (M8).

## Status

Pre-implementation. Delivery follows the playbook milestones M0–M10. Clinical rollout is gated by the sign-offs in PLAYBOOK §15.
