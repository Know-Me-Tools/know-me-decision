# know-me-decision docs

| Document | What it is | Date |
|---|---|---|
| [`PLAYBOOK.md`](PLAYBOOK.md) | **The production build playbook.** Invariants I-1…I-13, repo layout, core contracts, the **decision proxy** (§5a), milestones M0–M10 (plus M7b routing and M9b browser) with exit gates, models and weights, labels and calibration, evaluation, testing, performance budgets, security, release, host contracts, clinical gates, runbooks, and the ADR backlog | 2026-09-28 |
| [`architecture/knowme-decision-layer.html`](architecture/knowme-decision-layer.html) | **Architecture and use-case report** (KnowMe-branded HTMX with animated SVG diagrams). Crate and sidecar design, the decision cascade, the **decision proxy** (Jev API, MCP 2026-07-28, sensitivity routing), the MCP tool surface, integration with each host, the CounselMe and prior-auth catalogs, and the skills marketplace. [Published snapshot on IPFS; built-in-default update not yet published](https://ipfs.prometheusags.ai/ipfs/bafkreidnqfgjwhv2kwnzfcv23u7e6ehyamduswtgwiqmvwydapqa5bxiom) | 2026-09-28 |
| [`architecture/knowme-decision-layer-og.png`](architecture/knowme-decision-layer-og.png) | The report's OpenGraph preview image (1200×630), [pinned on IPFS](https://ipfs.prometheusags.ai/ipfs/bafkreibr6oxh2xo57mifllbcieugdwgldiez2hhk6en56mb5zgwfkcfotu) | 2026-09-28 |
| [`research/open-decision-models-2026-09.md`](research/open-decision-models-2026-09.md) | **Deep research:** self-hosted decision models to replace Jev, mapped to seven use cases, with a reference architecture | 2026-09-27 |
| [`research/decision-proxy-options-2026-09.md`](research/decision-proxy-options-2026-09.md) | **Proxy analysis and corrections:** historical Jev/Qwen connectivity probes, provider usage restrictions, complete candidate scoring, trusted routing permissions, browser data-transfer boundaries and pending MCP acceptance gates | 2026-09-28 |
| [`research/jev-escalation-viability.md`](research/jev-escalation-viability.md) | Short assessment of using Jev for routing and human-escalation decisions in a counseling digital twin; the question that started this repo | 2026-09-27 |
| [`sessions/treston-2026-09-27-transcript.md`](sessions/treston-2026-09-27-transcript.md) | Transcript of the 27 Sep 2026 mentorship session (Travis James and Treston) where the decision-model idea was described (46:55–49:11) | 2026-09-27 |
| [`sessions/treston-2026-09-27-transcript.html`](sessions/treston-2026-09-27-transcript.html) | The same transcript as a searchable page with a topic index | 2026-09-27 |

## Selected built-in option

The planned default is **Julia 1 with Rust APIs and embedded native ONNX Runtime**, bundled for offline first launch on Windows, macOS, Linux, Android and iOS. No model server, key or configuration file is required. Optional Jev uses a TypeSafe key plus explicit host authorization; key presence does not change the local default. CLM integration and its Rust port are deferred. See the [baseline research contract](research/decision-proxy-options-2026-09.md#built-in-baseline-julia-1-through-rust-and-onnx-runtime), [OpenSpec proposal](../openspec/changes/builtin-local-default/proposal.md) and PLAYBOOK for packaging and release gates. These are plans, not shipped platform support.

## Reading order

1. `research/jev-escalation-viability.md`: why hosted Jev is excluded for sensitive clinical data.
2. `research/open-decision-models-2026-09.md`: what we use instead.
3. `research/decision-proxy-options-2026-09.md`: how one proxy fronts all of it.
4. `architecture/knowme-decision-layer.html`: how it fits the products.
5. `PLAYBOOK.md`: how to build it.

## Review status

The 28 September contract corrections are planning artifacts. `PLAYBOOK.md` is authoritative; the historical API probes and upstream benchmarks are not runtime acceptance evidence. Provider eligibility, full scoring, representative calibration, host audit handling and MCP/browser interoperability remain implementation gates. The OpenSpec proposal is `openspec/changes/decision-proxy-contract-corrections/`. Published IPFS snapshots are immutable and do not include subsequent local edits.

## Conventions

- New design decisions go in `adr/` (see the ADR backlog in `PLAYBOOK.md` §17).
- Proposals that cross host boundaries go through `openspec/` at the repo root.
- **`sessions/` holds personal conversation content.** Review it before this repo is shared outside KnowMe, and consider moving it out of any public mirror.
