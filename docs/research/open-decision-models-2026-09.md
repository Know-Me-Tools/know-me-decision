# Self-Hosted Decision Models for KnowMe / UAR: What to Run in Place of Jev (September 2026)

*Deep-research report, 27 September 2026. Benchmark figures for the open models are mostly self-reported and only days or weeks old; see [Caveats](#caveats).*

You can replace Jev with open-weight models on your own hardware, but not with one model. No open project reproduces Jev's RLCD training. The practical replacement has five layers:

- **(a)** a small encoder decision model for routing and triage
- **(b)** a Qwen-based Jev-style decision head (Kev, or your LitJev port on Qwen3.8-27B) for harder typed decisions
- **(c)** a policy-driven guard model
- **(d)** conformal calibration fitted on your own labeled data
- **(e)** deterministic crisis tripwires

Only (d) and (e) give guarantees you can defend for the counseling and prior-auth use cases.

## TL;DR

- **Best open "Jev-shaped" models right now:**
  - **Kev** (Apache-2.0; Qwen3.5/3.8 bases at 0.8B/4B/9B/27B; serves TypeSafe's `/v1/systemone` schema; publishes Brier scores against Jev) for hard decisions.
  - **Julia 1** (144.3M, Apache-2.0, ~33 ms median per decision on an Apple M4) and **Laya** (ModernBERT-large 421M, Apache-2.0, pure-Rust candle port) for on-device routing.
  - **CLM-8B** (Stanford/NVIDIA, Apache-2.0) for scoring actions and verifying agent outputs.
  - All of these are days to weeks old, their benchmarks are self-reported, and none reproduces RLCD.
- **Safety and verification layer:**
  - **Qwen3Guard** (0.6B/4B/8B, including a streaming token-level variant with a "Suicide & Self-Harm" category).
  - **IBM Granite Guardian 4.1 8B** (Apache-2.0, bring-your-own-criteria, yes/no scores from logprobs).
  - **gpt-oss-safeguard-20b** (Apache-2.0, bring-your-own-policy reasoning).
  - Together these cover guardrailing and answer-sufficiency judging.
  - For clinical text, **MedGemma 27B text** (128K context) is the strongest open medical model, but its license bans "automated decisions" in healthcare and insurance. It can only be used with a person reviewing its output.
- **Architecture verdict:**
  - The counseling escalation gate and prior-auth decisions are safety-critical and regulated. Illinois HB 1806 "prohibits anyone from using AI to provide mental health and therapeutic decision-making" (IDFPR), and the FDA's January 2026 CDS guidance applies to prior auth.
  - Build both as approve-or-escalate systems, never deny or treat autonomously.
  - Use conformal thresholds that guarantee recall on the escalation class, with rule-based crisis tripwires in front of any model.

## 1. The Jev baseline and what "replacing" it actually means

- **Jev is hosted-only.** TypeSafe "has not published weights, a parameter count, or a self-hosting option" and "has not disclosed the architecture."
  - Its API has three primitives: Choice (pick one of up to 255 options), Score (an ordinal rubric) and Noul (the probability that a statement is true).
  - Each Choice or Score answer returns a confidence between 0 and 1.
- **Pricing and speed claims are the vendor's own.**
  - TypeSafe reports $0.042 per 1M input tokens (output free) and 70–500 ms end-to-end latency.
  - The headline "193.6× faster / 444.6× cheaper" numbers come from TypeSafe's own workflow evals, whose reference answers average two frontier models. TypeSafe says it "cannot prove the price is unsubsidized."
  - "Zero hallucinations" means only that the output always matches the schema, not that it is correct.
- **No open project copies Jev.** The independent tracker systemonemodels.org puts it plainly: "There is no drop-in replacement for Jev… None of them is trained the way Jev is." RLCD "has never been described in enough detail to copy." Several open projects explicitly disclaim calibration; openjev-sglang says its probabilities "are not calibrated estimates of correctness."
- **What this means for you:** Jev's actual advantage is calibration out of the box on unseen tasks. The interface (typed options, one forward pass, a probability for each option) is easy to copy. With a HIPAA-bound, on-device architecture you have to rebuild calibration from your own labeled data. That is also the approach you should trust most for clinical decisions, even if Jev were available on-prem.

## 2. Open "System One" / Jev-like models (all released 15–27 Sep 2026)

| Model | Base / size | License | Hardware and latency (self-reported) | Output | Calibration evidence | Rust / serving |
|---|---|---|---|---|---|---|
| **Kev** (Jared Palmer) | Qwen3.5/3.8 at 0.8B, 4B, 9B, 27B (LoRA + pointer head, frozen backbone) | Apache-2.0, training code and eval data included | Kev-4B ~495 ms for 3 questions on an M5 (bf16); Kev-9B needs ~19–22 GB; Kev-27B ~55 GB (80 GB GPU) | Choice/Score/Noul, TypeSafe wire format | Kev-27B locked OOD: 0.896 accuracy, Brier 0.160, "coverage at ≤5% error" 0.835. Kev-9B ECE 0.106→0.042 after temperature fitting. Confident errors 4.0% vs. Jev's 3.7% | Python server; the Qwen3.8 hybrid (Gated DeltaNet) backbone is slow on Mac without MLX |
| **Julia 1** (Supersonic Labs) | mmBERT-small, 144.3M | Apache-2.0 | 33.15 ms median on Apple M4; 203 ms and 393 MB RSS on a Samsung tablet CPU (ONNX Runtime); WebGPU build | 2–20 options, full softmax | None published beyond accuracy. 73.15% on Typed Decisions vs. Jev's 72.70% reference; **64% vs. 87% on Banking77 (72 labels)** | ONNX; 8,192-token runtime, benchmarked at 1,024 |
| **Laya** (Convai Innovations) | ModernBERT-large 421M (EN); mmBERT-base 322M (multilingual) | Apache-2.0 | 32.8–39.5 ms on a T4; 193–464 ms on CPU | Choice/Score/Noul | ECE 0.466 as shipped → 0.081 after temperature fitting | **Pure-Rust candle port (`laya-rust`): CPU/Metal/CUDA**, with a vendored fix for candle's ModernBERT f16 mask bug |
| **CLM-8B** (Stanford + NVIDIA) | Frozen Qwen3-8B + two 20M-parameter heads (bi-encoder, InfoNCE) | Apache-2.0 (code, weights, data) | 28 ms per new state on an RTX 4090; Linux + NVIDIA; "13× faster than Jev" at ~1k candidates | Scores each candidate action | "None claimed" (optional temperature only) | Qwen3-8B embeddings via vLLM pooling |
| **Decider** (Mapika) | Qwen3.5-2B-Base fine-tune | Apache-2.0 | Local GPU | Choice/Score/Noul, TypeSafe wire format | Claimed, not measured | — |
| **Von** | ModernBERT 395M | Apache-2.0 | ~18 ms on GPU; CPU/MPS/OpenVINO | Choice/Score/Noul | "Near-ideal" ECE claimed, no figure; 72.0% vs. Jev's 96.6% on its own 49-task suite | — |
| **openJev-verdict-2.0** | 151M, non-autoregressive | Open | — | Typed | 77.10% accuracy, Brier 0.0636, ECE 0.0144 on typed-decisions (self-reported) | — |
| **litjev / AnyJev / jevfire / jevmlx** | Logit readers over a frozen Qwen or any LLM | MIT/Apache | Your GPU / MLX | Option logits in one pass | AnyJev fits a head on 100–300 labels; jevfire warns "relative label probabilities are not probabilities that an answer is correct" | vLLM (jevfire), MLX (jevmlx) |

**How to read these results:**

- On tasks with a handful of well-described options, small open models match or beat Jev.
- They fall behind on many similar labels (Julia's Banking77 result), long inputs, and policy or date reasoning. Kev-9B scores 0.74 on MMLU against Jev's 0.90.
- The intent router covers "many specialized agents", so hierarchical routing (coarse domain first, then agent) matters more than which model you choose.

## 3. The LitJev-on-Qwen3.8-27B plan is validated, with one warning

- **Kev-27B is built on exactly `Qwen/Qwen3.8-27B`** (Apache-2.0). It is the best-calibrated open Jev-style model found, so it is your reference point.
- **A full fine-tune on the same base comes close to Jev.** Kev's notes say AutoJev-27B (full SFT on 73k synthetic decisions, same base) scored 50.94 on the community Decision Index vs. Jev's 51.67.
- **Warning: Qwen3.8 is a hybrid** of Gated DeltaNet and full-attention layers. Kev runs questions "as separate causal rows continuing from the shared state."
  - In a Rust port, candle-vllm's paged-attention KV reuse won't cover the linear-attention state.
  - You need a state-snapshot and fork mechanism for the prefix-shared multi-question pattern. That pattern is what makes Jev-style batching cheap.
- **Use soft targets.** Kev found that soft targets beat hard labels on both accuracy and Brier, which applies when you fine-tune on counselor-labeled data.

## 4. Guard, judge and verifier models

| Model | Size | License | Output style | Relevance |
|---|---|---|---|---|
| **Qwen3Guard-Gen / -Stream** (Sept–Oct 2025) | 0.6B, 4B, 8B | Apache-2.0 (Qwen) | Safe / Unsafe / **Controversial** + category (incl. "Suicide & Self-Harm", "PII", "Jailbreak"); Stream classifies every token during generation | Real-time output monitoring of the counseling twin. 119 languages. One independent test found ~1–1.5 s of overhead for the non-streamed version. Stream needs the Qwen3 tokenizer |
| **Granite Guardian 4.1 8B** (Apr 2026) | 8B | Apache-2.0 | Yes/no score from yes/no token logprobs; think/no-think; bring-your-own criteria | Best fit for **answer sufficiency and groundedness**. Scores 70.29 as a best-of-N reward model, "outperforming all tested reward models up to 70B." Granite Guardian 3.3 is #1 on REVEAL. English only; a 38M HAP model exists for tight latency budgets. On Ollama |
| **gpt-oss-safeguard-20b / 120b** (Oct 2025) | 20B (≥12 GB RAM, GGUF/MLX), 120B | Apache-2.0 | Reasoning plus a label against a policy you write | A written "Counsel Me escalation policy" you can iterate on without retraining. OpenAI cautions that dedicated classifiers trained on large datasets "can still outperform it" on nuanced risks. Too slow inline; use it for async audit |

- Llama Guard and ShieldGemma also exist. The Qwen3Guard report shows Qwen3Guard-Gen ahead of LlamaGuard-8B, WildGuard-7B, ShieldGemma-27B and others on its benchmark suite (vendor-reported).
- **No off-the-shelf guard model is a validated suicide-risk detector.**
  - Kalinich et al. (2026) tested 127 open-weight LLMs and found "mental-health-, medical- and safety-tuned variants giving no reliable gain over their base models."
  - PsyCrisisBench (Deng et al., IEEE JBHI 2026) used 540 annotated transcripts from the Hangzhou Psychological Assistance Hotline and 64 LLMs across 15 families. "A fine-tuned 1.5B-parameter model (Qwen2.5-1.5B) outperformed larger models on mood and suicidal ideation tasks," with suicidal-ideation F1 of 0.8925 vs. the best zero-shot F1 of 0.8690.
  - **Implication:** fine-tune a small model on crisis-labeled data. Don't trust a guard model's generic self-harm category on its own.

## 5. Routers and zero-shot encoders

- **Arch-Router-1.5B** (Katanemo, Qwen2.5-1.5B fine-tuned on 43k examples):
  - Maps a conversation to routes you define in natural language.
  - Reports 93.17% overall routing accuracy vs. 92.79% for Claude-sonnet-3.7, and is "over 28 times faster than its closest competitor." It was self-hosted on an L40S, while the commercial models were timed through the OpenRouter API.
  - Routes can be changed without retraining.
  - **The license is the "Katanemo license", not Apache.** Check it before commercial use.
  - It generates a route name, so you would take probabilities from the route tokens' logprobs.
- **GLiClass** (Knowledgator; arXiv 2508.07662):
  - A zero-shot, label-conditioned classifier on ModernBERT (8k context), Apache-2.0.
  - The vendor says the models are "up to 50 times faster than Cross-Encoders and show the same or higher accuracy."
  - Supports multi-label, hierarchical labels, and retrieval-augmented few-shot examples.
  - A 2026 decoder-KV variant (SCX Router) scores model and agent labels "without autoregressive generation" and keeps a persistent KV cache per session.
- **ModernBERT fine-tuned classifiers** are the cheapest and most accurate option once you have labels. There are Rust paths already:
  - `candle-pipelines` has ModernBERT zero-shot and sentiment pipelines.
  - `candle-semantic-router` ships ModernBERT intent, PII and jailbreak classifiers, noting that it "fixes the bugs in candle-transformers ModernBERT".

## 6. Clinical models

- **MedGemma 27B text-it** (May 2025):
  - Context of "at least 128K tokens", with 8,192 output tokens.
  - MedQA 87.7 (0-shot). EHRQA 86.3 on synthetic FHIR records (the 27B multimodal model scores 90.5).
  - An estimated ~54 GB in bf16 and ~16–20 GB at 4-bit. These are estimates, not Google specs.
- **MedGemma 1.5** (13 Jan 2026) is 4B multimodal only.
  - It adds EHR and lab-report understanding and 3D CT/MRI.
  - It "has not been evaluated or optimized for multi-turn applications."
- **License trap.** The HAI-DEF terms allow commercial use, but:
  - The Prohibited Use Policy bans "Making automated decisions in domains that affect material or individual rights or well-being (e.g., … healthcare, … insurance…)".
  - Google may terminate if it could be deemed a device "manufacturer".
  - So MedGemma is allowed as an evidence extractor and as a recommendation engine a person reviews. It is not allowed as an autonomous approve/deny engine.
- **The prior-auth evidence base is thin, and none of it covers open weights:**
  - Anterior's deployed approve-or-escalate system (7,166 nurse-reviewed cases, 27 guidelines) shows ~5.7–7.3% error rates across demographic subgroups and never recommends denials. This is a vendor preprint with undisclosed models.
  - HealthAdminBench: the best agent reaches 36.3% end-to-end task success.
  - χ-Bench: the best agent resolves 28.0% of tasks, with 29.3% pass@1 on prior auth for GPT-5.5.
  - No benchmark reports open-weight accuracy on matching a chart against payer criteria. You will have to build your own evaluation set.

## 7. The technique layer: turning any open LLM into a decision model

1. **One-pass option scoring.** Prefill the state once, then read the next-token logits restricted to the option tokens. This is how litjev, mini-jev, jevfire and Granite Guardian's yes/no scoring work.
   - For several questions, fork the KV cache per question. jev-on-a-laptop "broadcasts the KV cache across one batch row per schema field."
   - For multi-token labels, use single-letter aliases or score the whole sequence's log-probability.
2. **Constrained decoding** for the fields you do generate (action items, missing-evidence lists).
   - XGrammar is the default in vLLM and SGLang.
   - llguidance is written in Rust and works in llama.cpp (`-DLLAMA_LLGUIDANCE=ON`) and SGLang (`--grammar-backend llguidance`). Both add roughly 40–50 µs per token.
   - llguidance is the natural fit for a candle-vllm fork because it is a Rust crate that computes token masks.
   - Constrained decoding guarantees valid structure. It says nothing about calibration.
3. **Calibration.**
   - Temperature scaling fixes average overconfidence (Laya's ECE went from 0.466 to 0.081, and Kev fits a temperature for each checkpoint). It doesn't guarantee recall on rare classes.
   - For the escalation and crisis classes, use split conformal or conformal risk control. Calibrate on held-out positives so that recall on "must escalate" meets a target you set (e.g., ≥0.98).
   - Caveat: standard split conformal can show "systematically worse performance on the most safety-critical examples" when subgroups shift. Use class-conditional (Mondrian) or conditional-conformal variants, and recalibrate for each counselor and population.
4. **Fine-tuning small models on labeled decisions.** Options include SetFit (a few dozen labels, CPU), a full ModernBERT fine-tune, or LoRA plus a head on Qwen following Kev's recipe. The counselor's transaction log is the labeling pipeline, so capture counselor overrides as labels from day one.

## 8. Per-use-case recommendations

### Use 1: Intent / "switch" router across UAR agents (not safety-critical)

- **Primary:** Laya (Rust/candle, on-device) or Julia 1 (ONNX, phone/tablet) for zero-shot routing with ≤20 agents per level. Arrange agents as a two-level tree.
- **Once you have ~50+ labeled messages per agent:** switch to a fine-tuned ModernBERT/mmBERT served via candle.
- **Alternatives:**
  - GLiClass-modern (multi-label).
  - Arch-Router-1.5B (check the license).
  - Kev-4B for ambiguous cases.
- **Cascade:** encoder → if the top probability is below τ, Kev → if still low, ask a clarifying question.

### Use 2: Counsel Me answer-sufficiency and escalation gate (SAFETY-CRITICAL)

- **Layer 0, deterministic tripwires before any model:**
  - A lexicon and regex for explicit suicidal ideation, plans, means, abuse and medication overdose, tuned with the counselor.
  - A hit always escalates, sends crisis resources (988 in the US) and alerts the counselor.
- **Layer 1, crisis classifier:**
  - A fine-tuned small model (~1.5B Qwen) on the message plus recent context.
  - Qwen3Guard-Stream's self-harm category as a second, uncorrelated signal.
  - Conformal thresholds targeting ≥0.98 recall on "risk present".
- **Layer 2, answer sufficiency:**
  - Granite Guardian 4.1 8B (no-think, bring-your-own criteria): grounded in the counselor's knowledge base, consistent with prior guidance, contains no new clinical directive, answers the question.
  - Alternatively, Kev/LitJev Noul questions that ask the same things.
- **Layer 3, async audit:** gpt-oss-safeguard-20b re-reviews a sample of sent answers against a written escalation policy.
- **The 90/10 target:** don't fix it in advance. Set the recall target first, then measure the automation rate it leaves. Kev-27B's "coverage at ≤5% error" of 0.835 suggests about 84% on general tasks at a 5% error budget, and clinical budgets are tighter.
- **Regulatory:**
  - Illinois HB 1806 (Public Act 104-0054, effective 4 Aug 2025) bars AI from "independent therapeutic decisions" and from "directly interact[ing] with clients in any form of therapeutic communication", with penalties "not to exceed $10,000 per violation".
  - Geofence Illinois, or limit the product there to supplementary support with consent, and get counsel's opinion. The on-device design is a genuine HIPAA advantage.

### Use 3: Wearables + FHIR + Omi transcript context

- Turn structured signals into features deterministically, such as HRV z-scores against the person's own baseline and sleep debt.
- Ask Kev Choice or Score questions over state text that contains those derived facts.
- MedGemma 1.5 4B can summarize FHIR and lab content into the state on device. Treat its output as extraction.
- **Regulatory flag:** under the January 2026 CDS guidance, "multiple, sequential, or repeated measurements" count as a "pattern", and interpreting them for clinical meaning is likely a device function. Keep this framed as wellness.

### Use 4: Accountability agent (moderate risk)

- **Extraction:** constrained-decoding JSON on Qwen, plus GLiNER-style span extraction.
- **Check-in timing:** a Kev Score over {same day, 2 days, 1 week}.
- **Task completion:** a Kev/LitJev Noul plus Granite groundedness. Low confidence means asking the user.

### Use 5: Prior Authorization Workbench (SAFETY- and LIABILITY-CRITICAL)

- **Pipeline:**
  1. Carrier and policy selection with deterministic rules and a Kev Choice fallback.
  2. Criteria decomposition (Qwen3.8-27B + JSON schema), which a person verifies for each policy version.
  3. Evidence retrieval for each criterion.
  4. A Noul for each criterion (MedGemma 27B text or Kev-27B), with citations.
  5. Aggregation in code.
- **Output:** "meets / missing evidence / needs review", never "deny".
- **Approval prediction** needs historical payer outcomes.
- **Regulatory:**
  - FDA non-device CDS supports an HCP "without replacing or directing" their judgment. "Matching patient records to clinical guidelines" is a recognized pattern.
  - CMS-0057-F requires payers to decide within 72 hours (urgent) or 7 calendar days (standard) from 1 January 2026, and gives them until 1 January 2027 to meet the FHIR Prior Authorization API requirements (Da Vinci CRD/DTR/PAS).

### Use 6: Sports / athlete use cases (low regulatory risk, high fairness risk)

- **Feedback classification:** Julia 1 or Laya, then a fine-tuned ModernBERT.
- **Personality and program fit:** Kev Score questions, presented as ranked candidates. Never automate recruiting decisions about minors.
- **NIL value:** gradient boosting over market data. A decision model can only choose a tier.

### Use 7: Verification / guardrails and ideation pipelines

- **Verifier:** Granite Guardian 4.1 8B.
- **Candidate ranking:** CLM-8B, which was built as a "verifier that picks the best one" (31/38 on DeepSWE held-out). Pair it with a generator.

## 9. Comparison vs. Jev

| Dimension | Jev (hosted) | Self-hosted stack |
|---|---|---|
| Latency | 70–500 ms end to end (vendor) plus network | Encoder 18–40 ms GPU / 33 ms M4 / ~200 ms phone CPU; Kev-4B ~0.2–0.5 s; Kev-27B and Guardian 8B GPU-bound |
| Cost | $0.042 per 1M input tokens (possibly subsidized) | Hardware only; near-zero marginal cost on device |
| Calibration | RLCD, "epistemically honest" (vendor claim, unverified) | Must be fitted: temperature scaling + conformal on your data; Kev-9B/27B come closest |
| Accuracy | Leads on knowledge, policy and many-label tasks (MMLU 0.90 vs. Kev-9B 0.74) | Matches on few-option tasks; weaker on many-label and date/policy reasoning |
| Privacy / HIPAA | PHI leaves your perimeter; no on-prem or BAA information found | Data stays on device or your infrastructure |
| Control | Same weights for every account, no fine-tuning | Full fine-tuning on counselor labels, with versioned models |

## 10. Recommended reference architecture

1. **Ingress (on device, Rust):** deterministic tripwires (crisis lexicon, PHI redaction), then a Laya/ModernBERT router via candle that returns calibrated probabilities.
2. **Decision service (candle-vllm fork):** a LitJev port on Qwen3.8-27B (or Kev-9B on smaller boxes) exposing `/v1/systemone`, with prefix state sharing and llguidance for generated fields.
3. **Guard tier:** Qwen3Guard-Stream-0.6B on generated output tokens, and Granite Guardian 4.1 8B as the sufficiency and groundedness judge.
4. **Calibration service:** stores temperature and conformal thresholds for each decision type, versioned, with separate calibration sets per counselor or clinic. Decisions come back as {act, review, escalate}.
5. **Audit tier (async):** gpt-oss-safeguard-20b policy review plus a transaction log. Counselor overrides are fed back as training labels.
6. **Clinical tier (on-prem GPU only):** MedGemma 27B text for prior-auth evidence extraction, with a person signing off on every output.

## 11. Practical next steps

1. Stand up Kev-4B and Laya-rust locally. Replay Jev traffic or TypeSafe's public evals to measure agreement and latency.
2. Build a labeled set of 500–2,000 Counsel Me examples (sufficient / escalate / crisis) with the counselor, oversampling crisis examples using synthetic data the clinician reviews.
3. Fit conformal thresholds for escalation and crisis recall, and report the resulting automation rate.
4. Prototype the LitJev port with a Gated DeltaNet state fork in candle. Validate it against Kev-27B on Kev's frozen suites.
5. Get legal review on Illinois HB 1806 and other state AI-therapy laws, HIPAA BAAs for any GPU host, and FDA CDS positioning for prior auth. Keep MedGemma use human-in-the-loop.
6. Encode 3–5 spine-surgery payer policies as atomic criteria, and build 100+ chart and criteria pairs labeled by the surgeon's staff.

## Caveats

- Nearly every Jev-alternative figure is self-reported, days old, and measured against Jev *reference values*, not a new Jev run in the same setup.
- The MedGemma 27B hardware figures are estimates. Guard-model benchmark leads come from the vendors.
- Crisis-detection performance depends on fine-tuning and data, not on which model you pick. Validate on your own population with clinician-labeled data.
- This is not legal advice.

## Sources

1. MarkTechPost — https://www.marktechpost.com/2026/09/19/typesafe-ai-releases-jev/
2. DataCamp — https://www.datacamp.com/blog/system-one-models-jev
3. System One Models — https://systemonemodels.org/examples/alternatives/
4. Kev-9B card — https://github.com/jaredpalmer/kev/blob/main/docs/model-cards/kev-9b.md
5. Kev-27B card — https://github.com/jaredpalmer/kev/blob/main/docs/model-cards/kev-27b.md
6. Kev — https://github.com/jaredpalmer/kev
7. Aitools (Kev) — https://jev.aitools.fyi/tools/jaredpalmer-kev
8. Julia 1 — https://www.marktechpost.com/2026/09/26/supersonic-labs-releases-julia-1-a-144-3m-parameter-open-decision-model-that-runs-on-a-cpu/
9. laya-rust — https://github.com/aovestdipaperino/laya-rust
10. krino issue 76 — https://github.com/Oaklight/krino/issues/76
11. CLM-8B — https://huggingface.co/Contrastive-LM/CLM-v0.1-8B
12. CLM-8B release — https://huelv.com/newsroom/16358-contrastive-lm-releases-clm-8b-an-open-system-one-model-that-scores-agent-actions-up-to
13. awesome-jev — https://github.com/fatwang2/awesome-jev
14. Jev alternatives — https://jevaiguide.com/jev-alternatives/
15. Kev README — https://github.com/jaredpalmer/kev/blob/main/README.md
16. Kev PLAN — https://github.com/jaredpalmer/kev/blob/main/PLAN.md
17. Qwen3Guard guardrails — https://amaarora.github.io/posts/2025-09-25-qwen3guard-guardrails.html
18. Qwen3Guard-Gen-8B — https://huggingface.co/Qwen/Qwen3Guard-Gen-8B
19. Qwen3Guard blog — https://qwen.ai/blog?id=qwen3guard
20. Qwen3Guard-Stream-4B — https://modelscope.ai/models/Qwen/Qwen3Guard-Stream-4B
21. Granite Guardian — https://github.com/ibm-granite/granite-guardian
22. Granite Guardian docs — https://www.ibm.com/granite/docs/models/guardian
23. Granite Guardian 4.1 8B — https://huggingface.co/ibm-granite/granite-guardian-4.1-8b
24. Ollama — https://ollama.com/library/granite4.1-guardian
25. Help Net Security — https://www.helpnetsecurity.com/2025/10/29/openai-gpt-oss-safeguard-safety-models/
26. LM Studio — https://lmstudio.ai/models/gpt-oss-safeguard
27. gpt-oss-safeguard guide — https://developers.openai.com/cookbook/articles/gpt-oss-safeguard-guide
28. arXiv 2609.06263 — https://arxiv.org/pdf/2609.06263
29. arXiv 2603.04445 — https://arxiv.org/pdf/2603.04445
30. Arch-Router paper — https://pith.science/paper/2506.16655
31. Arch-Router-1.5B — https://huggingface.co/katanemo/Arch-Router-1.5B
32. GLiClass — https://github.com/knowledgator/gliclass
33. arXiv 2609.02292 — https://arxiv.org/pdf/2609.02292
34. GLiClass paper — https://www.researchgate.net/publication/394439683_GLiClass_Generalist_Lightweight_Model_for_Sequence_Classification_Tasks
35. candle-pipelines — https://lib.rs/crates/candle-pipelines
36. candle-semantic-router — https://docs.rs/candle-semantic-router/latest/candle_semantic_router/
37. candle-semantic-router ModernBERT — https://docs.rs/candle-semantic-router/latest/src/candle_semantic_router/modernbert.rs.html
38. MedGemma model card — https://developers.google.com/health-ai-developer-foundations/medgemma/model-card-v1
39. MedGemma 1.5 4B — https://huggingface.co/google/medgemma-1.5-4b-it
40. alphaXiv 2604.05081 — https://www.alphaxiv.org/abs/2604.05081
41. HAI-DEF terms — https://developers.google.com/health-ai-developer-foundations/terms
42. HAI-DEF prohibited use — https://developers.google.com/health-ai-developer-foundations/prohibited-use-policy
43. arXiv 2603.14631 — https://arxiv.org/pdf/2603.14631
44. arXiv 2604.09937 — https://arxiv.org/abs/2604.09937
45. arXiv 2605.16679 — https://arxiv.org/pdf/2605.16679
46. Zylos structured output — https://zylos.ai/research/2026-04-11-structured-output-constrained-decoding-production-agents-2026/
47. llguidance — https://github.com/guidance-ai/llguidance
48. arXiv 2506.05583 — https://arxiv.org/pdf/2506.05583
49. NeurIPS 2024 — https://proceedings.neurips.cc/paper_files/paper/2024/file/d02ff1aeaa5c268dc34790dd1ad21526-Paper-Conference.pdf
50. CITI Program — https://about.citiprogram.org/blog/clinical-decision-support-compliance-fdas-2026-expectations/
51. CLM repo — https://github.com/Contrastive-LM/CLM
