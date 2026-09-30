# Proposal: m0-spike-f-julia-onnx

## Why

Built-in Julia 1 baseline through a Rust wrapper and native ONNX Runtime.

Part of KBD phase `m0-bootstrap`; see `.kbd-orchestrator/phases/m0-bootstrap/plan.md` and PLAYBOOK §6 M0.

## What Changes

- Scope: evals/spikes/spike-f | evals/reports
   - Depends on: m0-reconcile-pending-design
   - Recommended agent: Claude Code (model-engineer)
   - Est. complexity: L
   - Complexity score: High
   - Model class: frontier
   - Customer value: HIGH (the zero-setup local default and the M1a prerequisite)
   - Details: Verify the upstream Julia 1 ONNX, tokenizer and license identities (immutable hashes). A throwaway probe crate outside the workspace loads the graph through `ort` and runs real Choice/Score/Noul calls with Python-reference parity. Measure macOS arm64 cold/warm p50/p95, peak RSS, package size and offline first launch. Mobile: iOS simulator and Android builds as far as the local toolchain allows (install `aarch64-apple-ios`; Android NDK required). Windows and Linux: cross-build/link feasibility only. Satisfies builtin-local-default 1.1–1.3 (1.4 via ADR-012).
   - Acceptance: evals/reports/spike-f.md with measured rows, and every unmeasured target marked BLOCKED with its reason (no estimates).

## Impact

- No change to accepted specs (openspec/specs/ is empty in M0); outputs are ADRs, workspace scaffolding or evals/reports.
- Invariants I-1..I-13 unaffected; see .kbd-orchestrator/constraints.md.
