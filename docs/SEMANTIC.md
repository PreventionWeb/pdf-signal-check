# Browser-local hybrid semantic screening

## Default evaluation workflow

The UI offers two-step setup before selecting single or multiple PDFs.
First, an optional MiniLM baseline benchmark runs the fixed synthetic workload
and saves its per-model receipt in browser
local storage, and summarizes observed speed as Great (≤1.5 s), OK (≤5 s), or
Not recommended (>5 s). These are product responsiveness bands for four fixed
inputs, not validated hardware requirements, document timing predictions or
accuracy grades. Hidden/interrupted runs are unrated. Saved results expire after
30 days or browser/model configuration changes; blocked storage leaves the
current result usable. Only synthetic timing receipts and notice preferences
persist, never PDF content or model-download consent.

The second step compares options in a feature matrix and defaults to MiniLM for English PDFs. No AI is the last option, reserved as
a fallback when local AI cannot run.
Continuing without AI runs deterministic checks without model downloads.
Explicit “Use selected model and continue” consent enables the chosen model for every
PDF in this session, including the batch default. Single-document analysis
chains into model screening; missing/unsupported language pauses instead of
silently substituting models. A missing declaration still permits an explicit
English assumption. Failed, canceled or evidence-free AI runs expose partial
text results, without claiming a completed AI evaluation.

In this workflow, `requireInference` requests title relatedness even when title
identity rules already settled the title. That separate `titleAI` advisory
records actual model execution and never overwrites `title` identity findings,
wrong-year warnings or profile acceptance. Insufficient comparison evidence
still abstains; no artificial model inputs are invented merely to claim AI ran.
The underlying assessment API and historical developer corpus continue to
support the prior hybrid rules-first mode when that flag is absent. Existing
recorded corpus metrics have not been rerun or relabeled for this new workflow.

## Model policy and historical hybrid mode

App 0.4 offers explicit model and check selection before inference. Changing a selector downloads nothing. Running a requested check may download model/tokenizer/runtime assets. PDF text stays in a dedicated local worker. These are embedding encoders, not generative LLMs: they screen relatedness and cannot certify identity, reading order, roles, factual claims, or freedom from hallucinations. Text profile 0.2 remains independent.

## Shipped model choices

| Model | Pinned browser export | Graph / tokenizer bytes | Configuration |
| --- | --- | --- | --- |
| MiniLM, English | `Xenova/all-MiniLM-L6-v2` revision `751bff37182d3f1213fa05d7196b954e230abad9` | 22,972,370 / 711,661 (~23.68 MB combined) | q8, WASM, attention-masked mean pooling, L2 normalization, 384 dimensions, no prefix, 256-token application cap |
| Granite R2, multilingual | `onnx-community/granite-embedding-97m-multilingual-r2-ONNX` revision `536a9f241cb3f02a9c5995a1e708c784bd274859` | 97,858,099 / 25,301,671 (~123.16 MB combined) | q8, WASM, first-token CLS pooling, L2 normalization, 384 dimensions, no prefix, 512-token application cap |

Sizes are decimal bytes from pinned Hugging Face model-tree artifacts, excluding runtime/configuration assets, and are not RAM estimates. Transformers.js and the approximately 26.86 MB uncompressed WASM runtime add cost. Browser caching is implementation-dependent. Performance must be measured on the user's hardware; model size alone is not a latency benchmark.

The registry is [models.js](../src/engine/models.js). MiniLM has explicit English coverage. Granite enables the 52 enhanced-support languages named by IBM, including German; Norwegian `nb`/`nn` variants map to its `no` coverage. IBM's wider 200+ language pretraining is not treated as a tested blanket capability. Missing, invalid, or out-of-coverage language declarations prevent model inference while deterministic title rules still operate. For a missing declaration only, single-document review offers an explicit English assumption for optional screening. Choosing it makes no downloads; a separate run action authorizes assets. It cannot override an existing declaration, changes neither PDF metadata nor profile acceptance, and resets on source changes. The result records `languageContext` with the original declaration, screening language and `user-assumption` source; review and PDF/PNG/JSON receipts retain that distinction. Batch defaults continue to require a supported declaration. This is a declaration/assumption guard, not language detection or proof the content uses that language.

