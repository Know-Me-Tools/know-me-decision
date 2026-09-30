# Proposal: m0-adrs-004-012

## Why

ADR-004 (LLM backend: LitJev on the fork vs Kev subprocess) and ADR-012 (embedded native ONNX Runtime for the built-in default), plus the M0 exit review.

Part of KBD phase `m0-bootstrap`; see `.kbd-orchestrator/phases/m0-bootstrap/plan.md` and PLAYBOOK §6 M0.

## What Changes

- Scope: docs/adr | versions.toml (hand edit) | deny.toml
   - Depends on: m0-spike-f-julia-onnx, m0-spike-c-deltanet-fork, m0-spike-ad-local-hosting, m0-spike-b-eval-replay, m0-workspace-skeleton-ci
   - Recommended agent: Claude Code (decision-architect) + reviewer (separate context)
   - Est. complexity: M
   - Complexity score: High
   - Model class: frontier
   - Customer value: HIGH (closes M0)
   - Details: ADR-004 decides from Spikes C, A/D and B. ADR-012 records native ONNX Runtime isolation in a backend crate (unsafe only behind `// SAFETY:`), license notices, deny.toml exceptions and the packaging posture, from Spike F (builtin-local-default 1.4). The operator enters the candle, candle-vllm and ort pins in versions.toml. Independent review of all M0 artifacts against the exit gate.
   - Acceptance: ADR-004 and ADR-012 Accepted. The reviewer's exit report lists **every blocking constraint ID** in .kbd-orchestrator/constraints.md (enumerated from the file at review time, not from this plan), each with PASS evidence: a command output for command/check constraints; for invariant constraints whose code doesn't exist until M1–M6 (I-1..I-13 semantics, no-rmcp-types-in-public-api, never-fail-open, no-state-text-in-logs, no-real-labels-in-repo), evidence that the M0 tree contains no code or data able to violate them, and that ADR-003 records how each will be enforced. No blocking constraint may be BLOCKED. BLOCKED is allowed only for non-blocking spike measurement rows that depend on the environment (Windows CUDA, physical iOS/Android devices, unverified remote-Qwen entitlement), each with its reason and operator acknowledgement recorded as a decision-log entry. The reviewer's findings list each exit-gate item with PASS/BLOCK evidence.

## Impact

- No change to accepted specs (openspec/specs/ is empty in M0); outputs are ADRs, workspace scaffolding or evals/reports.
- Invariants I-1..I-13 unaffected; see .kbd-orchestrator/constraints.md.
