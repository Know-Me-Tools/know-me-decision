# Decision Log — m0-bootstrap

> Operator answers to the assessment's open questions, recorded before planning.
> Source: operator reply on 2026-09-30, following assessment.md "OPEN QUESTIONS FOR PLAN".

## D-001 · pin rmcp =3.5.0                                   [assess→plan · 2026-09-30]

**TL;DR:** Use rmcp `=3.5.0` (MCP 2026-07-28 plus 2025-11-25) as the workspace pin; `.claude/rules/rust.md` (`=3.4.x`) is stale.

**Why:** Matches PLAYBOOK §4 as revised on 2026-09-28 and the latest release. UAR (`=3.1.2`) and prior-auth (`3.4.0`) get bump PRs in M9/M10; `decide-mcp` must not leak rmcp types, so hosts on other minors can still link `decide-policy`.

**Alternatives:** `=3.4.x` (matches prior-auth, but predates MCP 2026-07-28) · per-host pins (rejected: one workspace pin).

**Learn more:** PLAYBOOK §4; ADR-002 records it; the pin is entered in `versions.toml` by hand (agents are denied `Edit(versions.toml)`).

---

## D-002 · no Windows CUDA host; Apple Silicon and MLX instead   [assess→plan · 2026-09-30]

**TL;DR:** Spike A's Windows CUDA half is BLOCKED. Run the Mac half on the M1 Max (64 GiB), and use MLX to host models locally.

**Why:** The operator has no Windows CUDA machine. The M1 Max can run Kev-4B and laya-rust, and MLX gives a native Metal path, so this pulls Spike D (laya-mlx vs laya-rust) forward as the main local-hosting measurement.

**Alternatives:** Rent a cloud CUDA instance (not chosen; revisit before M7, whose budgets include Windows CUDA) · drop the Windows budgets from PLAYBOOK §11 (rejected: that needs an ADR, not a spike result).

**Learn more:** PLAYBOOK §11 performance budgets; the Spike A report must list the Windows CUDA row as `BLOCKED: no hardware`, never as an estimate.

---

## D-003 · TypeSafe access is available for Spike E            [assess→plan · 2026-09-30]

**TL;DR:** The operator has a TypeSafe API key, so Spike E's hosted half and the M1a hosted gate can run on non-sensitive data.

**Why:** Spike E must first verify permitted service use and score capabilities on an authorized endpoint (PLAYBOOK M0). The key is supplied through the environment only; agents never read, store or log its value.

**Alternatives:** Record the hosted half as blocked (no longer needed).

**Learn more:** PLAYBOOK M0 Spike E and M1a; I-11 (no hosted data without a trusted grant). Only synthetic or public eval data is sent to Jev.

---

## D-004 · ADR-012 for the native ONNX Runtime                  [assess→plan · 2026-09-30]

**TL;DR:** Record the Spike F decision (embedded native ONNX Runtime with C/C++ dependencies for the built-in Julia 1 default) in its own ADR-012 during M0.

**Why:** It changes the `forbid(unsafe_code)` / `deny.toml` / licensing / packaging posture, and it is a prerequisite for M4 and M1a. ADR-004 covers only the LLM backend.

**Alternatives:** Fold it into ADR-004 (rejected: different layer and decision owners) · decide it in M4 (rejected: M1a needs real embedded Julia inference first).

**Learn more:** `openspec/changes/builtin-local-default`; `docs/research/decision-proxy-options-2026-09.md`.

---

## D-005 · accept the 2026-09-28 design as the M0 baseline      [execute · 2026-09-30]

**TL;DR:** The operator accepted all of it: the decision proxy (PLAYBOOK §5a), I-11..I-13, M1a, Spikes D/E/F with Spike F as the M0 priority, and the two OpenSpec proposals.

**Why:** The M0 plan already builds on this design, and both proposals pass `openspec validate --strict`. Committing it removes the assessment's top risk (building on unreviewed, uncommitted design).

**Alternatives:** Accept without Spike F priority · accept docs, defer proposals · revise first. All were offered and not chosen.

**Learn more:** PLAYBOOK §2 (I-11..I-13), §5a, §6 M0/M1a. Host-owner acceptance of `decision-proxy-contract-corrections` (task 1.1) remains open outside this phase.