Primary references: [MiniLM browser export](https://huggingface.co/Xenova/all-MiniLM-L6-v2), [original MiniLM](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2), [IBM Granite card and unprefixed examples](https://huggingface.co/ibm-granite/granite-embedding-97m-multilingual-r2), [Granite pooling configuration](https://huggingface.co/ibm-granite/granite-embedding-97m-multilingual-r2/blob/main/1_Pooling/config.json), [Granite browser export](https://huggingface.co/onnx-community/granite-embedding-97m-multilingual-r2-ONNX), [Transformers.js feature-extraction implementation](https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/pipelines/feature-extraction.js).

## Rules first, AI where useful

- **Title:** credible first-page H/H1 or cover lines (font height at least 85% of the maximum) supply candidate evidence. Rules establish normalized string agreement or preserve Info/XMP, year, term-substitution and edition warnings before AI. Settled title comparisons skip embedding computation. Only ambiguous multiword titles are screened for relatedness; later references/body-size lines cannot establish identity.
- **Subject:** compares Info Subject with bounded opening excerpts. A related passage supports the topic in that opening scope, not every section of the PDF.
- **Keywords:** comma/semicolon/newline delimiters define up to twelve terms or phrases, screened independently. Space-only metadata is one undelimited phrase; the app does not invent individual keywords. Related terms cannot average away separately flagged terms. Individual false positives remain possible. Evaluated/total/skipped counts are exported; skipping terms prevents an all-related aggregate.
- **Headings:** up to six supplied tagged heading/following-text pairs receive a bounded topical comparison. At least 80 body characters, same-page evidence keys and an actual H/H1–H6 role are required. Single-word/common generic headings are skipped. These are topic clues, not role correctness, order validation or factual reasoning. Supplied/evaluated/skipped counts are exported; skipped pairs keep overall assessment uncertain.

Author/byline identity, numbered-step order and text visibility remain deterministic advisories. Embeddings cannot override those rules or profile acceptance. No custom-question answering or generative summarization is provided.

## Bounds, provenance and uncertainty

Metadata queries are at most 350 characters; credible titles at most 200 characters/25 words. Opening evidence uses pages 1–2, at most 100 blocks, six excerpts of at most 800 characters, requiring 80 characters. Heading bodies are independently capped at 800 characters; automatic grouping examines only the first three pages and 200 logical blocks per page. Transformer batches contain at most four texts, limiting padding and attention cost.

The worker explicitly tokenizes with truncation and the selected 256/512-token cap. Every embedded input exports input token count, consumed token count, truncation flag and decoded consumed text. Query and evidence results reference this provenance. Decoded consumed text normalizes tokenizer spacing and excludes special tokens; it is not a byte-exact substring or character-offset guarantee. Original evidence and token-consumption limits remain inspectable separately.

Each check is `match` (rules only), `semantically-related`, `suspected-mismatch`, or `uncertain`. A high cosine score is relatedness, not a probability or identity proof. Missing/unsupported evidence stays uncertain. Heading genericity, later-document topics, mixed languages, names, translations, negation and editions remain limitations.

Provisional, **uncalibrated** policies differ by model:

| Model | Title weak / related | Topic weak / related |
| --- | --- | --- |
| MiniLM | below 0.35 / at least 0.75 | below 0.20 / at least 0.45 |
| Granite R2 | below 0.50 / at least 0.90 | below 0.45 / at least 0.80 |

Intermediate scores remain uncertain. These manually selected policies are conservative starter heuristics, not empirical PDF calibration or comparable confidence across models. General retrieval benchmarks do not validate these thresholds. Maintain separate labeled evaluation for each model/precision/backend before operational gates.

## Integration contract and lifecycle

Worker input: `{requestId, modelId, checks, metadata, candidates, openingEvidence, deterministicTitle, sections, languageAssumption}`. Model IDs are registry keys `minilm` and `granite-r2`; checks are `title`, `subject`, `keywords`, `sections`. `sectionEvidence(pages)` can create bounded heading/body pairs from tagged logical blocks. Unsupported model/check IDs fail explicitly with no silent fallback.

Result schema 2 preserves `title`, `subject`, `keywords`, `assessment` (title alias), `ranked`, `note`, plus `sections`, `keywordItems`, `sectionItems`, coverage counts, requested checks, selected pinned model/thresholds, `inferencePerformed`, embedded text count and per-input token provenance. Per-field `method`/`inferencePerformed` distinguish rules, skipped checks and actual AI. Evidence preserves page/node/content keys/block IDs.

The worker caches one loaded encoder. Same-model runs reuse it; switching models disposes the previous encoder before loading the chosen one. Failures dispose the current instance and report an error without substituting another model or manufacturing results. Every progress/result/error echoes requestId. UI cancellation terminates the worker and guards stale responses by request/job/worker identity.

## Deferred alternatives

[Potion-base-2M](https://huggingface.co/minishlab/potion-base-2M), revision `389b9f64be5aa4ae7a6bc6fe95ef20ce485ae5da`, offers a 7,563,349-byte ONNX graph and MIT licensing. Its static `model2vec`/`StaticModel` configuration has no mapping in installed Transformers.js 4.3.0, requiring separate verified integration. It remains a smaller-download comparison, not a contextual drop-in. The MiniLM q4 export here is larger than q8; precision labels do not imply download size. Multilingual E5-small is a useful future control but needs its own prefixes, model verification and policy calibration; it is not shipped in this cycle.


## Resource and policy measurements

App 0.6 shares the pinned embedding runner between semantic screening, an explicit fixed-synthetic browser benchmark and the developer evaluation harness. The benchmark never consumes uploaded PDF content, measures combined load/initialization separately from warm computation, leaves RAM unknown and makes no document ETA/device certification claim. The runner validates each batch before publishing completion. See [semantic evaluation](EVALUATION.md) for separate development/held-out policy outcomes; benchmark timing cannot calibrate semantic thresholds.
