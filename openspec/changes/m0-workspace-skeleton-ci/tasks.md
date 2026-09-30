## 1. Tasks

- [ ] 1.1 rustup target add wasm32-unknown-unknown; cargo install cargo-deny
- [ ] 1.2 Cargo.toml with [workspace.dependencies] exact pins and [workspace.lints] (unwrap/expect denied outside tests)
- [ ] 1.3 rust-toolchain.toml 1.97.1 and deny.toml
- [ ] 1.4 Ten empty decide-* crates; forbid(unsafe_code) in the six safe crates; decide-core no I/O
- [ ] 1.5 bins/knowme-decide stub
- [ ] 1.6 xtask spec-lint and conformance as minimal passing checks, plus a unit test for the clinical Act rule
- [ ] 1.7 CI workflow: fmt, clippy -D warnings, test, deny, core-wasm, forbid-unsafe grep
- [ ] 1.8 All acceptance commands exit 0 locally and in CI
