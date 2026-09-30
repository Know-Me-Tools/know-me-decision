# Proposal: m0-spike-b-eval-replay

## Why

Replay TypeSafe public evals and Kev frozen suites through the local backends and Jev; record accuracy, Brier and ECE.

Part of KBD phase `m0-bootstrap`; see `.kbd-orchestrator/phases/m0-bootstrap/plan.md` and PLAYBOOK §6 M0.

## What Changes

- Scope: evals/suites | evals/reports
   - Depends on: m0-spike-ad-local-hosting, m0-spike-e-hosted-scoring
   - Recommended agent: Codex (model-engineer)
   - Est. complexity: M
   - Complexity score: Medium
   - Model class: medium
   - Customer value: MEDIUM (quality baseline vs Jev)
   - Details: Fetch the published suites (record sources and licenses), run them against the Spike A/D backends and against Jev where Spike E permits, and compute accuracy, Brier and ECE (15 bins) with identical prompts and formatting.
   - Acceptance: evals/reports/spike-b.md with per-backend metric tables and suite provenance.

## Impact

- No change to accepted specs (openspec/specs/ is empty in M0); outputs are ADRs, workspace scaffolding or evals/reports.
- Invariants I-1..I-13 unaffected; see .kbd-orchestrator/constraints.md.
