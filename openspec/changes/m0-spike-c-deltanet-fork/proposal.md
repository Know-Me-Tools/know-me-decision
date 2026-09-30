# Proposal: m0-spike-c-deltanet-fork

## Why

Can the candle-vllm fork snapshot and fork Qwen3.8 Gated DeltaNet state per request?

Part of KBD phase `m0-bootstrap`; see `.kbd-orchestrator/phases/m0-bootstrap/plan.md` and PLAYBOOK §6 M0.

## What Changes

- Scope: fork branch in GQAdonis/candle-vllm | evals/reports
   - Depends on: m0-reconcile-pending-design
   - Recommended agent: Claude Code (model-engineer)
   - Est. complexity: L
   - Complexity score: High
   - Model class: frontier
   - Customer value: MEDIUM (decides the LLM backend strategy)
   - Details: Work on a spike branch of the local fork (~/Projects/references/candle-vllm). Use the smallest Qwen3.8 variant that runs on the M1 Max via Metal. Prove or refute state snapshot/fork plus per-question logits, and record results at the timebox end whatever the outcome. Satisfies decision-proxy-contract-corrections 1.3 (DeltaNet part).
   - Acceptance: evals/reports/spike-c.md with a yes/no/partial verdict, evidence and the fork commit; the input to ADR-004.

## Impact

- No change to accepted specs (openspec/specs/ is empty in M0); outputs are ADRs, workspace scaffolding or evals/reports.
- Invariants I-1..I-13 unaffected; see .kbd-orchestrator/constraints.md.
