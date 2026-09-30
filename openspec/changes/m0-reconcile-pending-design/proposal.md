# Proposal: m0-reconcile-pending-design

## Why

Review, reconcile and commit the uncommitted 2026-09-28 design work before anything builds on it.

Part of KBD phase `m0-bootstrap`; see `.kbd-orchestrator/phases/m0-bootstrap/plan.md` and PLAYBOOK §6 M0.

## What Changes

- Scope: docs | constraints | rules | openspec (no code)
   - Depends on: NONE
   - Recommended agent: Claude Code (product-manager + decision-architect roles) + Manual (operator approval of the design shift)
   - Est. complexity: S
   - Complexity score: Medium
   - Model class: frontier
   - Customer value: HIGH (unblocks every other change; removes the unreviewed-design risk)
   - Details: Gitignore `.opencode/opencode-loop/` and `.playwright-mcp/` through the managed block. Set `.claude/rules/rust.md` to rmcp `=3.5.0` (D-001). Add I-11..I-13 blocking constraints to `.kbd-orchestrator/constraints.md`. Record the operator's accept/revise decision on PLAYBOOK §5a, M1a and Spikes D/E/F as D-005 in .kbd-orchestrator/phases/m0-bootstrap/decision-log.md. Run the privacy scan and commit docs plus KBD phase state. Satisfies decision-proxy-contract-corrections 1.1 (initial review record only; host-owner acceptance stays open).
   - Acceptance: `git status` clean except ignored paths; `node ~/.claude/skills/knowme-project-setup/scripts/verify.mjs .` (the installed knowme-project-setup skill's verifier, not a repo file) reports 0 FAIL; `--privacy` reports 0 FAIL; constraints list I-1..I-13; D-005 exists in .kbd-orchestrator/phases/m0-bootstrap/decision-log.md.

## Impact

- No change to accepted specs (openspec/specs/ is empty in M0); outputs are ADRs, workspace scaffolding or evals/reports.
- Invariants I-1..I-13 unaffected; see .kbd-orchestrator/constraints.md.
