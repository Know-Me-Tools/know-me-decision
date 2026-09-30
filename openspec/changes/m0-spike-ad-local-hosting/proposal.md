# Proposal: m0-spike-ad-local-hosting

## Why

Spikes A and D on Apple Silicon — Kev-4B, laya-rust and laya-mlx latency and memory (D-002).

Part of KBD phase `m0-bootstrap`; see `.kbd-orchestrator/phases/m0-bootstrap/plan.md` and PLAYBOOK §6 M0.

## What Changes

- Scope: evals/spikes/spike-ad | evals/reports
   - Depends on: m0-reconcile-pending-design
   - Recommended agent: Codex (model-engineer)
   - Est. complexity: L
   - Complexity score: Medium
   - Model class: medium
   - Customer value: MEDIUM (local hosting path and the MLX worker vs mlx-rs decision)
   - Details: On the M1 Max, measure Kev-4B (Python server), laya-rust (candle Metal) and laya-mlx (all three checkpoints, including the stdio-worker hop): p50/p95 latency and memory for 1, 3 and 10 questions per state. The Windows CUDA half is BLOCKED (D-002). Decide v1 worker vs native mlx-rs. Satisfies decision-proxy-contract-corrections 1.3 (local-runtime part).
   - Acceptance: evals/reports/spike-ad.md with measured tables, a `BLOCKED: no hardware` row for Windows CUDA, and a worker-vs-mlx-rs recommendation.

## Impact

- No change to accepted specs (openspec/specs/ is empty in M0); outputs are ADRs, workspace scaffolding or evals/reports.
- Invariants I-1..I-13 unaffected; see .kbd-orchestrator/constraints.md.
