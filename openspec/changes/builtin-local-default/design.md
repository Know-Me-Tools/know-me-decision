# Design

## Context

See `proposal.md` for motivation and `specs/builtin-local-default/spec.md` for observable requirements. This repository is pre-implementation. The common proxy contracts remain in the pending `decision-proxy-contract-corrections` change and PLAYBOOK §5; this change selects a bundled local backend rather than replacing those safety boundaries.

Julia 1 is a 144.3M-parameter Apache-2.0 decision model with an ONNX export and Choice, Score and Noul support. Its published native candidate range is 2–20. An architectural 8,192-token context limit is not evidence of equivalent quality across that entire range. The published FP32 checkpoint occupies about 550.5 MiB, excluding tokenizer, runtime and working memory. Sources: [model card](https://huggingface.co/SupersonicLabs/Julia-1), [author's deployment measurements](https://supersoniclabs.ia.br/julia-1/). Published Android measurements use a Python-driven ONNX path and do not certify native Android or iOS integration; the author's XNNPACK issue also requires a real graph/provider check.

## Goals / Non-Goals

**Goals:** one Rust-facing local inference contract, install-contained compatible assets, no startup configuration, measured support on Windows/macOS/Linux/Android/iOS, and optional TypeSafe Jev that cannot silently replace the local default.

**Non-goals:** a pure-Rust inference dependency stack, CLM implementation, browser-default certification, bundling optional Qwen/Laya servers, training Julia, accepting any dependency version or model hash without verification, or claiming clinical acceptance from model availability.

## Decisions

1. **Embed native ONNX Runtime behind the proposed `julia-onnx` Rust adapter.** The runtime is C/C++; Rust owns the adapter and KnowMe policy integration. This keeps production inference in process without Python or a separate server. A pure-Rust port is deferred because it adds numerical/runtime validation work without establishing better task quality. Select the binding, runtime version, target architecture/OS minimum and CPU execution configuration during M0; exact pins require the architecture owner's normal manual process. Additional execution providers must pass the actual model graph and parity tests before enablement.
2. **Bundle a compatible asset set in application installations.** Weights, tokenizer/configuration, native runtime, licenses and default settings are coupled through a trusted manifest with actual verified identities. A cache download is not an acceptable first-run prerequisite. Missing/corrupt assets produce an explicit unavailable/Review path rather than an implicit network fetch. Asset verification traces to the real installed-model trust boundary. Release packaging carries updates; any compatible rollback restores the model/runtime/tokenizer/calibration set together.
3. **Keep pure kernels separate from runtime and network I/O.** Native model loading belongs in the backend/host boundary, not `decide-core`. `decide-lite` contains no remote inference dependency. Optional Jev on mobile is an explicit host capability outside the local kernel; this does not weaken DeviceOnly or the browser WASM contract.
4. **Enroll Jev without changing routing defaults.** Server/developer deployments can use the existing `JEV_API_KEY` reference in a gitignored environment file; desktop/mobile use the host's protected credential storage. No provider key is embedded in app assets or logged. Credential availability, service eligibility, trusted destination grants and request selection are distinct. A valid key adds a selectable backend; absent/invalid/revoked credentials do not prevent local startup. Hosted failure cannot widen permissions.
5. **Enforce capabilities before scoring.** Use the deployed tokenizer and full formatted request for limit checks. The 2–20 candidate range and tested token budget are part of the backend capability record, not a change to the framework's ≤255 Choice limit. Overflow receives explicit Review/refusal; no silent truncation, invented mass or hierarchy. A selected Jev route still needs all hosted and scoring permissions. Native primitive conversion preserves fractional expected Score and independently evaluated Noul probabilities.
6. **Preserve safety gates for a default model.** Default settings enable model availability, not arbitrary-spec Act. Existing tripwires, required guards, valid signed pipeline-matching calibration and host audit persistence still control outcomes. A bundled model can return Review when calibration or required guard evidence is absent. Quantization is a distinct deployment identity needing parity, task-quality, calibration and resource evidence; it is not an automatic substitute for the larger FP32 artifact.

## Risks / Trade-offs

- **Large mobile install and resident memory** → measure installed/downloaded package sizes, peak RSS, cold/warm latency and lifecycle behavior on real release devices; host owners set budgets before testing. Do not replace a failed budget with first-run downloading while retaining the zero-setup claim.
- **An architectural context limit exceeds tested task quality** → evaluate long inputs and evidence retention, choose a validated limit no greater than the architecture permits, and reject formatted overflow. Retrieval/summarization is separately evaluated work.
- **Runtime package availability is mistaken for model compatibility** → require native per-platform parity and production host-path receipts; no iOS claim from Android or Python evidence.
- **A valid Jev key is mistaken for egress permission** → keep explicit selection and trusted grants separate, including fallback/shadow paths; unknown, PHI and DeviceOnly input stays local.
- **Model updates invalidate calibration** → bind the real weights/tokenizer/runtime/scoring pipeline identity to the artifact; without a valid match withhold Act.

## Migration Plan

No existing runtime is being migrated. M0 proves packaging, graph execution and feasibility and records predeclared device budgets. M1 freezes capabilities, errors, secret enrollment and host contracts. M1a exercises actual Julia inference and, with an authorized TypeSafe key, the real Jev route through native/HTTP/MCP surfaces; local evidence remains independently obtainable and unavailable Jev access remains an explicit open gate. M4 completes native platform packaging, parity, performance and lifecycle acceptance before the feature is labeled shipping. Later provider/router/browser milestones remain separate.

Existing IPFS snapshots remain historical. Updating these local plans does not republish the architecture or certify any implementation. Clinical gates remain open and unsigned.
