# EXECUTION: m0-bootstrap

- **Backend:** `hybrid`. OpenSpec changes (`openspec/changes/m0-*`) are driven one task at a time through `/kbd-apply`, never bare `/opsx:apply`. The KBD runtime is authoritative (run `m0-bootstrap-20260930T053011Z`).
- **Plan:** `.kbd-orchestrator/phases/m0-bootstrap/plan.md` (9 changes, 51 tasks, 4 rounds).
- **Team:** `decide-team` (`.agent-team/project-routing.json`). Implementation goes to executor roles. The `reviewer` role stays dormant until every change is implementation-complete.

## Assignment

| Round | Change | Harness / role | Human gate |
|---|---|---|---|
| 1 | m0-reconcile-pending-design | Claude Code (this session): product-manager + decision-architect | D-005: operator accepts or revises the 2026-09-28 design |
| 2 | m0-adrs-001-003 | Claude Code: decision-architect | Operator pastes pins into versions.toml |
| 2 | m0-spike-f-julia-onnx | Claude Code: model-engineer | — |
| 2 | m0-spike-c-deltanet-fork | Claude Code: model-engineer (3-day timebox) | — |
| 2 | m0-spike-ad-local-hosting | Codex: model-engineer (operator-launched worktree) | — |
| 2 | m0-spike-e-hosted-scoring | Claude Code: model-engineer | Operator exports the TypeSafe key |
| 3 | m0-workspace-skeleton-ci | Codex: runtime-engineer (operator-launched worktree) | — |
| 3 | m0-spike-b-eval-replay | Codex: model-engineer | — |
| 4 | m0-adrs-004-012 | Claude Code: decision-architect | Operator enters candle/candle-vllm/ort pins |

Codex rows are dispatched by the operator: `codex` in a worktree, with the change ID and "drive it through /kbd-apply one task at a time" as the prompt. This session cannot launch Codex.

## Completion rules (from kbd-execute)

- A change is implementation-complete when its tasks are done through `kbd-apply end-task`. There is no per-change testing, QA or review.
- After all 9 changes are implementation-complete, run **one** production-path integration gate (the skeleton acceptance commands plus the spike reports present), then **one** cumulative `/refine-validate` and `/adversarial-review --mode diff` over the phase diff. The review must re-check the two round-2 plan fixes (see plan.md "Unresolved review findings").
- Only after those pass: `kbd-apply verify` and `archive` for each change, the typed stage transition to complete, `execute:after`, then the execute handoff.
- The long-lived proposals `decision-proxy-contract-corrections` and `builtin-local-default` are **not** archived in M0. Only their M0 tasks are satisfied.
