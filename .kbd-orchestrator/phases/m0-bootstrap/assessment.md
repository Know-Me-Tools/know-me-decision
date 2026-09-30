ASSESSMENT: m0-bootstrap
Project: know-me-decision
Date: 2026-09-30
Codebase baseline: Design-only repository — docs, OpenSpec, KBD, agent-team and docs-site scaffolding exist; there is no Rust workspace, no crate, no spec JSON and no eval artifact.
Cross-tool progress: 1 unrecorded session (OpenCode, 2026-09-28) changed 14 tracked files and added 2 OpenSpec proposals; none of it is committed and none of it is in progress.json.

IMPLEMENTATION STATUS
- Workspace skeleton (PLAYBOOK §3: Cargo.toml, crates/*, bins/, xtask/, specs/, rulepacks/, models/, evals/, calibration/, training/, marketplace/, tests/): MISSING — none of the 17 checked layout paths exist (the §3 list plus docs/adr, apps, evals/reports and tests).
- Toolchain files (rust-toolchain.toml 1.97.1, deny.toml): MISSING.
- CI (fmt, clippy, test, deny, core-wasm): MISSING — .github/workflows/ holds only docs.yml (Pages).
- AGENTS.md / CLAUDE.md with base rules: DONE — AGENTS.md managed region + project section, CLAUDE.md -> AGENTS.md, team routing block. (PLAYBOOK M0 task 2.)
- openspec/ seeded: DONE — config.yaml, 6-harness skills; openspec/specs/ is empty.
- Spike F (built-in Julia 1 via Rust + native ONNX Runtime): MISSING — no weights, tokenizer, wrapper or packaging probe locally; research note exists (docs/research/decision-proxy-options-2026-09.md).
- Spike A (Kev-4B, laya-rust latency/memory): MISSING — neither Kev nor laya-rust is checked out; no Windows CUDA host is recorded.
- Spike B (TypeSafe public evals, Kev frozen suites): MISSING — suites not present locally.
- Spike C (candle-vllm DeltaNet state fork): MISSING — GQAdonis/candle-vllm fork is checked out at ~/Projects/references/candle-vllm (b96c095); no spike branch or notes. LitJev reference checked out at ~/Projects/references/litjev (e7fb109).
- Spike D (laya-mlx vs laya-rust on Metal): MISSING — Apple M1 Max, 64 GiB is available for it.
- Spike E (permitted service use and score capabilities): MISSING — no TypeSafe/Jev credential variable is present in the environment; Qwen and HF credential variables are present, but the 2026-09-28 decisions record that the Qwen token plan is not a permitted production endpoint.
- evals/reports/ spike reports: MISSING.
- ADR-001..004: MISSING — docs/adr/ does not exist.
- versions.toml pins: STUB — [pins] and [decisions] are empty; .claude/settings.json denies Edit(versions.toml), so ADR-002 pins must be entered by hand.

CROSS-TOOL PROGRESS
- Uncommitted session (OpenCode, per .opencode/opencode-loop/ses_*.json and .prometheus/session-log.md 2026-09-28): rewrote PLAYBOOK (§5a decision proxy, I-11..I-13, M1a, Spike D/E/F), README, docs/README, AGENTS.md, PRODUCT.md, both research docs plus a new decision-proxy-options note, the architecture report and OG image, website/content/architecture.md and website/scripts/sync-docs.mjs; appended 3 decisions and session-log entries.
- openspec/changes/decision-proxy-contract-corrections: PROPOSED, 0/19 tasks, `openspec validate --strict` VALID.
- openspec/changes/builtin-local-default: PROPOSED, 0/15 tasks, `openspec validate --strict` VALID.
- progress.json records none of this (implementation 0/0); the waypoint was never advanced by that session.

SPEC GAP SUMMARY
- Canonical specs: openspec/specs/ is empty, so M0 has no accepted spec baseline; the two proposals are the only spec-level artifacts and neither is accepted.
- Pin drift: PLAYBOOK §4 now pins rmcp =3.5.0 (MCP 2026-07-28), but .claude/rules/rust.md still says rmcp =3.4.x and candle 0.11; ADR-002 must settle one set and versions.toml must record it.
- Invariant drift: PLAYBOOK §2 now defines I-11..I-13 and AGENTS.md references them, but .kbd-orchestrator/constraints.md still derives only I-1..I-10 — the new hosted-data, narrowing-routing and Jev-compatibility rules are not enforced as KBD constraints.
- Spike F precedes the ADR-004 decision but is not in the PLAYBOOK ADR backlog: the choice "native ONNX Runtime with C/C++ dependencies vs pure-Rust" needs an ADR (candidate ADR-012) before M4 work, since it changes the forbid(unsafe)/deny.toml/licensing posture.
- M0 exit gate says "CI green on an empty workspace", but the core-wasm job needs a decide-core crate to exist; the skeleton must include at least an empty decide-core.

BUILD HEALTH
- build check: UNKNOWN — `cargo check --workspace --all-targets` cannot run (no Cargo.toml). Constraints mark cargo checks N/A until M0.
- toolchain readiness: rustup 1.97.1 installed with aarch64-apple-darwin, aarch64-linux-android, aarch64-apple-ios-sim, x86_64-apple-ios, *-pc-windows-msvc, x86_64-unknown-linux-musl. MISSING targets: wasm32-unknown-unknown (required by I-10 / core-wasm) and aarch64-apple-ios (device; required by Spike F iOS packaging).
- tools: cargo-fuzz and cargo-audit present; cargo-deny MISSING (required by CI and the fmt-clippy-deny constraint); cargo-insta MISSING (wire snapshots from M1).
- known violations: NONE (no code).
- test coverage: NONE.

CONSTRAINT CHECK
- AGENTS.md violations: NONE in code (no code). Process risk: 14 tracked docs changed outside any phase and uncommitted; `.opencode/opencode-loop/` (session JSON) and `.playwright-mcp/` (browser artifacts) are untracked and not ignored, so a blanket `git add -A` would publish them to this public repository.
- constraints.md violations: N/A for command checks (pre-M0). Content gap: constraints omit I-11..I-13 (see SPEC GAP).
- Privacy: docs/sessions/ correctly ignored; `verify.mjs --privacy` passed at the last commit (3dde80e).

GOAL PROGRESS
- G1 Workspace skeleton + toolchain + CI green: NOT MET — nothing exists; wasm32 target and cargo-deny must be installed first.
- G2 Spike F built-in Julia 1 baseline: NOT MET — assets, wrapper and packaging probes absent; iOS device target missing.
- G3 Spike A Kev-4B / laya-rust latency: NOT MET — models not local; Windows CUDA host unconfirmed (likely BLOCKED for the Windows half).
- G4 Spike B eval replay: NOT MET — suites not local.
- G5 Spike C DeltaNet state fork: NOT MET — fork available locally, work not started.
- G6 Spike D laya-mlx vs laya-rust: NOT MET — M1 Max available, models not local.
- G7 Spike E permitted service and scores: NOT MET — BLOCKED on TypeSafe access for the hosted half; Qwen entitlement unverified.
- G8 Spike reports in evals/reports/: NOT MET.
- G9 ADR-001..004 accepted: NOT MET — docs/adr/ absent; ADR-002 requires hand-edit of versions.toml.
- G10 Resolve pending proxy/local-default docs and proposals: PARTIAL — both proposals validate strictly; the doc changes are unreviewed and uncommitted, and pin/invariant drift remains.

KEY RISKS
1. Unreviewed design shift: the uncommitted session changed the M0 scope (Spike F becomes priority; Spikes D/E added) and the architecture (decision proxy, I-11..I-13) without a phase, review or commit. Planning on top of it before review bakes unvetted decisions into M0.
2. External blockers: Windows CUDA hardware (Spike A), TypeSafe credentials (Spike E hosted gate, M1a hosted gate) and possibly model licensing/access for Kev, Laya and Julia 1 weights.
3. Native dependency posture: Spike F's native ONNX Runtime (C/C++) conflicts with the safe-crate forbid(unsafe) posture unless isolated in a backend crate and recorded in an ADR and deny.toml.
4. Timebox pressure: six goals are spikes (F, A, B, C, D, E); only Spike C carries an explicit timebox.

OPEN QUESTIONS FOR PLAN
- Which pin set wins (rmcp 3.4.x vs 3.5.0, candle 0.11) — to be fixed by ADR-002 and entered in versions.toml by hand.
- Is a Windows CUDA host available, or does Spike A record the Windows half as BLOCKED?
- Is TypeSafe access expected during M0, or does Spike E report the hosted half as blocked (the playbook permits this)?
- Should Spike F's native-runtime decision get its own ADR (ADR-012) in M0?

ASSESSMENT COMPLETE

EVIDENCE (command outputs captured 2026-09-30 for this assessment)
```
$ ls .github/workflows
docs.yml
$ git check-ignore -v docs/sessions/x ; git ls-files docs/sessions | wc -l
.gitignore:124:/docs/sessions/	docs/sessions/x
0
$ git status --short
 M .kbd-orchestrator/current-waypoint.json
 M .kbd-orchestrator/project.json
 M .prometheus/decisions.md
 M .prometheus/gotchas.md
 M .prometheus/session-log.md
 M AGENTS.md
 M PRODUCT.md
 M README.md
 M docs/PLAYBOOK.md
 M docs/README.md
 M docs/architecture/knowme-decision-layer-og.png
 M docs/architecture/knowme-decision-layer.html
 M docs/research/jev-escalation-viability.md
 M docs/research/open-decision-models-2026-09.md
 M website/content/architecture.md
 M website/scripts/sync-docs.mjs
?? .kbd-orchestrator/model-preflight.json
?? .kbd-orchestrator/phases/
?? .kbd-orchestrator/position-reminder.txt
?? .kbd-orchestrator/position.json
?? .opencode/opencode-loop/
?? .playwright-mcp/
?? docs/research/decision-proxy-options-2026-09.md
?? openspec/changes/
$ openspec list
  builtin-local-default                   0/15 tasks    1d ago
  decision-proxy-contract-corrections     0/19 tasks    1d ago
$ rustup target list --installed --toolchain 1.97.1
aarch64-apple-darwin
aarch64-apple-ios-sim
aarch64-linux-android
aarch64-pc-windows-msvc
x86_64-apple-ios
x86_64-pc-windows-msvc
x86_64-unknown-linux-musl
$ command -v cargo-deny cargo-insta cargo-fuzz cargo-audit
cargo-deny: missing
cargo-insta: missing
cargo-fuzz: present
cargo-audit: present
$ env var names present (values not read)
no TYPESAFE/JEV variables
```

ADVERSARIAL REVIEW (review/assess/findings.json)
- Judge: gpt-5.5 via rest-gateway localhost:4000, producer claude-opus-5-5, cross_model_check verified-distinct. Verdict PASS, 0 CRITICAL / 4 WARNING. Anti-theater gate PASS (score 0.0).
- W1 CI workflow claim unsupported by packet tree: RESOLVED — packet tree omits dot-directories; EVIDENCE shows .github/workflows/docs.yml.
- W2 docs/sessions "ignored" vs constraints "tracked": RESOLVED — the assessment was correct (gitignored, 0 tracked files); constraints.md path-ownership line was stale and is corrected.
- W3 uncommitted session state unsupported: RESOLVED — git status and openspec list outputs in EVIDENCE.
- W4 toolchain state unsupported: RESOLVED — rustup target and cargo tool outputs in EVIDENCE.
