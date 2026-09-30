# decisions

Append-only. Dated entries. Mark superseded entries; do not delete them.

## 2026-09-28
- Initialized by prometheus-context-bootstrap.

## 2026-09-28 — decision proxy (docs)
- Added the decision proxy to docs/PLAYBOOK.md §5a. It is an Axum server with a Jev-compatible /v1/systemone, native /v1/decide, SSE, and MCP at /mcp. Rationale: a single API over every backend (Jev, Laya MLX/candle/ONNX/browser, local Qwen via candle-vllm, remote Qwen on the token plan).
- Routing is two-stage: a sensitivity gate then a backend router. The model can only narrow locality (I-11, I-12). Rationale: a PHI false negative to a hosted backend with no BAA is a breach.
- Proposed pins: rmcp =3.5.0 (MCP 2026-07-28 + 2025-11-25), axum =0.8.9, candle-core =0.11.0, llguidance =1.8.0, mlx-rs =0.32.0 (optional). NOT yet recorded in versions.toml, which is hand-edited only.
- Verified with live synthetic calls: Jev returns jev-1.13.0 in 236 ms; the Qwen token plan (qwen3.8-max) returns top_logprobs 5 in 1.7 s.

## 2026-09-28 — proxy contract corrections (Spec)
- Supersedes the production token-plan suggestion in the earlier decision-proxy entry; that entry and its recorded probes remain historical evidence. Alibaba's documented subscription restrictions require a permitted general API or explicit authorization for custom backend use. Credentials and successful probes are not entitlement.
- Trusted host grants and provenance establish eligible destinations; classifiers only restrict them. Shared policy applies to HTTP, MCP, linked and browser consumers and every fallback, shadow or synchronization dispatch.
- No invented probability mass for missing candidates. Calibration binds to the scoring/deployment/routing pipeline and representative real labels. Primitive answers remain separate from action authority.
- Required guard Review prevents Act, but valid calibrated escalation and mandatory escalation take precedence. The trusted host must commit audit before Act; urgent Escalate exposes audit failure without a fabricated receipt. Human overrides use authenticated host commands outside model-visible decision MCP tools.
- M1a proves the first real local-plus-approved-Jev path immediately after M0/M1. MCP conformance, browser quantization, provider eligibility and clinical promotion remain acceptance gates, not delivered capabilities. Cross-host changes are proposed in openspec/changes/decision-proxy-contract-corrections/.

## 2026-09-28 — selected built-in Julia ONNX baseline
- User selected documentation of Rust + embedded native ONNX Runtime + bundled Julia 1 as the desktop/mobile default; CLM integration and Rust port remain deferred. The runtime contains native C/C++ dependencies; only the core is pure Rust.
- A completed installation must contain verified model/tokenizer/runtime/default assets before offline first launch. Optional Jev credentials do not change the local default or authorize egress. Julia's 2–20-candidate limits, calibration, guards and host audit remain binding.
- OpenSpec `builtin-local-default` records the cross-host proposal. M0 Spike F and M4 require native packaging/parity/resource receipts. M1a local and hosted gates are separate: absent authorized TypeSafe access leaves Jev disabled without blocking independently validated local acceptance.
- Rationale: provide useful supported local requests without model-server or credential setup while retaining explicit capability and action boundaries. Main unresolved cost: roughly 550.5 MiB FP32 weights plus runtime/tokenizer/memory; native support and quantization are not certified.

## 2026-09-30 — m0-bootstrap planning answers (operator)
- rmcp pinned at =3.5.0 (ADR-002; versions.toml entry by hand). .claude/rules/rust.md =3.4.x is stale.
- No Windows CUDA host: Spike A Windows half BLOCKED; local hosting on the M1 Max (64 GiB) via MLX.
- TypeSafe API key available: Spike E hosted half and the M1a hosted gate run on non-sensitive data; key via environment only.
- ADR-012 records the embedded native ONNX Runtime decision for the built-in Julia 1 default.
- Detail: .kbd-orchestrator/phases/m0-bootstrap/decision-log.md D-001..D-004.
