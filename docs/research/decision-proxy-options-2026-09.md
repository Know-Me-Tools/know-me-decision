# Decision proxy: backends, routing and transports

*28 September 2026. This is the analysis behind the decision proxy added to [`../PLAYBOOK.md`](../PLAYBOOK.md) (§5a, M6–M7b, M9b). It covers one API in front of hosted Jev, Laya (candle, MLX, ONNX, browser), Qwen (local candle-vllm and an authorized remote API) and any other Jev-compatible server, with a decision model ranking policy-eligible backends. The playbook is normative; these are proposed integration requirements, not implementation certification.*

## Built-in baseline: Julia 1 through Rust and ONNX Runtime

**Selected implementation direction, pending acceptance:** ship `julia-onnx` as the default on Windows, macOS, Linux, Android and iOS. Rust exposes the common decision API and uses an embedded native ONNX Runtime through a binding such as `ort`; ONNX Runtime is a native C/C++ dependency, so the complete stack is not pure Rust. `decide-core` stays free of I/O. Model loading, native runtime integration, secrets and audit writes belong to the trusted host. Mobile uses an in-process host library/FFI, without a Python worker or user-run inference server.

A completed installation includes the verified Julia graph and weights, tokenizer, native runtime, manifest and baseline settings before first launch. It must answer supported local requests offline without a key, configuration file, model selection or first-run download. Install-managed asset delivery must finish before reporting ready. Missing or invalid Jev credentials cannot block local startup. Additional Laya, Qwen, Kev and browser deployments are optional profiles; CLM integration and its Rust port are deferred.

| Situation | Required baseline behavior |
|---|---|
| No configuration or credentials | Select local `julia-onnx`; no outbound inference |
| TypeSafe key present | Jev becomes available only after validation; local remains the default |
| Explicit Jev selection or authorized routing policy | Also require trusted provenance and destination permission; a key alone grants neither |
| PHI, unknown provenance or `DeviceOnly` | Never dispatch to hosted Jev, including fallback and shadow traffic |
| Missing calibration or a required guard | Preserve `Review`/`Escalate`; an answer is not permission to act |
| Unsupported input or model unavailable | Return the native conservative outcome/error contract; do not silently use a remote provider |

`JEV_API_KEY` remains the server/sidecar secret reference. Mobile secrets belong in the host secure store, never a shared key bundled into the app. `decide-lite` still compiles out remote access; any optional mobile Jev adapter lives in a separate trusted host network boundary.

### Capabilities and the uncomfortable tradeoff

Julia provides Choice over **2–20 candidates per call**, fractional ordinal Score and independent Noul probabilities. Preserve option descriptions/order, complete distributions and primitive-specific semantics. The framework's Choice ceiling of 255 is not a Julia capability claim. More than 20 options must produce unsupported/`Review` under the native contract, with escalation precedence preserved; a hierarchy requires its own evaluated and calibrated pipeline and cannot silently manufacture a global distribution.

