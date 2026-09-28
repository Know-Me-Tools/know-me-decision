@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

**Pre-implementation.** The repo holds only design, research and the build playbook — no Cargo workspace, no code, no build/test commands yet. Code starts at milestone **M0** in `docs/PLAYBOOK.md` §6. When asked to build something, check which milestone it belongs to and follow that milestone's tasks and exit gates. The playbook is the source of truth; where this file and the playbook disagree, the playbook wins (and this file should be updated).

## What this is

`know-me-decision` is KnowMe's self-hosted decision layer: a Rust crate family plus the `knowme-decide` binary (MCP stdio server, streamable-HTTP sidecar using a `READY:{port}` handshake, and CLI). It replaces hosted "System One" APIs (TypeSafe's Jev) with open-weight models running on device or on clinic hardware. It answers typed questions — **Choice** (≤255 options), **Score** (ordinal), **Noul** (probability a statement is true) — and returns an `Outcome`: `Act`, `Review { set }`, or `Escalate`.

Consumers: The Boss (sidecar as `@prometheus/decide`), Universal Agent Runtime (linked crate), KnowMe desktop/mobile (via `gen_ui_decide`), Prior Authorization Workbench (proposal-only `aso-decide` kernel), and any MCP client via the `knowme-decisions` plugin marketplace. First products: CounselMe (specs CM-01…CM-12) and prior-auth (PA-01…PA-11).

## Architecture (planned — PLAYBOOK §3, §5)

Every decision flows through a fixed cascade in `decide-policy::Decider::decide`:

1. **Tripwires** (`decide-tripwire`) — deterministic, signed rule packs. A hit always → `Escalate`.
2. **Locality guard** — `DeviceOnly` specs never reach remote backends.
3. **Backend cascade** — `decide-encoder` (ModernBERT/mmBERT via candle, ONNX fallback) → `decide-llm` (Jev-style logit reader, LitJev on Qwen3.8 via the GQAdonis candle-vllm fork) → `decide-guard` (Qwen3Guard, Granite Guardian). A layer exits early when its calibrated set is a single option ≥ τ.
4. **Calibration** (`decide-calibrate`) — temperature scaling + Mondrian split conformal, fitted on each deployment's human overrides.
5. **Outcome mapping** (in order): tripwire hit → `Escalate`; no valid calibration → `Review`; set contains an `escalate`-tagged option → `Escalate`; set size 1 and not `clinical` (or option tagged `non_clinical_effect`) → `Act`; else `Review`.
6. **Audit append** (`decide-audit`) — hash-chained log; overrides recorded there become the next calibration's labels.

Other crates: `decide-core` (types/traits, no I/O, wasm32-safe), `decide-schema` (round-trips TypeSafe `/v1/systemone` wire format, snapshot-tested with `insta`), `decide-mcp` (rmcp server). The normative type sketches (`DecisionSpec`, `Outcome`, `Decision`, `DecisionBackend`, `Calibrator`, `Tripwire`, `AuditSink`) are in PLAYBOOK §5 — use those field names; they are the wire names.

Planned top-level dirs: `crates/`, `bins/knowme-decide/`, `specs/` (versioned DecisionSpec JSON, source of truth), `rulepacks/`, `models/registry.toml`, `calibration/` (schemas and fixtures only — **never real labels**), `evals/`, `training/` (Python via `uv`), `marketplace/`, `xtask/` (`spec-lint`, `sign`, `release`, `conformance`), `openspec/`, `docs/adr/`.

### Feature profiles

| Profile | Features | Consumers |
|---|---|---|
| `decide-lite` | core, schema, tripwire, calibrate, policy, audit, `encoder-onnx` | KnowMe mobile, UAR `embedded-mobile` |
| `decide-desktop` | lite + `encoder-candle`, `llm-local`, `guard`, `mcp` | The Boss sidecar, KnowMe desktop, UAR `desktop-full` |
| `decide-server` | desktop + `llm-remote` (non-PHI only), `mcp-http` | UAR `server-full`, prior-auth on-prem |

