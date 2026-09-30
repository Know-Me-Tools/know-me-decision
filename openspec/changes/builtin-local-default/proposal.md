# Proposal

## Why

KnowMe needs useful local decision inference immediately after installation on desktop and mobile, without asking users to operate a model server or configure credentials. Select Julia 1 through a Rust-facing embedded ONNX Runtime backend as the planned bundled default, with TypeSafe Jev as an optional key-enabled remote provider.

## What Changes

- Bundle the compatible Julia 1 ONNX weights, tokenizer, native runtime, trusted asset manifest and default configuration with Windows, macOS, Linux, Android and iOS installations. First launch works offline without Python, a model download, an inference server, a key or manual configuration.
- Keep local inference as the default when a TypeSafe key is added. Jev becomes available only for an explicitly selected eligible route with trusted grants for approved non-sensitive data; unknown, PHI and DeviceOnly input stays local.
- Preserve Choice, fractional expected Score and independent Noul semantics, required guards, pipeline-matching calibration and host audit requirements. Zero setup does not authorize arbitrary specifications to Act.
- Make Julia's native 2–20 option capability and validated input limits explicit. Unsupported calls return Review/refusal without fabricated scores or silent hierarchy; a separately eligible remote choice is possible only when configured and authorized.
- Add native parity, offline installation, resource-budget and host-path acceptance gates before claiming desktop/mobile availability. Keep optional Laya/Qwen work separate and CLM implementation deferred.

## Capabilities

### New Capabilities

- `builtin-local-default`: bundled local inference, optional Jev enrollment, capability boundaries and native platform release evidence.

### Modified Capabilities

None. No accepted specifications exist under `openspec/specs/`. The pending `decision-proxy-contract-corrections` change remains the common safety-contract dependency.

## Impact

Planned backend, package, host configuration and platform integration contracts change. The pure Rust core remains free of I/O and native runtime dependencies; ONNX Runtime is a native C/C++ library behind a Rust-facing adapter. `decide-lite` remains free of remote inference dependencies. Any optional mobile Jev integration belongs to a host adapter outside the local kernel. Architecture owners still select exact bindings/runtime versions and maintain manual pins.

## Non-goals

No runtime implementation, model download, new dependency pin, CLM port, model training, browser default, publication, provider provisioning or clinical promotion. Quantized variants are separately gated; upstream measurements do not certify our native apps.

The uncomfortable constraint is package and memory size: the published FP32 weights are about 550.5 MiB before tokenizer, runtime and activations. A zero-setup mobile default is a product commitment contingent on real device budgets and quality evidence, not on the model's small parameter count alone.
