# know-me-decision

**Self-hosted decision models for KnowMe, as a Rust crate family and MCP sidecar.**

`know-me-decision` is the decision layer shared by KnowMe's products. It replaces hosted "System One" decision APIs such as TypeSafe's Jev with open-weight models running on the user's device or on the clinic's own hardware. Its answers carry calibrated probabilities, and it gives recall guarantees where a missed escalation matters.

> **Status:** pre-implementation. This repo currently holds the design, research and build playbook. Code starts at milestone M0 in [`docs/PLAYBOOK.md`](docs/PLAYBOOK.md).

## What it will do

It answers typed questions about a piece of state:

- **Choice:** pick one of up to 255 options.
- **Score:** an ordinal rubric.
- **Noul:** the probability that a statement is true.

Each answer comes back as an outcome the host can act on:

| Outcome | Meaning |
|---|---|
| `Act` | One option, calibrated and safe to automate |
| `Review` | A human confirms from a small prediction set |
| `Escalate` | A tripwire or escalation class fired. Always logged, and no model can override it |

Every answer passes through a fixed cascade:

1. Deterministic, signed **tripwire** rule packs
2. A fast **encoder** router (ModernBERT/mmBERT via candle, with an ONNX fallback)
3. A Jev-style **LLM decision head** (LitJev on Qwen3.8 through the candle-vllm fork)
4. **Guard models** (Qwen3Guard, Granite Guardian)
5. **Conformal calibration** fitted on each deployment's own human overrides

Every decision is written to a hash-chained audit log. Human corrections in that log become the next calibration's labels.

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

The full list (I-1…I-10) is in [`docs/PLAYBOOK.md` §2](docs/PLAYBOOK.md#2-invariants).

## Planned layout

```text
crates/   decide-core · decide-schema · decide-tripwire · decide-encoder · decide-llm
          decide-guard · decide-calibrate · decide-policy · decide-audit · decide-mcp
bins/     knowme-decide          (MCP stdio · HTTP sidecar with READY:{port} · CLI)
specs/    counselme/ · prior-auth/ · uar/      (versioned DecisionSpec JSON)
rulepacks/ models/ evals/ training/ marketplace/ xtask/ openspec/ docs/
```

## Documentation

Start with [`docs/README.md`](docs/README.md). The key documents are:

- [`docs/PLAYBOOK.md`](docs/PLAYBOOK.md): how to build it, milestone by milestone.
- [`docs/architecture/knowme-decision-layer.html`](docs/architecture/knowme-decision-layer.html): the architecture and use-case report. A [published copy is on IPFS](https://ipfs.prometheusags.ai/ipfs/bafkreiebxmldfdhyih57xwqnxq3beqa3whbhbiz556feamkz2r2botipay).
- [`docs/research/open-decision-models-2026-09.md`](docs/research/open-decision-models-2026-09.md): the survey of open, self-hostable decision models.

---

KnowMe, LLC · know-me.tools · *AI that understands you.*
