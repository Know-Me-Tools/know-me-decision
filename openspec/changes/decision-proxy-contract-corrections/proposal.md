# Proposal

## Why

The proxy expansion currently treats incomplete provider scores, model-classified sensitivity, and successful subscription probes as stronger evidence than they provide. Before M0 implementation, the host contracts need testable boundaries so switching providers cannot silently change permission to act or disclose data.

## What Changes

- Separate primitive-specific answers from native `Act`, `Review`, and `Escalate` outcomes; restrict plain Jev compatibility to advisory non-clinical work and refuse requests requiring outcomes the client cannot enforce.
- Require trusted host grants and deployment identity for dispatch; classifiers may only narrow eligibility, including fallback and shadow requests.
- Require permitted provider service use and explicit score completeness. Missing top-five option scores cannot be filled with invented probability mass.
- Require mandatory guards and committed audit persistence before releasing `Act`; retain an explicit failure path for urgent escalation without pretending persistence succeeded.
- Collect representative human labels across all outcomes and bind calibration to the actual scoring pipeline.
- Keep review confirmation in authenticated host commands outside model-visible MCP tools. Separate browser inference locality from separately authorized synchronization.
- Describe protocol support and version candidates as pending acceptance gates, not shipped implementation.

## Capabilities

### New Capabilities

- `decision-proxy-contracts`: common outcome, egress, scoring, audit, feedback, browser, and interoperability requirements for the planned proxy and its hosts.

### Modified Capabilities

None. The repository has no existing OpenSpec capability specifications.

## Impact

This proposal affects planned core/schema, policy, calibration, audit, backend, proxy, MCP, server, and browser interfaces, plus The Boss, UAR, KnowMe, and prior-auth integrations. It records proposed cross-host requirements; implementation and host acceptance remain pending. Existing invariants I-1 through I-10 are preserved. Architecture owners retain ADRs and manual `versions.toml` pins.

## Non-goals

No runtime code, DecisionSpec JSON, ADR acceptance, dependency pin changes, provider provisioning, paid requests, publication, or clinical promotion. No new facade or provider family. No claim that calibration eliminates individual errors, that a BAA alone grants dispatch, or that every MCP extension is supported.

The uncomfortable constraint is that some existing Jev clients and subscription credentials will not qualify for the intended workload. Compatibility and convenience cannot substitute for host authorization or decision semantics.