Features must be additive. The `remote` feature must be compiled out of `decide-lite`.

## Invariants (PLAYBOOK §2) — enforced in code and tests

Weakening any of these requires an ADR and sign-off from every affected host's product owner.

- **I-1** Tripwires run first; no backend output can flip a tripwire `Escalate` (property test).
- **I-2** No signed, in-date calibration artifact → never `Act`.
- **I-3** Recall floors are spec inputs; automation rate is a reported output. `decide-calibrate` has no "target automation" parameter.
- **I-4** A class with recall floor 1−α needs ≥ ⌈1/α⌉−1 calibration positives, else it forces `Review`. Artifacts carry `n_pos` per class.
- **I-5** Locality never escalates on its own; moving up requires a host-supplied grant.
- **I-6** `clinical` specs propose only; `Act` only for non-clinical side effects. Checked by `xtask spec-lint`.
- **I-7** Every decision is audited, including tripwire exits and errors. `Decider::decide` returns `(Decision, AuditRecord)`; an audit sink is required at build time.
- **I-8** MedGemma (HAI-DEF license) may only be registered as `role = "extractor"`.
- **I-9** Decision MCP tools are read-only; only `calibrate_fit` mutates, and it is admin-gated.
- **I-10** `decide-core` does no I/O and builds on `wasm32-unknown-unknown` (CI job `core-wasm`).

Hosts act on `outcome`, never on `value` (`value` is argmax, informational only). Backend outages degrade to `Review` — never fail open.

## Toolchain and conventions (PLAYBOOK §4)

- Rust **1.97.1**, edition 2024 (matches The Boss's integration build).
- Exact pins (`=x.y.z`) in `[workspace.dependencies]`. Targets: rmcp `=3.4.x`, candle `0.11`, candle-vllm pinned by git rev on the GQAdonis fork. `decide-mcp` must not leak rmcp types through its public API.
- `#![forbid(unsafe_code)]` in core, schema, tripwire, calibrate, policy, audit. `unsafe` only in backend crates with a `// SAFETY:` comment.
- Clippy `pedantic` with a curated allow-list; `cargo deny check`.
- `thiserror` in libraries; `anyhow` only in `bins/`. No `unwrap`/`expect` outside tests.
- `tracing` spans per cascade layer with fields `spec`, `layer`, `latency_us`, `outcome`, `audit_id`. **Never log state text** — log redacted hashes.
- Testing (PLAYBOOK §10): `proptest`, `insta`, `cargo-fuzz` for parsers/decoders, `criterion` benches (CI fails on >15% p95 regression vs. §11 budgets), MCP conformance, and a `tests/hosts/` harness that spawns the sidecar the way The Boss does.

## Workflow

- **OpenSpec** is initialized (`openspec/`, `/opsx:*` commands). Use change proposals for anything that crosses a host boundary.
- **ADRs** go in `docs/adr/`; the backlog (ADR-000…011) is PLAYBOOK §17.
- Clinical specs can't move past `shadow` until the PLAYBOOK §15 gates are signed.

## Docs

Reading order (from `docs/README.md`): `research/jev-escalation-viability.md` → `research/open-decision-models-2026-09.md` → `architecture/knowme-decision-layer.html` (per-host integration seams are in its §07) → `PLAYBOOK.md`.

`docs/sessions/` holds personal conversation transcripts. Don't quote from it in public-facing artifacts, and flag it before this repo is shared outside KnowMe.

<!-- uiux-routing:start v1 -->
## UI/UX routing
UI, styles, tokens, motion or copy → `prometheus-ui-ux`. Read `.agents/UI_UX_PROTOCOL.md` or its bundled default; preserve design authority.
All code: detect `.agent-team/project-routing.json` and real team manifests. Preserve selection; adopt a sole team; ask if ambiguous. Use relevant roles, disclosing sequential fallback.
Backend work loads no UI guidance. Review respects user-only skills and the completed-phase boundary.
<!-- uiux-routing:end -->
