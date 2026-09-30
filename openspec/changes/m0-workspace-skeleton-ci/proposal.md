# Proposal: m0-workspace-skeleton-ci

## Why

Cargo workspace skeleton per ADR-001, with toolchain, cargo-deny and CI green on an empty workspace.

Part of KBD phase `m0-bootstrap`; see `.kbd-orchestrator/phases/m0-bootstrap/plan.md` and PLAYBOOK §6 M0.

## What Changes

- Scope: repo root | crates | bins | xtask | .github/workflows
   - Depends on: m0-adrs-001-003
   - Recommended agent: Codex (runtime-engineer; isolated worktree)
   - Est. complexity: M
   - Complexity score: Medium
   - Model class: medium
   - Customer value: MEDIUM (foundation for M1)
   - Details: Cargo.toml with [workspace.dependencies] (exact pins) and [workspace.lints]; rust-toolchain.toml 1.97.1 with wasm32-unknown-unknown; deny.toml (licenses, bans, advisories). Empty crates for the ten decide-* crates. `#![forbid(unsafe_code)]` in decide-core, decide-schema, decide-tripwire, decide-calibrate, decide-policy and decide-audit (constraint forbid-unsafe-in-safe-crates). decide-core has no I/O and builds for wasm32. `[workspace.lints]` sets clippy `unwrap_used` and `expect_used` to deny outside tests (no-unwrap-expect-in-libs). `bins/knowme-decide` stub. `xtask` with minimal **passing** `spec-lint` (validates every file under specs/ against the I-6/I-8 rules; zero specs is a pass that reports `0 specs checked`) and `conformance` (asserts every registered decide-mcp tool except calibrate_fit is readOnly; zero tools reports `0 tools checked` and passes). Both are real checks that grow in M1/M6, not stubs, so the blocking constraints invariant-clinical-proposes and invariant-readonly-mcp pass at M0 archive. CI jobs: fmt, clippy -D warnings, test, deny, core-wasm. Local prerequisites: `rustup target add wasm32-unknown-unknown`, `cargo install cargo-deny`.
   - Acceptance: CI workflow green on the PR; `cargo check --workspace --all-targets`, `cargo build -p decide-core --target wasm32-unknown-unknown`, `cargo deny check`, `cargo xtask spec-lint` and `cargo xtask conformance` all exit 0 locally; a unit test proves spec-lint rejects a clinical spec with an untagged Act option; a CI grep check confirms the six safe crates carry `#![forbid(unsafe_code)]`.

## Impact

- No change to accepted specs (openspec/specs/ is empty in M0); outputs are ADRs, workspace scaffolding or evals/reports.
- Invariants I-1..I-13 unaffected; see .kbd-orchestrator/constraints.md.
