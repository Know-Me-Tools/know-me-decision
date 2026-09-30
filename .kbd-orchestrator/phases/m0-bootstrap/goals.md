# Goals

- Workspace skeleton per PLAYBOOK §3 with rust-toolchain.toml (1.97.1), deny.toml and CI: fmt, clippy, test, deny, core-wasm — green on an empty workspace
- Spike F (priority): built-in Julia 1 baseline via Rust + native ONNX Runtime — tokenization, operators, primitive semantics, numerical parity, desktop/mobile packaging, offline first-launch and resource receipts
- Spike A: Kev-4B and laya-rust p50/p95 latency and memory for 1/3/10 questions on M-series Mac and Windows CUDA
- Spike B: replay TypeSafe public evals and Kev frozen suites; record accuracy, Brier and ECE
- Spike C (3-day timebox): candle-vllm fork DeltaNet state snapshot/fork per request; result recorded in ADR-004
- Spike D: laya-mlx vs laya-rust on Metal including the stdio-worker hop; decide v1 worker vs native mlx-rs
- Spike E: verify permitted service use and score capabilities on an authorized endpoint; incomplete scores force Review; report blocked capabilities
- Spike reports in evals/reports/ record observations, unresolved capabilities and authorized-service status
- ADR-001 (repo and crate boundaries), ADR-002 (pins, recorded in versions.toml by hand), ADR-003 (outcome semantics), ADR-004 (LLM backend) accepted
- Commit or resolve the pending decision-proxy and builtin-local-default doc changes and their two OpenSpec proposals before M0 implementation starts
