# Jev for routing and escalation in a counseling digital twin: viability

*27 September 2026. Written in answer to the question "how viable is using TypeSafe's Jev for routing and human-escalation decisions in the counseling digital twin?"*

## The idea (from the 27 Sep session, 46:55–49:11)

1. **Routing:** a decision model classifies each patient message to pick the right agent.
2. **Escalation:** a second decision model judges whether the counselor twin's answer is good enough to send, or whether the case goes to the human counselor with a summary and pointer. Everything is logged for the counselor's next session.

## Verdict

The idea is architecturally sound and the model is a strong fit. As a hosted vendor dependency for this use case, it isn't viable today.

## Why it fits

- **Both calls are decision-shaped.** Jev takes unstructured input plus a schema and returns typed choices, each with a calibrated probability. It runs in one parallel pass, and TypeSafe markets it for "classify, route, score, extract, verify."
  - The route list is well under Jev's 255-option cap.
  - Escalation is a small fixed set, such as `{send, send_and_flag, hold_for_clinician, crisis_protocol}`.
  - Neither step needs free text, and Jev doesn't generate strings.
- **Escalation is mostly a threshold decision,** and thresholds need calibrated probabilities. Jev's RLCD training targets calibration directly.
- **Latency isn't an issue.** TypeSafe reports 70–500 ms, so every reply can be gated before the patient sees it.

## What breaks it

1. **Privacy architecture.** Jev is proprietary and served only from TypeSafe's hosted API, with no published weights and no on-prem option. Counseling transcripts are among the most sensitive PHI, and no BAA is published. It contradicts the stated on-device design.
2. **Calibration is self-reported and not measured on this distribution.** The benchmarks are "self-graded on a format the company invented" (TrueFoundry). Calibration on average says nothing about the rare tail (suicidal ideation), which is the only place that matters.
3. **"90% handled by the bot" is the wrong target.** The metric that matters is the false-negative rate on escalations. Set recall floors first, using class-conditional conformal prediction, and measure the automation rate that results.
4. **Crisis handling can't depend on one probability.** Run rule-based tripwires in parallel and escalate on either signal. A constrained model can still confidently pick the wrong option.
5. **Regulation.** Illinois (2025) bars AI from therapeutic decision-making, and other states have similar bills. Frame the product as supervised between-session support with the counselor in the loop, and get counsel's review.

## Resulting shape (later built out in this repo)

- **Pre-generation:** route the message, with `crisis` as a class.
- **Post-generation:** a sufficiency gate over the conversation, the draft and context, choosing from the four actions above.
- **Tripwires** run in parallel and override both.
- **Every decision and its confidence** is logged to the counselor's transaction log, which is also the audit trail and the label source.
- **Rollout:** shadow mode first, with the counselor reviewing every decision to get real recall numbers.

Self-hosting the same pattern (via the LitJev port) removes the deployment and data-handling blocker, at the cost of doing the calibration work RLCD claims to do. See [`open-decision-models-2026-09.md`](open-decision-models-2026-09.md) and [`../PLAYBOOK.md`](../PLAYBOOK.md).

## Sources

- [TypeSafe AI: Introducing System One Models & Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- [TrueFoundry: TypeSafe AI's Jev, what "System One Models" actually are](https://www.truefoundry.com/blog/typesafe-ai-jev)
- [Tom's Hardware coverage of Jev](https://www.tomshardware.com/tech-industry/artificial-intelligence/typesafe-ais-jev-offers-an-alternative-to-llms-that-claims-to-be-193x-faster-and-445x-cheaper-system-one-type-model-is-bespoke-for-probabilistic-decision-making)
