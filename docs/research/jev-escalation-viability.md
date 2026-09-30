# Jev for routing and escalation in a counseling digital twin: viability

*27 September 2026. Written in answer to the question "how viable is using TypeSafe's Jev for routing and human-escalation decisions in the counseling digital twin?"*

## The idea (from the 27 Sep session, 46:55–49:11)

1. **Routing:** a decision model classifies each patient message to pick the right agent.
2. **Escalation:** a second decision model judges whether the counselor twin's answer is good enough to send, or whether the case goes to the human counselor with a summary and pointer. Everything is logged for the counselor's next session.

> **28 Sep implementation clarification.** This preserves the original feasibility assessment. [`../PLAYBOOK.md`](../PLAYBOOK.md) is the normative contract; the [proxy follow-up](decision-proxy-options-2026-09.md) defines routing, scoring and compatibility acceptance requirements. No runtime or clinical certification is established by this note.

## Verdict

The idea is architecturally sound and the model is a strong fit. As a hosted vendor dependency for this use case, it isn't viable today.

## Why it fits

- **Both calls are decision-shaped.** Jev takes unstructured input plus a schema and returns typed choices with probabilities that the vendor claims are calibrated; target-population calibration remains unverified. It runs in one parallel pass, and TypeSafe markets it for "classify, route, score, extract, verify."
  - The route list is well under Jev's 255-option cap.
  - Escalation is a small fixed set, such as `{send, send_and_flag, hold_for_clinician, crisis_protocol}`.
  - Neither step needs free text, and Jev doesn't generate strings.
- **Escalation is mostly a threshold decision,** and thresholds need calibrated probabilities. Jev's RLCD training targets calibration directly.
- **Latency isn't an issue.** TypeSafe reports 70–500 ms, so every reply can be gated before the patient sees it.

## What breaks it

1. **Privacy architecture.** Jev is proprietary and served only from TypeSafe's hosted API, with no published weights and no on-prem option. Counseling transcripts are among the most sensitive PHI, and no BAA is published. It contradicts the stated on-device design.
2. **Calibration is self-reported and not measured on this distribution.** The benchmarks are "self-graded on a format the company invented" (TrueFoundry). Calibration on average says nothing about the rare tail (suicidal ideation), which is the only place that matters.
3. **"90% handled by the bot" is the wrong target.** The metric that matters is the false-negative rate on escalations. Set recall floors first, using class-conditional conformal prediction, and measure the automation rate that results.
4. **Crisis handling can't depend on one probability.** Run rule-based tripwires before any model and preserve an escalation across every later stage. A constrained model can still confidently pick the wrong option.
5. **Regulation.** Illinois (2025) bars AI from therapeutic decision-making, and other states have similar bills. Frame the product as supervised between-session support with the counselor in the loop, and get counsel's review.

## Resulting shape (later built out in this repo)

- **Pre-generation:** route the message, with `crisis` as a class.
- **Post-generation:** a sufficiency gate over the conversation, the draft and context, choosing from the four actions above.
- **Tripwires** run first and override both; required guards still run before release after any confident backend exit.
- **Every decision** has a redacted audit record committed by the trusted host; the kernel does no I/O. Collect representative human labels across `Act`, `Review` and `Escalate`, including sampled automated decisions, rather than using only overrides. Audit failure must follow the playbook’s explicit release contract.
- **Rollout:** shadow mode first, with the counselor reviewing every decision to get real recall numbers.

Self-hosting the same pattern (via the proposed LitJev port) can avoid sending inference inputs to a hosted provider, but does not by itself resolve storage, synchronization, telemetry, security or clinical obligations. Trusted policy and provenance authorize destinations; a sensitivity model can only veto, never grant egress. Unknown or internal data is not automatically eligible for hosted disclosure. The minimum calibration-positive count is a quantile requirement, not proof of deployment recall; synthetic cases do not count toward it. Evaluate the complete routed system and its subgroups under stated sampling assumptions. Plain Jev compatibility is advisory for approved nonclinical uses; clinical hosts require the native outcome contract, and the proxy must refuse any compatibility request whose required review or escalation cannot be safely represented. See [`open-decision-models-2026-09.md`](open-decision-models-2026-09.md) and [`../PLAYBOOK.md`](../PLAYBOOK.md).

## Sources

- [TypeSafe AI: Introducing System One Models & Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- [TrueFoundry: TypeSafe AI's Jev, what "System One Models" actually are](https://www.truefoundry.com/blog/typesafe-ai-jev)
- [Tom's Hardware coverage of Jev](https://www.tomshardware.com/tech-industry/artificial-intelligence/typesafe-ais-jev-offers-an-alternative-to-llms-that-claims-to-be-193x-faster-and-445x-cheaper-system-one-type-model-is-bespoke-for-probabilistic-decision-making)
