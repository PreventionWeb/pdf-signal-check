# Spike: can a small local model check chart descriptions?

Date: 2026-10-22. Tracks [issue #6](https://github.com/PreventionWeb/pdf-signal-check/issues/6). This is a developer experiment, not a shipped model or a change to PDF acceptance. No production entry imports the spike. No PDF, crop from a real report, generated replacement alt text, or telemetry is sent to a service.

## Companion fixes

The prerequisite fixes are merged in [PR #7](https://github.com/PreventionWeb/pdf-signal-check/pull/7) and included in this research branch: conservative caption ownership, honest image execution/token receipts, an empty-check guard, visible workload coupling, preserved AI controls when metadata is missing, and a numeric subset rule regression. The audit below records pre-fix findings; its reproduction script now demonstrates the corrected behavior. The eighteen synthetic consistency cases remain regression material, not fresh held-out evidence.

A subsequent [real-report pilot](REAL-AI-PILOT.md) evaluated the existing production workers on five source versions, with 50 candidates labelled before inference. It found no validated additional concern, substantial coverage limits, and a nonblank-photo rejection problem. Source PDFs, labels, crops and detailed outputs remain local. Contextual post-result AI offers and an independent real-chart/OCR evaluation remain outstanding.

## Decision and scope

Keep chart-description checking out of the product until input association and independent evaluation are in place. A browser-compatible model and a small download are necessary but insufficient. Reading a printed value, attaching it to the correct series, and judging whether a description conveys the important message are three different tasks.

This spike supplies a reproducible browser-worker harness, fixed synthetic cases, raw output receipts and a review of prerequisites. The proposed 30–50 independently labelled real-chart/map crops have **not** been evaluated with the VLM. A separate existing-AI pilot now covers real text and photo inputs, with single-assistant labels and explicit limits; it does not satisfy that independent chart gate. Maps, multilingual images, dense legends and stacked/grouped bars remain untested by this VLM. A blank coloured panel is only a no-data control, not a substitute for photographs.

## Candidate check

Asset sizes below were checked against Hugging Face model manifests on this date. Decimal MB describe selected files, not transferred bytes or browser RAM; tokenizer/config/runtime costs are additional unless specified.

| Candidate | Evidence and decision |
| --- | --- |
| SmolVLM 256M | First executable probe. Original publisher's repository contains ONNX exports. Pin `7e3e67edbbed1bf9888184d9df282b700a323964`; q8 token embeddings (28,385,824 bytes), q8 vision (94,247,969), q4 decoder (86,562,901), tokenizer (3,548,256): **212.74 MB**, plus small configs and runtime. English only according to its card. Apache 2.0. |
| Florence-2 base-ft | Next OCR comparator, not an equivalent open-ended reasoning model. Publisher documents OCR, regions and caption tasks. ONNX export pin `e88a44eaf3791a35eae0c5a47b3dbcd36e67eb6f`: q8 merged decoder, token embedding, text encoder and vision total 274,966,163 bytes; tokenizer 2,297,961: **277.26 MB**, plus configs/runtime. Do not sum both merged and unmerged decoder variants. Not executed here. |
| Larger VLMs | Retain as research comparators only. A larger model's document benchmarks do not demonstrate usable browser memory, latency or false-flag rates for this tool. No large weights downloaded in this spike. |
| SigLIP / SigLIP 2 | Image/text retrieval and classification can improve triage, but cannot provide chart-value extraction. The issue's multilingual stepping stone needs a specific checkpoint and language evaluation; the SigLIP 2 card explicitly describes multilingual training. It is not a chart-reading alternative. |
| Dedicated OCR | Useful next baseline: recover printed tokens, retain locations and confidence/uncertainty, then compare only explicit values with source text. OCR alone does not recover chart semantics, unlabeled values, legends or whether a description is complete. Select/pin an OCR implementation before claiming a cost or quality advantage. |

Sources: [SmolVLM publisher card](https://huggingface.co/HuggingFaceTB/SmolVLM-256M-Instruct), [pinned files](https://huggingface.co/HuggingFaceTB/SmolVLM-256M-Instruct/tree/7e3e67edbbed1bf9888184d9df282b700a323964/onnx), [Florence publisher tasks](https://huggingface.co/microsoft/Florence-2-base-ft), [browser export](https://huggingface.co/onnx-community/Florence-2-base-ft), [SigLIP 2](https://huggingface.co/google/siglip2-base-patch16-224), [Transformers.js model registry](https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/models/registry.js). Installed Transformers.js 4.3.0 supplies the API used here; integration is verified by actual browser runs, not inferred from current upstream docs.

The issue's 3–5× download estimate is not the observed comparison for this SmolVLM configuration. It is about 2.4× CLIP's 89.12 MB vision half, or 1.4× CLIP's combined 153.62 MB vision/text halves when photo-description checking needs both. Adding it alongside CLIP still adds the full 212.74 MB; replacement would need an explicit, separately evaluated product decision. No model is silently replaced here.

## Reproduce

```sh
node scripts/vlm-spike/run.mjs wasm
node scripts/vlm-spike/run.mjs webgpu
# Optional, slower: pinned processor's original tiling/resolution
node scripts/vlm-spike/run.mjs wasm dev-corpus/vlm-spike/wasm-tiled.json --tiled
# Reproduce the caption-pairing/workload audit without model downloads
node scripts/vlm-spike/audit-inputs.mjs
```

Run sequentially for resource comparisons. Node 24+, installed dependencies and `agent-browser` are required. Explicit invocation requests the pinned model assets; caches may reduce transfer. A loopback-only Vite server supplies an isolated page and worker; the app UI, fonts and theme are not loaded. Model assets download from the model host; synthetic images are generated inside the worker. There is no remote inference. JSON goes into ignored `dev-corpus/vlm-spike/` by default. Only public synthetic receipts should be copied into `evaluation/`.

The default bounds preprocessing to one 512×512 image, including aspect-ratio distortion by this processor. `--tiled` uses the pinned 2048-long-edge processor defaults. Both policies are recorded with tensor shapes; these are different experiments. Greedy generation has a 96-token cap. The harness checkpoints complete rows, records errors and terminates its worker/browser at completion or a 15-minute deadline. It does not silently switch models or backends. Transfer, cache source and peak memory remain unknown. Timing includes preprocessing and generation, separately from load/init, and is not a device calibration receipt.

Eight fixed cases cover original/permuted three-bar charts, a raster table, a no-data panel, two correct descriptions, swapped values and a vague description. Values and expected outcomes were fixed before inference. Strict output scoring requires exactly the declared schema or one verdict word; malformed responses remain unassessed. They are not counted as correct, false flags or false reassurance. Manual reading accuracy must be reported separately: a wrong schema can still contain correctly read numbers. Conversely valid JSON can attach correct numbers to wrong labels. Unit tests verify scoring contracts, not model accuracy.

## Fixes to do before product integration

This audit records the checkout before the now-merged #7 fixes, not a rerun of the older 20-report review. Several earlier recommendations are already delivered: whole-document topic candidate selection, description rules and caption comparisons, receipts saying whether AI ran, and grouping that keeps aspirations out of headline tasks. See [current semantic behavior](../SEMANTIC.md) and [consistency work](../CONSISTENCY.md). Do not use the October 20 review's opening-only diagnosis as a description of today's code.

| Order | Finding, evidence and proposed fix | Completion criterion |
| --- | --- | --- |
| 1 | **Pair descriptions with the right source.** `src/engine/figure-descriptions.js:context` chooses captions by vertical centre distance alone, with no horizontal overlap, maximum separation or ambiguity guard. A synthetic left-column flood photo spanning x=10–260, y=30–290 pairs with right-column “Figure 2. Health expenditure” at x=330–580, y=150–170, instead of its own caption at x=10–260, y=320–340. The wrong caption then becomes model evidence. Use safe page-coordinate geometry, horizontal overlap, edge distance, bounded separation and abstention for competing/missing locations. Multi-line captions also need bounded joining. | Multi-column, adjacent-figure, distant-caption, missing-geometry and reused-object cases abstain or pair correctly; independently inspect the pairs before model evaluation. |
| 2 | **Measure incremental usefulness of the jobs that now ship.** `evaluation/cases.json` and its old receipts cover metadata/heading tasks, not the newer `figureItems`, `contentItems`, `factPairs`, CLIP relative ranks or duplicate-image flags. Figure/caption and contents comparisons reuse title thresholds (`titleLike` in `semantic.js`); these are not task-specific calibration. Collect independent labels and compare rules-only, text embeddings and image-model additions. Keep thresholds fixed for held-out documents. | Report yield, precision@5, false flags on correct descriptions, false reassurance on wrong values, abstention and coverage, separately by task/model/language. Do not count vector-stub unit tests as accuracy evidence. |
| 3 | **Record what image AI actually compared.** CLIP's `inferencePerformed` is derived from retained judgments, so encoded blank crops or too few usable descriptions can make actual work look unperformed. Its text tokenizer silently truncates and has no consumed-text receipt like `EmbeddingRunner`. Add attempted/encoded/usable counts, skip reasons, token truncation and crop identities. Preserve source/attempt guards and cancellation. | All-blank and fewer-than-five usable crops record execution separately from unassessed judgments; long alt text exposes consumed scope; failures/cancellation retain honest receipts. |
| 4 | **Make the optional workload explicit and relevant.** Figure, contents and fact jobs run independently of the four requested metadata checks; even `checks: []` with two facts and a caption pair invokes embeddings. This is documented behavior, not a claim of absent overall download consent. Expose those task families or clearly explain their coupling, and preflight eligible inputs before suggesting download/calibration. | A user can tell which useful jobs exist, what will run, what was budgeted out and why. No eligible task means no model initialization. |
| 5 | **Treat CLIP outputs as triage evidence.** Relative description rank depends on other descriptions in the current bounded pool; adding near-duplicate distractors can change a good description's rank. A high semantic image cosine is not a pixel fingerprint proving the same photograph. Chart exclusion is based on English words in the alt text, so an inadequately described chart can enter the photo comparator. Evaluate with distinct but similar photos, repeated pictures, equivalent descriptions and unnamed charts. | Stable, conservatively worded triage; no claims that ranks/cosines establish image identity or chart-description accuracy. Preserve unknown cases for human review. |

Caption ownership and execution/workload fixes are now merged. The real-report pilot supplies initial usefulness evidence and [updated priorities](REAL-AI-PILOT.md#next-work). Adding a larger model first would leave those remaining evidence-quality problems intact. No automatic threshold or production policy change is part of this spike.

## Observed browser results

The complete single-image WASM receipt is [recorded here](../../evaluation/smolvlm-256m-wasm.json). Chrome 153 on macOS reported ten hardware threads. First load/init was 9.89 s with cache/network source unknown. Preprocessing plus generation ranged from 14.59 to 58.18 s per case; this busy development host is not a performance benchmark. Diagnostic backend runs overlapped in part. A production recommendation needs sequential controlled measurements on audience devices.

| Case | WASM observation |
| --- | --- |
| Original chart | Recovered 2.8, 3.1 and 3.4, but returned one `label` and an array rather than label/value pairs. No valid structured answer. |
| Permuted chart | Human inspection can recover all three correct label/value associations from the malformed Python-like response. Strict protocol fails. |
| Raster table | Includes the printed values, but mixes `unit`, `unit_size` and numeric content under invented fields. No reliable structured result. |
| No-data panel | Invents a `header_1` list with repeated “1” strings and reaches the generation cap. Fails the no-invented-values control. |
| Correct original description | Describes a grid of coloured squares, without judging the description. |
| Swapped-value description | Returns the same grid description as the good-description case. Does not discriminate the supplied error. |
| Vague description | Returns “MATCH.” rather than UNCERTAIN. Punctuation makes the strict protocol invalid; its apparent judgment is also wrong. |
| Correct permuted description | Repetitive prose about a green spectrum/grid, without judging the description. |

All eight responses failed the specified output protocol. This is **not** a claim of 0% chart-reading accuracy: some values were visibly read correctly. It is also **not** a measured 0% false-flag rate: there were no valid judge decisions to evaluate. A looser parser would not repair hallucinated picture content or distinguish the identical good/bad responses. No prompt sweep, fine-tuning or task-specific decoding was attempted. Shorter per-label questions might work better and should be compared before rejecting this model for all uses.

The complete [single-image WebGPU receipt](../../evaluation/smolvlm-256m-webgpu.json) used a non-fallback Apple Metal 3 adapter, the same weights, images and prompts. Load/init was 21.99 s; preprocessing plus generation ranged from 8.57 to 12.21 s per case, under uncontrolled host conditions. All eight responses again failed the strict protocol. The original chart response invented **4.2**, which is absent from the image. The permuted chart retained the correct associations in the same malformed form as WASM. The table and blank control reached the token cap. All four description cases returned **“MATCH.”**, including the swapped-value and vague descriptions. Ignoring the period would make the correct descriptions usable judgments, but would also accept the deliberately wrong values. This is direct false-reassurance evidence, distinct from protocol failure. Neither backend/configuration is ready for product integration.

The original nine-tile diagnostic was deliberately stopped after the first completed case on each backend; incomplete receipts are [WASM](../../evaluation/smolvlm-256m-wasm-tiled-partial.json) and [WebGPU](../../evaluation/smolvlm-256m-webgpu-tiled-partial.json). WASM took 151.57 s and returned the three correct label/value pairs in a different schema. WebGPU took 87.27 s and described a nonexistent legend without returning values. These partial runs establish neither corpus accuracy nor a backend speed ranking. They show that preserving more image detail changes both cost and output and cannot be silently treated as the same configuration.

Initial spike verification (before the prerequisite implementation): `npm test` passed 56 files / 395 tests, including two scoring-contract tests; `npm run build` passed. Browser workers completed all eight cases on both WASM and WebGPU, and cancellation terminated the two tiled diagnostic workers. Production bundles contain no spike entry or SmolVLM model reference. That initial developer-only spike changed no UI or export layout. The companion fixes PR was separately checked with 406 tests, a production build, an actual CLIP worker smoke and desktop/mobile browser sessions at a repository-prefixed URL. After merging #7 and adding the local pilot workflow, this research branch passes 413 tests and its production build. PDF export layout was not changed. The independent real-chart VLM quality gate remains planned, not delivered.

## Gate for a follow-up

Build the issue's 30–50 labelled real-image set locally, split by document before tuning. Include good descriptions, wrong labels/values/units, missing main trends, legitimate concise descriptions, maps/legends, table pictures, photographs without numbers and instructions embedded in image/caption text. Verify crop completeness and caption ownership manually. Keep private crops, labels tied to source identities and raw real-report outputs ignored; publish aggregates only.

Compare rules/text-only triage, dedicated OCR, Florence OCR and the bounded SmolVLM configuration. For any VLM, extract evidence **without the proposed description first**, then run a separate description judgment: do not let a misleading description supply the values the model claims to see. The spike's direct judge prompt deliberately tests that risk; it does not solve it. Generated text is research evidence only and must never become suggested alt text or a Fix.

Predeclare at least 80% correctly associated key values (the issue's provisional floor), zero invented numeric facts on the photo controls, and a low false-flag ceiling (propose ≤5% on good descriptions) with denominators/uncertainty. A small set with zero errors cannot establish a 5% real-world rate. Precision@5 ≥0.8 must beat rules-only triage on held-out documents. Record language, device/browser, backend, resolution/tiling, token cap, first-load transfer, warm time/image and failure/cancellation behavior. Report backend disagreement; do not silently fall back or average outcomes. Speed, correctness and useful triage must each pass; profile acceptance remains independent.
