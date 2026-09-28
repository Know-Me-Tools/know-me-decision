# know-me-decision docs

| Document | What it is | Date |
|---|---|---|
| [`PLAYBOOK.md`](PLAYBOOK.md) | **The production build playbook.** Invariants, repo layout, core contracts, milestones M0–M10 with exit gates, models and weights, labels and calibration, evaluation, testing, performance budgets, security, release, host contracts, clinical gates, runbooks, and the ADR backlog | 2026-09-28 |
| [`architecture/knowme-decision-layer.html`](architecture/knowme-decision-layer.html) | **Architecture and use-case report** (KnowMe-branded HTMX with animated SVG diagrams). Crate and sidecar design, the decision cascade, the MCP tool surface, integration with each host, the CounselMe and prior-auth catalogs, and the skills marketplace. [Published copy on IPFS](https://ipfs.prometheusags.ai/ipfs/bafkreiebxmldfdhyih57xwqnxq3beqa3whbhbiz556feamkz2r2botipay) | 2026-09-27 |
| [`architecture/knowme-decision-layer-og.png`](architecture/knowme-decision-layer-og.png) | The report's OpenGraph preview image (1200×630), [pinned on IPFS](https://ipfs.prometheusags.ai/ipfs/bafkreifb4zsklm3rbumx5uvz3iqx4kjorrfbwv26nunmhrz4azqwvibjea) | 2026-09-27 |
| [`research/open-decision-models-2026-09.md`](research/open-decision-models-2026-09.md) | **Deep research:** self-hosted decision models to replace Jev, mapped to seven use cases, with a reference architecture | 2026-09-27 |
| [`research/jev-escalation-viability.md`](research/jev-escalation-viability.md) | Short assessment of using Jev for routing and human-escalation decisions in a counseling digital twin; the question that started this repo | 2026-09-27 |
| [`sessions/treston-2026-09-27-transcript.md`](sessions/treston-2026-09-27-transcript.md) | Transcript of the 27 Sep 2026 mentorship session (Travis James and Treston) where the decision-model idea was described (46:55–49:11) | 2026-09-27 |
| [`sessions/treston-2026-09-27-transcript.html`](sessions/treston-2026-09-27-transcript.html) | The same transcript as a searchable page with a topic index | 2026-09-27 |

## Reading order

1. `research/jev-escalation-viability.md`: why we don't use Jev.
2. `research/open-decision-models-2026-09.md`: what we use instead.
3. `architecture/knowme-decision-layer.html`: how it fits the products.
4. `PLAYBOOK.md`: how to build it.

## Conventions

- New design decisions go in `adr/` (see the ADR backlog in `PLAYBOOK.md` §17).
- Proposals that cross host boundaries go through `openspec/` at the repo root.
- **`sessions/` holds personal conversation content.** Review it before this repo is shared outside KnowMe, and consider moving it out of any public mirror.