The [Julia model card](https://huggingface.co/SupersonicLabs/Julia-1) reports 144.3M parameters, Apache-2.0 licensing and **550.5 MiB FP32 weights**, before tokenizer and working memory. An [official ONNX export](https://huggingface.co/SupersonicLabs/Julia-1-ONNX) exists. This is a substantial mobile asset, not a tiny library. Quantization is a later optimization gated by operator/logit parity, held-out quality and calibration; no quantized baseline is certified here. The 8,192-token runtime capacity has smoke-test evidence, while earlier accuracy evaluation used 1,024 tokens. Enforce the selected artifact's combined-input and per-field limits; reject overflow instead of silent truncation.

[Published measurements](https://supersoniclabs.ia.br/julia-1/) include an Android Python-driven ONNX benchmark. They do not certify a native Rust app or iOS. That report excludes XNNPACK after a Reshape correctness failure; retain that exclusion until the deployed graph/provider passes parity. ONNX Runtime's [mobile deployment documentation](https://onnxruntime.ai/docs/tutorials/mobile/) establishes runtime packaging options, not Julia compatibility or measured device budgets.

M0 Spike F must establish encoding, graph/operator compatibility, memory and native packaging feasibility. M1a proves Julia plus explicitly permitted Jev through the real API/MCP path. M4 completes acceptance on all five native targets: fresh installation offline, cold/warm latency, peak RSS and installed size, Choice/Score/Noul parity, invalid and overlength inputs, resource failure, audit/guard behavior, credentials and egress. Record actual device/runtime/artifact identities and measured budgets. Until those gates pass, “built in” describes the release requirement, not shipped capability. No starter calibration artifact may be invented to enable `Act` on arbitrary specs.

The cross-host proposal is `openspec/changes/builtin-local-default/proposal.md`; the playbook remains normative.

## 1. What was checked, and how

The synthetic probe results below are the original author’s recorded observations, not repeated measurements. They establish connectivity and observed response shape, not usage entitlement, scoring completeness, calibration, or production readiness.

| Item | Method | Result |
|---|---|---|
| TypeSafe Jev API | Read docs.typesafe.ai/api, then one synthetic call with `JEV_API_KEY` from `.env` | `POST https://api.typesafe.ai/v1/systemone`, `Authorization: Bearer`. Returned `model: "jev-1.13.0"` in **236 ms**. Choice answers carry `choice`, `confidence` and `probabilities`; Noul carries `noul`; `usage` is included. The docs mention no streaming or SSE |
| Qwen token plan | One synthetic call with `QWEN_TOKEN_PLAN_*` from `.env` | OpenAI-compatible endpoint on Alibaba Cloud Model Studio (`token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`), model `qwen3.8-max`. **Returned `logprobs` with `top_logprobs: 5`**. One-token letter answer in **1.69 s**. Historical connectivity only; this subscription is not authorized for an application backend under the documented restrictions (see §4) |
| Laya MLX | Read the Medium article (PDF), the `mizorewww/laya-mlx` repo and the upstream `NandhaKishorM/laya` repo | Details in §3 |
| "287 open-source Jev projects" Reddit review | Original WebFetch attempt blocked; subsequent direct review succeeded | The original author used jev001.org (snapshot 21 Sep 2026, 27 curated projects). Follow-up review accessed the Reddit post and relevant primary repositories; see §5 |
| layaForWorkflows | Read the GitHub repo | Details in §6 |
| rmcp | crates.io API | **3.5.0 released 28 Sep 2026** (3.4.1 on 23 Sep, 3.4.0 on 15 Sep). Supports MCP 2025-11-25 and **2026-07-28** |
| MCP spec | modelcontextprotocol.io | The current revision is **2026-07-28**: stateless, with protocol-level sessions and the `initialize` handshake removed. Details in §7 |
| Other crates | crates.io API | axum 0.8.9, candle-core 0.11.0, mlx-rs 0.32.0, llguidance 1.8.0 |

## 2. The shape of the answer

Build one server, `knowme-decide serve`, on Axum 0.8.9. It exposes three surfaces over the same backend registry:

1. **A Jev-compatible API.** `POST /v1/systemone` targets TypeSafe's wire format, subject to conformance tests. Plain Jev responses are advisory and restricted to approved nonclinical uses. Clinical callers must use the native outcome contract. If a required `Review` or `Escalate` cannot be represented safely to a compatibility client, refuse the request rather than return an ordinary successful answer that could imply permission to act.
2. **A native API.** `POST /v1/decide` accepts a DecisionSpec and returns per-question primitive-specific answers and outcomes (`Act`/`Review`/`Escalate`), calibration references and explicit audit status. A committed audit includes a real receipt; failure has no invented audit ID and cannot release Act (PLAYBOOK §5).
3. **MCP.** Streamable HTTP at `/mcp` and stdio from the same binary, through rmcp 3.5.0.

SSE progress is a proposed KnowMe extension on the decision APIs, separate from MCP streaming semantics. It may report redacted progress, but must not publish an actionable answer before all required guards, outcome mapping and trusted-host audit handling finish. Choice answers, fractional expected Scores, independent Noul probabilities and per-question batch outcomes require distinct native result types; the answer value does not authorize action.

The `model` field selects a backend explicitly. For example, `model: "jev-latest"` still reaches TypeSafe when policy allows it. The default model is bundled `julia-onnx`. Explicit `model: "auto"` is an optional configured routing mode requiring an authorized routing policy. Credential presence or local failure alone never changes that default.

## 3. Laya MLX (an independent runtime port)

- **What it is:** `mizorewww/laya-mlx`, from a developer in Shanghai. Apache-2.0. It is a native MLX runtime for the three **original Convai Laya checkpoints**, converted to FP16 or FP32 without re-quantization. The upstream weights, prompt format, temperature calibration and output schema are unchanged.
- **Checkpoints:**
  - `laya`: ModernBERT-large, 421M, 512 tokens.
  - `laya-multilingual`: mmBERT-base, 322M, 1,024 tokens.
  - `laya-typed-decisions`: 421M, 1,024 tokens.
- **Numbers** (the author's, measured on an M3 Max with 128 GB):
  - P50 latency: 13.42 ms (English) and 7.39 ms (multilingual).
  - Throughput: 146.8 and 395 decisions per second at batch 64.
  - Peak memory: 944 MiB and 688 MiB.
  - All three checkpoints matched the upstream answer on **63/63** validation questions in both FP32 and FP16.
- **Interface:** a Python package (`laya_mlx`: `load`, `predict`, `system_one`, `predict_shortlist`, and a language `Router`) plus a CLI. **There is no HTTP server.**
- **Requirements:** Apple Silicon, macOS 14+, Python 3.11+, MLX ≥ 0.32.2.
- **Where it fits:** a candidate local backend on Apple Silicon (The Boss and KnowMe desktop on Macs), not a new Chinese-trained checkpoint. The author’s M3 Max figures and upstream CUDA/T4 figures use different hardware and do not prove relative speed on our workloads. Verify the deployed runtime’s parity, latency, memory and calibration; local inference does not establish the locality of telemetry or synchronization.
- **How to integrate:**
  - **v1:** a managed worker process. `knowme-decide` spawns `python -m laya_mlx`, wrapped in a small JSON-lines stdio shim, from a pinned virtual environment, and supervises it the way The Boss supervises `uar-sidecar`. It is enabled only when `target_os = "macos"`, `target_arch = "aarch64"` and the MLX import succeeds at start-up.
  - **v2:** a native port on `mlx-rs` 0.32. This is only worth doing if the worker hop costs more than about 1 ms p50.
- **Supply chain:** the checkpoints are the upstream Convai weights converted by the author. Pin the repo commit and the checkpoint sha256 values in `models/registry.toml`, and verify parity against the upstream PyTorch output on our golden sets before enabling it. Provenance doesn't depend on the author's location, but it does have to be verified, like any third-party conversion.
- **Related:**
  - `mizorewww/laya-coreml`: the Core ML / Apple Neural Engine variant, a candidate for iOS.
  - `ahmadjehad2000/laya-codex`: an MCP integration for Laya-MLX, a useful reference.
  - `virajbhartiya/laya-vs-jev`: side-by-side local-vs-hosted metrics.

**Why it matters for the proxy:** the upstream Laya repo ships **`laya-serve`, a Jev-compatible `POST /v1/systemone` server** configured through `LAYA_DEVICE`, `LAYA_PRELOAD`, `LAYA_MODELS` and `LAYA_API_KEY`, plus an optional MCP server. So Laya on CUDA or CPU can plug in through the generic `systemone-http` adapter, the same way Jev and openjev-sglang do. Upstream also reports:

- laya-typed-decisions at 0.766 accuracy vs. Jev's published 0.727 on typed decisions.
- 7–8× lower latency than Jev.
- 45 of 51 languages usable on the multilingual checkpoint.
- **Jev ahead on choices with more than 20 options.**

## 4. Qwen: local and remote

### Local (candle-vllm instances)

- Instances are declared in `decide.toml`: URL, model (Qwen3.8-27B for the clinic tier, smaller Qwen3.5/3.8 sizes such as 0.8B, 4B and 9B for desktop), locality and concurrency.
- **Preferred path:** add a `POST /v1/systemone` route to the candle-vllm fork that does the LitJev logit read (prefill the state once, fork per question, read the option-token logits). This is the same DeltaNet state-fork work as Spike C.
- **Fallback candidate:** use the fork's OpenAI `/v1/chat/completions` with `logprobs`, one question per call, only after verifying complete candidate scoring. Exact Qwen3.8 checkpoint/runtime support and DeltaNet prefix-state fork correctness remain Spike C acceptance requirements, not demonstrated capabilities.

### Remote (authorized API; token-plan probe retained as historical evidence)

- The recorded endpoint returned at most five `top_logprobs`, including a non-option token (`**` in second place). Even a two- or five-option question is not guaranteed to expose all candidate scores.
- **Scoring contract:** require a verified interface that scores every candidate under the same documented scoring transformation. Single-letter aliases alone do not guarantee complete scoring. Do not renormalize an incomplete subset as a complete distribution or invent floor mass for missing options. Record incomplete scoring explicitly; such a backend is unsupported for native calibrated `Act` and must yield `Review` or fall back within the authorized destinations. Mandatory tripwire or guard escalation still takes precedence. Any advisory incomplete result must remain explicitly incomplete.
- A hierarchy or shortlist is a distinct pipeline: evaluate route losses and final outcomes end to end, and calibrate that pipeline separately. It is not a repair for missing candidate scores.
- The historical latency was about 1.7 s from Chicago to Singapore; this is one observation, not a service budget.
- **Usage entitlement:** Alibaba’s [documented restrictions](https://www.alibabacloud.com/help/en/model-studio/more-tools) exclude custom application backends and automated scripts from both Token Plan editions and Coding Plan. Use an appropriate API service or obtain explicit written provider authorization before enabling this integration. A successful request does not establish entitlement.
- **Data permissions:** a third-party endpoint is `Hosted`. Enable it only for destinations authorized by trusted tenant policy and provenance, with approved data handling and applicable contractual safeguards. No BAA was established by the probe; neither a model’s sensitivity label nor “non-PHI” alone establishes permission to disclose data.

### Environment

The original probe used `QWEN_TOKEN_PLAN_OPENAI_URL`, `QWEN_TOKEN_PLAN_API_KEY` and `QWEN_TOKEN_PLAN_MODEL` (then `qwen3.8-max`). These names document the observation, not an enabled production configuration. Credential presence alone must not enable a backend. Define the authorized API configuration only after entitlement, capabilities and data permissions are established; do not infer new environment keys here.

## 5. The "287 projects" review

The original WebFetch attempt was blocked and used the index below as a substitute. A subsequent direct review accessed the [Reddit post](https://www.reddit.com/r/LLMDevs/comments/1wko2e5/i_reviewed_287_opensource_jev_projects_here_are/) and relevant primary repositories. The list is useful for discovering integration patterns; its headline count is not a verified inventory or an endorsement of every entry.

Relevant follow-up references are [System One Connector](https://github.com/itsmostafa/system-one-connector) (the former `typesafe-mcp` URL redirects here; hosted Jev and self-hosted alternatives) and [jev-mcp](https://github.com/jkudish/jev-mcp) (tool and error-handling examples). Review these for reusable contracts; they do not supply KnowMe’s calibration or clinical acceptance evidence.

### Original supporting evidence from the jev001.org index

The index (27 curated projects, snapshot 21 Sep 2026) falls into five groups:

1. **Jev-compatible servers:**
   - `laya-serve`
   - `ekzhang/openjev-sglang` ("Jev-compatible API")
   - `jaredpalmer/kev`
   - `wfzyx/von`
   - `Heman10x-NGU/openJev-verdict-2.0`
   - `ikermoel/open-alternative-jev`
   - `intikhab49/open-jev-typed-decision-engine`
2. **Local runtimes:** `laya-mlx`, `laya-coreml`, and community Rust bindings for Laya.
3. **Calibration tooling:** `sutro-sh/jev-align` ("Calibrated AI Functions").
4. **Integrations:** `laya-codex` (MCP), `reticle` (web), `juspay/neurolink` (TypeScript multi-provider).
5. **Awesome lists:** `awesome-jev` and similar. Useful for discovery, not as dependencies.

### Is updating from that list relevant?

Yes, but not by adding dependencies. Three things come out of it:

1. **A backend class instead of per-project integrations.** Because so many projects speak `/v1/systemone`, the proxy gets one `systemone-http` adapter. Any compliant server (Laya, openjev-sglang, Kev, Von, a second `knowme-decide`) becomes a registry entry, not code. This is the main design change the ecosystem justifies.
2. **An intake process for candidates.** Every candidate goes through the same gate:
   - license check
   - wire-conformance check against the TypeSafe schema snapshot
   - our golden suites for accuracy, Brier and ECE
   - a latency budget

   Register only after those checks and verification of score completeness, deployment provenance and permitted use. No rejection rate for the list has been measured; registration also does not confer permission for calibrated automation.
3. **`jev-align`** is worth reading before M3 as a cross-check on calibration method. It isn't a dependency.

## 6. Browser options (layaForWorkflows and PGlite)

### layaForWorkflows (Apache-2.0)

- **What it is:** a DAG workflow engine that runs **entirely in the page**. ONNX Runtime Web runs a Laya-derived ModernBERT-large (`VishalMysore/layaForWebTrained`, 421M: int8 about 422 MB, int4 about 278 MB).
- **How it works:**
  - Weights are cached in Cache Storage.
  - All questions are answered in one pass, which enables threshold "what-if" replays.
  - Configured low-confidence branches can select escalation or review; when such a branch is absent, the demo can take a branch with a flag. KnowMe must instead preserve its required `Review`/`Escalate` outcome.
  - The demonstration simulates effects and can start from recorded answers. It is not proof of live model execution or trusted action authorization. Webhook publication is a separate outbound data operation.
- **Stated limits:**
  - int8 rounding.
  - Weak numeric comparison.
  - Yes/no probabilities compressed toward 0.5 by a calibration temperature of about 2.0.
  - It needs COOP/COEP headers, which it adds through a service worker on GitHub Pages.

### What this enables for us: a browser tier (M9b)

- **`decide-wasm`:** `decide-core`, `decide-schema`, `decide-tripwire`, `decide-calibrate` and `decide-policy` compiled to `wasm32-unknown-unknown` with `wasm-bindgen`. I-10 already requires core to build for wasm.
- **The encoder** runs in JavaScript through ONNX Runtime Web (WebGPU with a WASM fallback), using the Julia 1 WebGPU build or a Laya-for-web int4/int8 checkpoint. The browser gets its **own calibration artifact**, because I-2 binds calibration to the weights hash, and int4 and int8 weights have different hashes.
- **PGlite as a candidate browser host persistence adapter.** The trusted browser host commits audit records and stores labels; the decision kernel performs no I/O. Existing host synchronization is a potential integration, not automatic permission to export records or labels. Representative human evaluation must include sampled `Act`, `Review` and `Escalate` outcomes.
- **Inference locality and synchronization permissions are separate.** The default `DeviceOnly` profile keeps inference, audit and labels local and disables outbound synchronization/telemetry. Any authorized export needs an explicit data-class, destination and retention policy enforced by the host. A loopback sidecar requires explicit host authorization and authentication; verify its complete downstream route stays within the allowed boundary. Browser hosting alone does not establish DeviceOnly behavior.
- **Targets:**
  - Prior-auth web, which is the only browser-certified front end today.
  - KnowMe web (`gen_ui_wasm`).
  - Workflow-style decision DAGs like layaForWorkflows.

## 7. MCP 2026-07-28 and rmcp 3.5.0

The current spec revision (2026-07-28) informs the server we plan to build. The following are upstream observations and proposed acceptance requirements, not evidence that KnowMe implements or interoperates with these features:

- **Stateless protocol.**
  - No `initialize`/`initialized` handshake and no `Mcp-Session-Id`.
  - Every request carries its protocol version and client capabilities in `_meta`.
  - Servers **must** implement `server/discover`.
- **Subscriptions.** `subscriptions/listen` replaces the GET SSE stream and `resources/subscribe`.
- **Streams.** Request-scoped progress and messages flow on that request's own response stream. Resumability (`Last-Event-ID`) is removed.
- **Multi Round-Trip Requests (MRTR).** A result of `resultType: "input_required"` replaces server-initiated `elicitation/create`, `sampling/createMessage` and `roots/list`. Every result carries a `resultType`.
- **Extensions.**
  - **Tasks** is now an extension (`io.modelcontextprotocol/tasks`), with `tasks/get` polling and `tasks/update`.
  - `extensions` is a new capability field. MCP Apps (`ui://`) is an extension.
- **Caching and headers.**
  - `CacheableResult`: `ttlMs` and `cacheScope` are required on list and read results.
  - Deterministic `tools/list` order.
  - The `Mcp-Method` and `Mcp-Name` headers are required.
  - Error codes are renumbered (`UnsupportedProtocolVersion` is −32022).
  - Resource-not-found is now −32602.
- **Deprecated:**
  - Roots, Sampling and Logging.
  - The **HTTP+SSE transport** from 2024-11-05.
  - DCR, in favor of Client ID Metadata Documents.
- **Auth:** RFC 9207 `iss` validation. OpenTelemetry trace context travels in `_meta`.

### rmcp 3.5.0

- Implements both 2025-11-25 and 2026-07-28.
- Stateless streamable HTTP is the default, with `legacy_session_mode` for 2025-11-25 clients.
- Supports `server/discover`, the Tasks extension (SEP-2663), elicitation, and OAuth (including client-credentials JWT and enterprise-managed auth).
- Its server features include `server`, `macros`, `schemars`, `elicitation`, `transport-streamable-http-server`, `transport-streamable-http-server-session`, `transport-io`, `transport-child-process`, `tower` and `auth`.
- **There is no HTTP+SSE server transport feature** (only `client-side-sse`).

### "Supports SSE" therefore means three things

1. **Streamable HTTP.** It uses SSE for response streams, and `subscriptions/listen` is itself a long-lived SSE stream. This is the primary path, through rmcp.
2. **A legacy HTTP+SSE shim** (`GET /sse` + `POST /messages`) for pre-2025-03-26 clients. A thin Axum shim is proposed, subject to feasibility and transport tests, behind an off-by-default `mcp-legacy-sse` feature and labeled deprecated.
3. **SSE on the decision APIs** (`/v1/systemone` and `/v1/decide` with `Accept: text/event-stream`). This is a KnowMe extension; Jev itself doesn't stream.

The playbook’s capability matrix must track each supported revision, transport, advertised capability, extension, authentication flow and actual host interoperability test separately. SDK support does not establish application support, and optional capabilities must not be advertised before their gates pass.

### Pin

`rmcp = "=3.5.0"` across `decide-mcp` and `decide-server`. UAR (`=3.1.2`) and prior-auth (`3.4.0`) should move to 3.5.0 in their integration milestones. `versions.toml` is edited by hand only, so the pin is proposed in the playbook (§4) for you to record there.

## 8. Using a decision model to route the decision models

**Yes, with one hard constraint.** The router may only ever *narrow* where data can go. Choosing between local backends is a normal quality and latency decision. Deciding whether data may leave the device is a safety decision, and a model false negative there is a PHI leak. So routing has two stages.

### Stage 1: sensitivity gate (`proxy.sensitivity.v1`)

Trusted policy first establishes the maximum authorized destination set. Models may only remove destinations or request review; they cannot authorize egress.

1. Authenticated tenant/host policy, approved deployment configuration and trusted provenance establish permissions. Treat a caller’s `X-Data-Class` header as untrusted unless the host verifies its authority. Unknown provenance and `internal` content are not automatically approved for hosted disclosure.
2. The spec’s tags (`phi`, `clinical`, `counseling`) impose local restrictions that no model or caller-supplied downgrade can override.
3. PHI tripwires and a local sensitivity model may veto destinations. A local Choice over `public · internal · personal · phi · crisis` and a sensitivity Noul are candidate veto signals. Even singleton `{public}` or `{internal}` never expands the policy-authorized destination set.
4. A proposed 0.999 class recall target permits statistical errors under its assumptions; it is neither proof of zero leaks nor HIPAA compliance. Deployment requires approved service safeguards and applicable contractual review, independent of model labels. Apply these rules to every fallback, shadow dispatch, telemetry export and label synchronization.

### Stage 2: backend choice (`proxy.backend.v1`)

It chooses among the healthy backends allowed by the ceiling.

- **Deterministic capability filters come first:**
  - more than 20 options sends the request to an LLM-class backend
  - a non-Latin script sends it to `laya-multilingual`
  - more than 512 tokens rules out the English Laya
  - the latency and cost budgets apply
- **Then a Laya Score** over a feature summary estimates difficulty (`easy · moderate · hard`), which picks the cheapest tier likely to give a calibrated single-option set.
- **Escalation within the ceiling:** if the chosen backend's calibrated set has more than one option, move up one tier (Laya, then local Qwen/Kev, then remote Qwen, then Jev) but only while still inside the ceiling. When no tier remains, return `Review`.

### Shadow mode

Send a sampled copy to a second backend only after the same trusted egress authorization as primary dispatch. Agreement is useful evidence, not ground truth or a risk-free operation. Obtain representative human labels across `Act`, `Review` and `Escalate`, including sampled automated answers, and evaluate the whole routed cascade as well as individual backends.

Bind calibration to the deployment and scoring pipeline: checkpoint/revision, tokenizer, prompt/template, quantization, score transformation and relevant routing policy. The minimum `ceil(1/alpha) - 1` positives is a finite-sample quantile requirement; it does not alone establish deployment recall or error among accepted actions. Synthetic cases support development/regression but do not count as real calibration positives. Coverage requires the stated sampling assumptions; pooled fallback cannot claim the same subgroup guarantee. Required guards run before release even after a confident backend exit, and trusted-host audit commit is part of the release boundary defined in the playbook.

**Uncomfortable limitation:** a common wire API does not make probabilities interchangeable or prove that model-based routing preserves calibration. The complete deployed policy needs its own evidence before automation is enabled.

## Sources

- TypeSafe API reference: https://docs.typesafe.ai/api
- Alibaba plan restrictions: https://www.alibabacloud.com/help/en/model-studio/more-tools
- HHS cloud guidance: https://www.hhs.gov/hipaa/for-professionals/special-topics/health-information-technology/cloud-computing/index.html
- Conformal prediction assumptions: https://arxiv.org/html/2107.07511v6
- Qwen3.8-27B architecture: https://huggingface.co/Qwen/Qwen3.8-27B
- Laya MLX: https://github.com/mizorewww/laya-mlx
- Laya upstream (`laya-serve`, router, benchmarks): https://github.com/NandhaKishorM/laya
- ambuj singh, "China Just Dropped Laya MLX…", *Generative AI* (Medium), Sep 2026 (the PDF you provided)
- laya-vs-jev: https://github.com/virajbhartiya/laya-vs-jev
- Jev & Laya project index: https://jev001.org/projects/
- layaForWorkflows: https://github.com/vishalmysore/layaForWorkflows
- MCP versioning: https://modelcontextprotocol.io/specification/versioning
- MCP 2026-07-28 changelog: https://modelcontextprotocol.io/specification/2026-07-28/changelog
- rmcp changelog: https://github.com/modelcontextprotocol/rust-sdk/blob/main/crates/rmcp/CHANGELOG.md
- rmcp on crates.io: https://crates.io/crates/rmcp
