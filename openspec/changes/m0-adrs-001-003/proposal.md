# Proposal: m0-adrs-001-003

## Why

Write and accept ADR-000 (template), ADR-001 (repo and crate boundaries), ADR-002 (pins) and ADR-003 (outcome semantics and invariants I-1..I-13).

Part of KBD phase `m0-bootstrap`; see `.kbd-orchestrator/phases/m0-bootstrap/plan.md` and PLAYBOOK §6 M0.

## What Changes

- Scope: docs/adr | versions.toml (hand edit)
   - Depends on: m0-reconcile-pending-design
   - Recommended agent: Claude Code (decision-architect) + Manual (operator enters the pins in versions.toml)
   - Est. complexity: M
   - Complexity score: Medium
   - Model class: frontier
   - Customer value: HIGH (unblocks the skeleton; fixes the pin set)
   - Details: ADR-001 fixes the crate list and feature profiles (decide-lite, decide-desktop, decide-server) from §3/§4. ADR-002 lists exact pins, with rmcp =3.5.0 per D-001; candle and candle-vllm revs stay "pending ADR-004". The agent prepares the exact `versions.toml` lines, and the operator pastes them in (Edit is denied to agents). ADR-003 records primitive answers vs outcomes and the outcome mapping, including I-11..I-13.
   - Acceptance: 4 ADR files with status Accepted; versions.toml [pins] non-empty and matching ADR-002; no conflicting pin text left in docs or rules.

## Impact

- No change to accepted specs (openspec/specs/ is empty in M0); outputs are ADRs, workspace scaffolding or evals/reports.
- Invariants I-1..I-13 unaffected; see .kbd-orchestrator/constraints.md.
