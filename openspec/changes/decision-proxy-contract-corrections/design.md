# Design

## Context

See [proposal.md](proposal.md) for motivation. This is a pre-implementation cross-host proposal under PLAYBOOK M0–M10, not an accepted ADR or a delivered runtime. The existing Rust sketches, HTTP surfaces, review card, and browser design must converge on the same contracts before host implementation. The waypoint remains Spec.

## Goals / Non-Goals

**Goals:** Make the existing proxy expansion reviewable through observable acceptance scenarios. Share policy across linked, HTTP, MCP, and browser entry points. Preserve I-1 through I-10.

**Non-Goals:** No implementation or migration of live data. No inference permission derived from model confidence alone. No replacement of clinician, counsel, or affected-host acceptance with this document.

## Decisions

1. **Keep answers and authorization distinct.** Native answers retain Choice probabilities, fractional expected Score, and independent Noul probabilities; batches carry per-question outcomes. Plain Jev success remains advisory and non-clinical. Requests requiring an enforced safety outcome are refused unless using the native outcome-aware contract. Optional extension metadata alone is not evidence that a client enforces it. This rejects the alternative of silently flattening `Review` into an ordinary answer.
2. **Authorize before ranking.** Trusted host policy and data provenance establish eligible destinations, then deterministic checks and optional classifiers can remove them. Unknown provenance and an `internal` label do not authorize third-party egress. Explicit selection, fallback, shadow evaluation, telemetry, and synchronization use the same grant boundary. A BAA is relevant evidence, not an automatic policy grant.
3. **Identify deployments, not only model names.** Admission binds the endpoint and service authorization, checkpoint/revision, tokenizer, prompt, quantization, score transformation, limits, and calibration identity. A successful token-plan request is a connectivity observation. Remote Qwen uses a permitted general API or documented authorization; incomplete top-five scores are unavailable evidence rather than a distribution reconstructed with invented mass. Approximate scoring remains a separately evaluated pipeline.
4. **Finalize after guards and host persistence.** Early classifier exits skip later scoring only, never required guards. The pure core returns the decision and record to the trusted host. A durable audit receipt is required before `Act` is released. On append failure, ordinary action is withheld and the failure is explicit; urgent escalation remains deliverable with an explicit uncommitted status and host incident handling. No success audit ID is invented. Streamed progress does not authorize action.
5. **Sample the whole deployment population.** Human adjudication includes sampled Acts, Reviews, and Escalates, with sampling provenance and held-out partitions. Overrides alone are biased toward the review queue. Synthetic cases test mechanics but do not count toward real calibration positives. Pooled fallback is labeled as pooled evidence; subgroup floors without sufficient evidence force review. Calibration identity includes the scoring pipeline and relevant routing configuration.
6. **Use a separate human command boundary.** Review confirmation resolves an authenticated host actor, authorization, decision reference, and persisted label. Caller-provided role text is insufficient. The MCP App requests that host command; it does not gain a model-visible clinical mutation tool. Unsupported hosts show a read-only card or route to the host review queue.
7. **Separate local inference and synchronization.** The browser default is DeviceOnly with local persistence and no synchronization of decision-derived data. A separately authorized deployment profile can synchronize approved fields to named destinations; it cannot keep the DeviceOnly claim for that data flow. Quantization-specific calibration and cached/offline behavior remain separate acceptance gates.
8. **Advertise only tested protocol behavior.** MCP revisions, transports, capabilities, authentication, and optional extensions each need evidence. Jev SSE is a separate extension. Candidate library versions require architecture review and manual entry in `versions.toml`; this proposal does not establish pins.

## Risks / Trade-offs

- Some Jev clients cannot represent safe abstention → restrict them to advisory scope and refuse unsafe workloads explicitly.
- Audit storage can be unavailable during a crisis → preserve urgent escalation delivery while exposing the missing receipt; this does not satisfy the audit gate until the host reconciles the incident.
- Sampling Acts increases human review cost → budget adjudication before measuring deployment recall; optimize automation only as an observed output.
- Hosted eligibility may shrink substantially → report review rate and unavailable capabilities without relaxing recall floors or grants.
- Offline browser storage can be evicted → test persistence failure through the same no-Act-without-receipt contract.

## Migration Plan

There is no deployed runtime to migrate. At M0, record feasibility and authorization evidence; at M1, accept wire/outcome and host command contracts with affected hosts. Build the first local-backend plus approved hosted-Jev vertical slice at M1a immediately after M0/M1, with native Review or mandatory Escalate only and negative-path evidence. M2–M6 complete production calibration, policy, audit and protocol contracts before any Act claim. Add remote Qwen, learned routing, browser support, and clinical promotion only after their own gates pass. A failing gate keeps the capability disabled or the spec in review/shadow; documentation completion does not authorize rollout.

Clinical gates in PLAYBOOK §15 remain open. Human owner identities and signatures must come from the actual affected organizations; none are assigned or signed by this proposal.
