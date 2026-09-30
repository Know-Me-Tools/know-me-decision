PLAN: m0-bootstrap
Project: know-me-decision
Date: 2026-09-30
OpenSpec available: YES
Changes to implement: 9

Inputs: assessment.md (PASS, 4 warnings resolved), .kbd-orchestrator/phases/m0-bootstrap/decision-log.md D-001..D-004 (exists; written 2026-09-30) (rmcp =3.5.0; no Windows CUDA — M1 Max + MLX; TypeSafe key available; ADR-012 for native ONNX Runtime), PLAYBOOK §6 M0 as revised 2026-09-28.

Relationship to existing proposals: `decision-proxy-contract-corrections` and `builtin-local-default` stay open as long-lived cross-host proposals spanning M0–M10. M0 changes satisfy their "M0 feasibility" tasks and cite them by task number. They are not duplicated and not archived in M0.

CHANGE LIST (ordered)
1. m0-reconcile-pending-design: Review, reconcile and commit the uncommitted 2026-09-28 design work before anything builds on it.
   - Scope: docs | constraints | rules | openspec (no code)
   - Depends on: NONE
   - Recommended agent: Claude Code (product-manager + decision-architect roles) + Manual (operator approval of the design shift)
   - Est. complexity: S
   - Complexity score: Medium
   - Model class: frontier
   - Customer value: HIGH (unblocks every other change; removes the unreviewed-design risk)
   - Details: Gitignore `.opencode/opencode-loop/` and `.playwright-mcp/` through the managed block. Set `.claude/rules/rust.md` to rmcp `=3.5.0` (D-001). Add I-11..I-13 blocking constraints to `.kbd-orchestrator/constraints.md`. Record the operator's accept/revise decision on PLAYBOOK §5a, M1a and Spikes D/E/F as D-005 in .kbd-orchestrator/phases/m0-bootstrap/decision-log.md. Run the privacy scan and commit docs plus KBD phase state. Satisfies decision-proxy-contract-corrections 1.1 (initial review record only; host-owner acceptance stays open).
   - Acceptance: `git status` clean except ignored paths; `node ~/.claude/skills/knowme-project-setup/scripts/verify.mjs .` (the installed knowme-project-setup skill's verifier, not a repo file) reports 0 FAIL; `--privacy` reports 0 FAIL; constraints list I-1..I-13; D-005 exists in .kbd-orchestrator/phases/m0-bootstrap/decision-log.md.

2. m0-adrs-001-003: Write and accept ADR-000 (template), ADR-001 (repo and crate boundaries), ADR-002 (pins) and ADR-003 (outcome semantics and invariants I-1..I-13).
   - Scope: docs/adr | versions.toml (hand edit)
   - Depends on: m0-reconcile-pending-design
   - Recommended agent: Claude Code (decision-architect) + Manual (operator enters the pins in versions.toml)
   - Est. complexity: M
   - Complexity score: Medium
   - Model class: frontier
   - Customer value: HIGH (unblocks the skeleton; fixes the pin set)
   - Details: ADR-001 fixes the crate list and feature profiles (decide-lite, decide-desktop, decide-server) from §3/§4. ADR-002 lists exact pins, with rmcp =3.5.0 per D-001; candle and candle-vllm revs stay "pending ADR-004". The agent prepares the exact `versions.toml` lines, and the operator pastes them in (Edit is denied to agents). ADR-003 records primitive answers vs outcomes and the outcome mapping, including I-11..I-13.
   - Acceptance: 4 ADR files with status Accepted; versions.toml [pins] non-empty and matching ADR-002; no conflicting pin text left in docs or rules.

3. m0-workspace-skeleton-ci: Cargo workspace skeleton per ADR-001, with toolchain, cargo-deny and CI green on an empty workspace.
   - Scope: repo root | crates | bins | xtask | .github/workflows
   - Depends on: m0-adrs-001-003
   - Recommended agent: Codex (runtime-engineer; isolated worktree)
   - Est. complexity: M
   - Complexity score: Medium
   - Model class: medium
   - Customer value: MEDIUM (foundation for M1)
   - Details: Cargo.toml with [workspace.dependencies] (exact pins) and [workspace.lints]; rust-toolchain.toml 1.97.1 with wasm32-unknown-unknown; deny.toml (licenses, bans, advisories). Empty crates for the ten decide-* crates. `#![forbid(unsafe_code)]` in decide-core, decide-schema, decide-tripwire, decide-calibrate, decide-policy and decide-audit (constraint forbid-unsafe-in-safe-crates). decide-core has no I/O and builds for wasm32. `[workspace.lints]` sets clippy `unwrap_used` and `expect_used` to deny outside tests (no-unwrap-expect-in-libs). `bins/knowme-decide` stub. `xtask` with minimal **passing** `spec-lint` (validates every file under specs/ against the I-6/I-8 rules; zero specs is a pass that reports `0 specs checked`) and `conformance` (asserts every registered decide-mcp tool except calibrate_fit is readOnly; zero tools reports `0 tools checked` and passes). Both are real checks that grow in M1/M6, not stubs, so the blocking constraints invariant-clinical-proposes and invariant-readonly-mcp pass at M0 archive. CI jobs: fmt, clippy -D warnings, test, deny, core-wasm. Local prerequisites: `rustup target add wasm32-unknown-unknown`, `cargo install cargo-deny`.
   - Acceptance: CI workflow green on the PR; `cargo check --workspace --all-targets`, `cargo build -p decide-core --target wasm32-unknown-unknown`, `cargo deny check`, `cargo xtask spec-lint` and `cargo xtask conformance` all exit 0 locally; a unit test proves spec-lint rejects a clinical spec with an untagged Act option; a CI grep check confirms the six safe crates carry `#![forbid(unsafe_code)]`.

4. m0-spike-f-julia-onnx (PRIORITY): Built-in Julia 1 baseline through a Rust wrapper and native ONNX Runtime.
   - Scope: evals/spikes/spike-f | evals/reports
   - Depends on: m0-reconcile-pending-design
   - Recommended agent: Claude Code (model-engineer)
   - Est. complexity: L
   - Complexity score: High
   - Model class: frontier
   - Customer value: HIGH (the zero-setup local default and the M1a prerequisite)
   - Details: Verify the upstream Julia 1 ONNX, tokenizer and license identities (immutable hashes). A throwaway probe crate outside the workspace loads the graph through `ort` and runs real Choice/Score/Noul calls with Python-reference parity. Measure macOS arm64 cold/warm p50/p95, peak RSS, package size and offline first launch. Mobile: iOS simulator and Android builds as far as the local toolchain allows (install `aarch64-apple-ios`; Android NDK required). Windows and Linux: cross-build/link feasibility only. Satisfies builtin-local-default 1.1–1.3 (1.4 via ADR-012).
   - Acceptance: evals/reports/spike-f.md with measured rows, and every unmeasured target marked BLOCKED with its reason (no estimates).

5. m0-spike-c-deltanet-fork (3-day timebox): Can the candle-vllm fork snapshot and fork Qwen3.8 Gated DeltaNet state per request?
   - Scope: fork branch in GQAdonis/candle-vllm | evals/reports
   - Depends on: m0-reconcile-pending-design
   - Recommended agent: Claude Code (model-engineer)
   - Est. complexity: L
   - Complexity score: High
   - Model class: frontier
   - Customer value: MEDIUM (decides the LLM backend strategy)
   - Details: Work on a spike branch of the local fork (~/Projects/references/candle-vllm). Use the smallest Qwen3.8 variant that runs on the M1 Max via Metal. Prove or refute state snapshot/fork plus per-question logits, and record results at the timebox end whatever the outcome. Satisfies decision-proxy-contract-corrections 1.3 (DeltaNet part).
   - Acceptance: evals/reports/spike-c.md with a yes/no/partial verdict, evidence and the fork commit; the input to ADR-004.

6. m0-spike-ad-local-hosting: Spikes A and D on Apple Silicon — Kev-4B, laya-rust and laya-mlx latency and memory (D-002).
   - Scope: evals/spikes/spike-ad | evals/reports
   - Depends on: m0-reconcile-pending-design
   - Recommended agent: Codex (model-engineer)
   - Est. complexity: L
   - Complexity score: Medium
   - Model class: medium
   - Customer value: MEDIUM (local hosting path and the MLX worker vs mlx-rs decision)
   - Details: On the M1 Max, measure Kev-4B (Python server), laya-rust (candle Metal) and laya-mlx (all three checkpoints, including the stdio-worker hop): p50/p95 latency and memory for 1, 3 and 10 questions per state. The Windows CUDA half is BLOCKED (D-002). Decide v1 worker vs native mlx-rs. Satisfies decision-proxy-contract-corrections 1.3 (local-runtime part).
   - Acceptance: evals/reports/spike-ad.md with measured tables, a `BLOCKED: no hardware` row for Windows CUDA, and a worker-vs-mlx-rs recommendation.

7. m0-spike-e-hosted-scoring: Verify permitted service use and score capabilities on authorized hosted endpoints (TypeSafe Jev key available, D-003; remote Qwen entitlement).
   - Scope: evals/spikes/spike-e | evals/reports
   - Depends on: m0-reconcile-pending-design
   - Recommended agent: Claude Code (model-engineer) + Manual (operator exports the key; agents never read its value)
   - Est. complexity: M
   - Complexity score: Medium
   - Model class: frontier
   - Customer value: HIGH (gates M1a hosted and any remote Qwen use)
   - Details: Record the TypeSafe terms and permitted use for non-sensitive data, then call Jev on synthetic and public data only (I-11). Test complete candidate scoring vs any described approximation; missing-token cases force Review; record hierarchy end-to-end error. For remote Qwen, verify service-use permission before any call and report it as blocked if unverified. Satisfies decision-proxy-contract-corrections 1.2.
   - Acceptance: evals/reports/spike-e.md with entitlement evidence, measured score completeness, and explicit blocked capabilities.

8. m0-spike-b-eval-replay: Replay TypeSafe public evals and Kev frozen suites through the local backends and Jev; record accuracy, Brier and ECE.
   - Scope: evals/suites | evals/reports
   - Depends on: m0-spike-ad-local-hosting, m0-spike-e-hosted-scoring
   - Recommended agent: Codex (model-engineer)
   - Est. complexity: M
   - Complexity score: Medium
   - Model class: medium
   - Customer value: MEDIUM (quality baseline vs Jev)
   - Details: Fetch the published suites (record sources and licenses), run them against the Spike A/D backends and against Jev where Spike E permits, and compute accuracy, Brier and ECE (15 bins) with identical prompts and formatting.
   - Acceptance: evals/reports/spike-b.md with per-backend metric tables and suite provenance.

9. m0-adrs-004-012: ADR-004 (LLM backend: LitJev on the fork vs Kev subprocess) and ADR-012 (embedded native ONNX Runtime for the built-in default), plus the M0 exit review.
   - Scope: docs/adr | versions.toml (hand edit) | deny.toml
   - Depends on: m0-spike-f-julia-onnx, m0-spike-c-deltanet-fork, m0-spike-ad-local-hosting, m0-spike-b-eval-replay, m0-workspace-skeleton-ci
   - Recommended agent: Claude Code (decision-architect) + reviewer (separate context)
   - Est. complexity: M
   - Complexity score: High
   - Model class: frontier
   - Customer value: HIGH (closes M0)
   - Details: ADR-004 decides from Spikes C, A/D and B. ADR-012 records native ONNX Runtime isolation in a backend crate (unsafe only behind `// SAFETY:`), license notices, deny.toml exceptions and the packaging posture, from Spike F (builtin-local-default 1.4). The operator enters the candle, candle-vllm and ort pins in versions.toml. Independent review of all M0 artifacts against the exit gate.
   - Acceptance: ADR-004 and ADR-012 Accepted. The reviewer's exit report lists **every blocking constraint ID** in .kbd-orchestrator/constraints.md (enumerated from the file at review time, not from this plan), each with PASS evidence: a command output for command/check constraints; for invariant constraints whose code doesn't exist until M1–M6 (I-1..I-13 semantics, no-rmcp-types-in-public-api, never-fail-open, no-state-text-in-logs, no-real-labels-in-repo), evidence that the M0 tree contains no code or data able to violate them, and that ADR-003 records how each will be enforced. No blocking constraint may be BLOCKED. BLOCKED is allowed only for non-blocking spike measurement rows that depend on the environment (Windows CUDA, physical iOS/Android devices, unverified remote-Qwen entitlement), each with its reason and operator acknowledgement recorded as a decision-log entry. The reviewer's findings list each exit-gate item with PASS/BLOCK evidence.

EXECUTION ROUND ORDER
Round 1: m0-reconcile-pending-design
Round 2 (parallel): m0-adrs-001-003, m0-spike-f-julia-onnx, m0-spike-c-deltanet-fork, m0-spike-ad-local-hosting, m0-spike-e-hosted-scoring
Round 3 (parallel): m0-workspace-skeleton-ci, m0-spike-b-eval-replay
Round 4: m0-adrs-004-012

TRADE-OFFS AND SCOPE CUTS
- Windows CUDA measurements are BLOCKED for M0 (D-002). The PLAYBOOK §11 Windows budgets stay unvalidated. Revisit before M7 (rent a CUDA instance, or change the budgets by ADR).
- Spike F mobile coverage is limited to what the local toolchain supports: iOS simulator (device needs signing and hardware) and Android only if the NDK is installed. Unmeasured targets are BLOCKED, not estimated.
- Spikes A and D are merged into one change because both measure local hosting on the same M1 Max. Spike B runs last because it needs those backends plus Spike E's entitlement result.
- Spike C keeps its 3-day timebox; Spikes F, A/D, E and B have none in the playbook. Proposed soft timeboxes: F 3 days, A/D 2 days, E 1 day, B 2 days, with a report at the timebox either way.
- The long-lived proposals stay open; M0 only closes their M0 feasibility tasks. Host-owner acceptance (decision-proxy-contract-corrections 1.1) is outside this phase's control.
- Two human-gated steps are unavoidable: the operator's pin entry in versions.toml (changes 2 and 9) and exporting the TypeSafe key (change 7).

COMMANDS TO RUN
/opsx:new m0-reconcile-pending-design
/opsx:new m0-adrs-001-003
/opsx:new m0-workspace-skeleton-ci
/opsx:new m0-spike-f-julia-onnx
/opsx:new m0-spike-c-deltanet-fork
/opsx:new m0-spike-ad-local-hosting
/opsx:new m0-spike-e-hosted-scoring
/opsx:new m0-spike-b-eval-replay
/opsx:new m0-adrs-004-012

ADVERSARIAL REVIEW (review/plan/findings.round1.json, review/plan/findings.json)
- Judge gpt-5.5, producer claude-opus-5-5, cross_model_check verified-distinct; anti-theater gate PASS both rounds.
- Round 1 BLOCK (3 CRITICAL, 1 WARNING), all addressed: exit gate may not BLOCK blocking constraints; xtask spec-lint/conformance are minimal passing checks, not failing stubs; verify.mjs is referenced by its installed-skill path; decision-log path made explicit.
- Round 2 BLOCK (2 CRITICAL): exit gate must enumerate every blocking constraint ID from constraints.md; forbid(unsafe_code) required in all six safe crates.

Unresolved review findings
- Round 2's two CRITICALs were fixed in this file after the second (final) re-vet round, so the fixes have not been re-reviewed. /kbd-execute's diff-mode review of m0-workspace-skeleton-ci and m0-adrs-004-012 must re-check them.

PLAN COMPLETE
