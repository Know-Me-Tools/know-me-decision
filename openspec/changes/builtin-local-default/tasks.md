# Tasks

All tasks are pending implementation. Artifact completeness does not establish runtime or platform acceptance.

## 1. M0 feasibility and evidence

- [ ] 1.1 Verify the upstream Julia ONNX/tokenizer/license artifacts and record actual immutable identities and compatible formatting; verify the asset manifest contains observed identities, not placeholders or fabricated hashes.
- [ ] 1.2 Prove native graph loading and a real inference call on the selected desktop and mobile CPU configurations; report Rust binding/native-runtime compatibility and the XNNPACK finding with real execution output.
- [ ] 1.3 Record supported release architectures and OS minimums plus predeclared package, peak-memory, startup and warm-latency budgets with the affected host owners; verify the feasibility report measures actual Julia deployment costs and records every pending target.
- [ ] 1.4 Submit dependency candidates to the architecture owner for manual pin acceptance; verify accepted pins and license notices before implementation consumes them.

## 2. M1 contracts and packaging design

- [ ] 2.1 Freeze local capability limits and primitive mappings, including formatted token counting and explicit overflow behavior; verify review of Choice, fractional Score and independent Noul contract fixtures.
- [ ] 2.2 Freeze installed-asset integrity, default settings, credential enrollment and explicit remote-selection contracts; verify a valid key does not change the default and invalid credentials do not block local startup in the agreed acceptance cases.
- [ ] 2.3 Freeze the pure-core, native-runtime and optional host-remote boundaries; verify the feature/dependency design leaves remote inference outside decide-lite and I/O outside decide-core.

## 3. M1a real integration slice

- [ ] 3.1 Implement the actual bundled Julia inference path through the shared host policy and native/HTTP/MCP decision surfaces; verify real primitive outputs, required guards, calibration withholding and audit outcomes through those production paths.
- [ ] 3.2 Implement key-enabled Jev enrollment and explicit eligible routing; verify a real authorized TypeSafe request and rejection of forbidden egress, recording the gate as unavailable if no authorized key exists rather than substituting mocks.
- [ ] 3.3 Exercise a clean offline installation with no prior model cache, Python, server, credentials or manual settings; verify local requests complete and network observation shows no inference or asset-fetch attempt.

## 4. M4 native platform release gates

- [ ] 4.1 Package and verify the complete trusted model/tokenizer/runtime/default/license set on Windows, macOS and Linux release targets; record native parity, offline first-run, package size, RSS, cold/warm latency and real host integration evidence for each.
- [ ] 4.2 Package and verify the same contract on native Android and iOS release devices; record model execution, parity, offline first-run, memory pressure, suspend/resume and performance evidence independently for each target.
- [ ] 4.3 Verify invalid assets, oversized requests, absent calibration, mandatory guard vetoes, audit failures and unavailable Jev credentials through real host paths; confirm explicit outcomes without secret/state-text logging, fabricated scores or implicit egress.
- [ ] 4.4 If a quantized configuration is proposed, record its own identities, primitive/task parity, calibration and resource evidence before accepting it; verify untested precision/provider configurations remain unavailable rather than inheriting certification.
- [ ] 4.5 Publish the support/evidence matrix only for targets that pass predeclared budgets and acceptance cases; verify pending Jev or platform evidence stays explicit and all clinical sign-off gates remain unsigned until supplied by their human owners.
