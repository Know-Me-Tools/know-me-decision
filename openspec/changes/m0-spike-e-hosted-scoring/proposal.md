# Proposal: m0-spike-e-hosted-scoring

## Why

Verify permitted service use and score capabilities on authorized hosted endpoints (TypeSafe Jev key available, D-003; remote Qwen entitlement).

Part of KBD phase `m0-bootstrap`; see `.kbd-orchestrator/phases/m0-bootstrap/plan.md` and PLAYBOOK §6 M0.

## What Changes

- Scope: evals/spikes/spike-e | evals/reports
   - Depends on: m0-reconcile-pending-design
   - Recommended agent: Claude Code (model-engineer) + Manual (operator exports the key; agents never read its value)
   - Est. complexity: M
   - Complexity score: Medium
   - Model class: frontier
   - Customer value: HIGH (gates M1a hosted and any remote Qwen use)
   - Details: Record the TypeSafe terms and permitted use for non-sensitive data, then call Jev on synthetic and public data only (I-11). Test complete candidate scoring vs any described approximation; missing-token cases force Review; record hierarchy end-to-end error. For remote Qwen, verify service-use permission before any call and report it as blocked if unverified. Satisfies decision-proxy-contract-corrections 1.2.
   - Acceptance: evals/reports/spike-e.md with entitlement evidence, measured score completeness, and explicit blocked capabilities.

## Impact

- No change to accepted specs (openspec/specs/ is empty in M0); outputs are ADRs, workspace scaffolding or evals/reports.
- Invariants I-1..I-13 unaffected; see .kbd-orchestrator/constraints.md.
