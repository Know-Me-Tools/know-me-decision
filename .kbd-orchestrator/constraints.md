# KBD Constraints — know-me-decision

Derived from `docs/PLAYBOOK.md` §2 (invariants I-1…I-10) and §4 (toolchain), and from
`CLAUDE.md`. No `AGENTS.md` exists yet (it is created at M0). The playbook is the source
of truth. Weakening any invariant below requires an ADR in `docs/adr/` plus sign-off
from every affected host's product owner.

Note: the repo is pre-implementation. Command-based checks become runnable once M0 creates
the Cargo workspace. Until then, they report "not applicable", not "failed".

---

## Blocking Constraints (prevent archiving until resolved)

```yaml
constraints:
  - id: build-passes
    severity: blocking
    description: 'Workspace builds'
    command: 'cargo check --workspace --all-targets'

  - id: tests-pass
    severity: blocking
    description: 'All workspace tests pass'
    command: 'cargo test --workspace'

  - id: fmt-clippy-deny
    severity: blocking
    description: 'rustfmt clean, clippy (pedantic, curated allow-list) with no warnings, cargo deny clean'
    command: 'cargo fmt --all -- --check && cargo clippy --workspace --all-targets -- -D warnings && cargo deny check'

  - id: core-wasm
    severity: blocking
    description: 'I-10: decide-core does no I/O and builds on wasm32-unknown-unknown'
    command: 'cargo build -p decide-core --target wasm32-unknown-unknown'

  - id: forbid-unsafe-in-safe-crates
    severity: blocking
    description: '#![forbid(unsafe_code)] in decide-core, -schema, -tripwire, -calibrate, -policy, -audit'
    check: "grep -rn 'unsafe' crates/decide-core crates/decide-schema crates/decide-tripwire crates/decide-calibrate crates/decide-policy crates/decide-audit --include='*.rs' | grep -v 'forbid(unsafe_code)'"

  - id: unsafe-has-safety-comment
    severity: blocking
    description: 'unsafe in backend crates (encoder, llm, guard, mcp) must carry a // SAFETY: comment'
    note: 'Manual review of every unsafe block'

  - id: no-unwrap-expect-in-libs
    severity: blocking
    description: 'No unwrap()/expect() in library code outside tests (thiserror in libs, anyhow only in bins/)'
    note: 'Enforced by clippy unwrap_used / expect_used lints in [workspace.lints]'

  - id: exact-pins
    severity: blocking
    description: 'All [workspace.dependencies] exact-pinned (=x.y.z); candle-vllm pinned by git rev'
    check: "grep -nE '^[a-zA-Z0-9_-]+ *= *\\{?[^#]*version *= *\"[^=]' Cargo.toml"

  - id: no-rmcp-types-in-public-api
    severity: blocking
    description: 'decide-mcp must not leak rmcp types through its public API'
    note: 'Manual review; cargo public-api diff when available'

  - id: invariant-tripwire-first
    severity: blocking
    description: 'I-1: tripwires run first; a property test proves no backend output flips a tripwire Escalate'

  - id: invariant-no-calibration-no-act
    severity: blocking
    description: 'I-2: no valid, signed, in-date calibration artifact means never Act'

  - id: invariant-recall-floors-are-inputs
    severity: blocking
    description: 'I-3: decide-calibrate exposes no "target automation" parameter; floors are never lowered'

  - id: invariant-finite-sample
    severity: blocking
    description: 'I-4: a class with floor 1-alpha needs at least ceil(1/alpha)-1 positives, else it forces Review; artifacts carry n_pos'

  - id: invariant-locality
    severity: blocking
    description: 'I-5: DeviceOnly never reaches a remote backend; remote feature compiled out of decide-lite'

  - id: invariant-clinical-proposes
    severity: blocking
    description: 'I-6: clinical specs propose only'
    command: 'cargo xtask spec-lint'

  - id: invariant-audit-everything
    severity: blocking
    description: 'I-7: every decision audited, including tripwire exits and errors; Decider::decide returns (Decision, AuditRecord)'

  - id: invariant-medgemma-extractor-only
    severity: blocking
    description: 'I-8: HAI-DEF models only role = "extractor" in models/registry.toml'

  - id: invariant-readonly-mcp
    severity: blocking
    description: 'I-9: decision MCP tools read-only; only calibrate_fit mutates and it is admin-gated'
    command: 'cargo xtask conformance'

  - id: no-real-labels-in-repo
    severity: blocking
    description: 'calibration/ holds schemas and fixtures only; never real labels, PHI, or session state text'
    note: 'Manual review of any file added under calibration/, evals/, specs/'

  - id: no-state-text-in-logs
    severity: blocking
    description: 'tracing never logs state text; use redacted hashes (fields: spec, layer, latency_us, outcome, audit_id)'

  - id: never-fail-open
    severity: blocking
    description: 'Backend outage or error degrades to Review, never Act'

  - id: no-hardcoded-secrets
    severity: blocking
    description: 'No hardcoded keys, tokens, or signing keys (Ed25519 rule-pack/calibration keys stay out of the repo)'
    check: "grep -rnE 'sk-[A-Za-z0-9]{10,}|BEGIN (ED25519|OPENSSH|PRIVATE) KEY|api_key *= *\"' crates bins xtask"
```

---

## Warning Constraints (acknowledge before archiving)

```yaml
  - id: host-boundary-needs-openspec
    severity: warning
    description: 'Changes crossing a host boundary (The Boss, UAR, KnowMe, prior-auth) need an openspec change proposal'

  - id: adr-for-design-decisions
    severity: warning
    description: 'Decisions in the PLAYBOOK §17 backlog (or new ones) are recorded in docs/adr/'

  - id: wire-snapshots-updated
    severity: warning
    description: 'insta snapshots for /v1/systemone, MCP tool schemas, and spec JSON Schema are reviewed, not blindly accepted'

  - id: perf-budget
    severity: warning
    description: 'criterion p95 within PLAYBOOK §11 budgets; >15% regression fails CI; budget changes need an ADR'

  - id: fuzz-parsers
    severity: warning
    description: 'New parsers/decoders (rule pack, spec, systemone) get a cargo-fuzz target'

  - id: clinical-gates
    severity: warning
    description: 'Clinical specs stay in shadow until PLAYBOOK §15 gates are signed'

  - id: sessions-privacy
    severity: warning
    description: 'docs/sessions/ holds personal transcripts; do not quote in public artifacts; flag before external sharing'

  - id: no-stub-comments
    severity: warning
    description: 'No TODO/FIXME/STUB/HACK in committed code'
    check: "grep -rn 'TODO\\|FIXME\\|STUB\\|HACK' crates bins xtask --include='*.rs'"
```

---

## Path ownership

- `.agents/`, `.claude/`, `.opencode/`, `.kimi-code/` and `openspec/` are **tracked, repo-owned**
  tool configuration (OpenSpec skills and commands). They are not disposable tool state.
- `evals/reports/` is generated and gitignored, except the summaries.
- `dist/` is release output.
- `docs/sessions/` is tracked but private (see the `sessions-privacy` warning above).

---

## Workflow Triggers

```yaml
workflow_triggers:
  - event: on_iteration_complete
    action:
      type: command
      target: 'cargo check --workspace --all-targets'

  - event: on_change_complete
    action:
      type: command
      target: 'cargo test --workspace && cargo build -p decide-core --target wasm32-unknown-unknown'
```
