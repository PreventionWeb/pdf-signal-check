# Semantic policy evaluation

For the separate chart/image-description experiment and the audit of prerequisites for useful AI, see the [issue #6 VLM spike](experiments/VLM-SPIKE.md). Its synthetic browser receipts do not extend the accuracy claims of the metadata evaluation below.

## Consistency follow-up (22 October 2026)

`evaluation/consistency-cases.json` fixes eighteen synthetic caption/description, contents/heading and numeric-statement cases before inference, split equally into development and held-out examples. Run the same browser-WASM worker with a custom dataset:

```sh
node scripts/evaluate-models.mjs --model minilm --cases evaluation/consistency-cases.json --output dev-corpus/minilm-consistency.json
node scripts/evaluate-models.mjs --model granite-r2 --cases evaluation/consistency-cases.json --output dev-corpus/granite-consistency.json
```

These developer commands explicitly request the selected pinned assets. Custom datasets and real-report receipts belong in ignored `dev-corpus/`; the default output path of the older CLI is public, so always supply `--output` for private data. No inference service receives the inputs.

Evaluation schema 2 adds target-ID selection, per-task/split usefulness, actual embedded-text/truncation counts and rule baselines. A numeric pair is `no-flag` only after both sentences were compared; unsupported inputs remain `unassessed`. “No flag” is not proof of correctness. Fact quantities are extracted from the case text at evaluation time. Rule-only numeric conflicts and combined rule/AI findings are counted separately, so an exact-wording conflict caught by rules is not credited to AI. Caption/contents baselines are explicitly labelled rule-clean pairs, after input ownership is checked; this harness does not establish that ownership from pixels. False flags, false reassurance, missed concerns and abstentions retain their denominators. Null precision means no labelled concern was emitted. Figure/contents/fact scores are excluded from the existing topic-cutoff sweep because those tasks use different policies. No threshold tuning occurs.

The recorded [MiniLM](../evaluation/minilm-consistency-observed.json) and [Granite](../evaluation/granite-r2-consistency-observed.json) browser runs were **before** the explicit-subset rule fix. Both found the paraphrased numeric conflict in development; MiniLM also flagged the unrelated caption and contents pairs, while Granite abstained on those. Neither added a true concern among the four held-out mismatches. Both gave relatedness to reversed chart values and the wrong year. MiniLM additionally flagged a legitimate “124 countries, 77 of which…” subset statement. That observed false flag led to a narrow subset-quantity guard and regression test in companion PR #7. The original receipts are preserved and labelled pre-fix; they are not post-fix accuracy results. This held-out set has now informed a fix and must be treated as regression material, not a fresh independent evaluation set.

The [companion fixes PR #7](https://github.com/PreventionWeb/pdf-signal-check/pull/7) contains the subset guard, caption-pairing fix, execution/truncation receipts and the actual CLIP worker smoke. They are deliberately excluded from this research branch, which can be reviewed independently. Its smoke verifies execution and token scope, not photograph/description accuracy.

Still outstanding: independently labelled real documents, rules-only versus AI ranking, precision@5 for image triage, multilingual task-specific accuracy, and controlled resource measurements. The private corpus is absent from this checkout. These synthetic examples neither validate the current provisional thresholds nor justify adding another model.

## Original metadata evaluation

The device benchmark measures resource cost. This harness separately evaluates semantic policy outcomes on `evaluation/cases.json`: eighteen manually authored synthetic cases with development and held-out labels, covering English/German titles, dates/editions, entities, topical keywords, translated wording and heading/body pairs. The split was assigned before running the shipped models. It is small and illustrative, not an independent real-world accuracy benchmark, and is insufficient to tune thresholds or promise hallucination prevention.

Run after a production build and local preview:

```sh
node scripts/evaluate-models.mjs --model minilm --url http://127.0.0.1:4178/ --output evaluation/minilm-observed.json
node scripts/evaluate-models.mjs --model granite-r2 --url http://127.0.0.1:4178/ --output evaluation/granite-r2-observed.json
```

The developer CLI requires installed `agent-browser`, opens its own named browser session, and invokes the served benchmark/evaluation worker using **browser WASM**. It does not require the optional native ONNX Runtime binary and does not change `npm ci --ignore-scripts` portability. It has a fifteen-minute deadline and reports errors instead of converting incomplete work into successful evaluation. The worker's actual selected model/revision/precision/backend/pooling/token cap is recorded. Downloads are potentially substantial; invoking the CLI explicitly requests them. Existing browser caches may reduce transfer cost. The CLI closes its session and writes a local JSON result only; it sends no PDFs to a server.

Metrics are separated by split:

- `falseIdentityMatches`: known wrong metadata that receives literal Match.
- `wrongMetadataRelated`: known wrong metadata that receives topical relatedness; this is a screening risk even though the app does not call it identity.
- `correctSupportRejected`: labeled support flagged as suspected mismatch.
- `uncertain`: inconclusive or unassessed outcomes, including unsupported languages/bounds.

Per-case rows retain the label, task, outcome, method and actual inference flag. Rule-settled identity cases avoid model computation; mixed-language MiniLM cases remain unassessed according to coverage. No score or percentage is a confidence probability, and no automatic threshold change occurs. Unit tests with injected vectors verify aggregation/policy only; they are not included as measured model accuracy.

Reading-order tests additionally exercise correct/flawed single-alignment heading sequences and a two-column abstention control. Those tests validate a narrow diagnostic, not universal reading order. Add independently labeled PDFs with unnumbered prose, real multi-column layouts, captions, tables, rotated pages, real multilingual titles, aliases and legitimate numbering restarts before expanding claims.

Recorded scores permit a descriptive sensitivity table for topic-support cutoffs, separately for development and held-out cases. The shipped mismatch cutoff stays fixed; tables report false topical support, missed mismatch, abstention and supported cases below each candidate cutoff. All title tasks are excluded from this topical sweep, including titles with recorded model scores. Rules-only title matches and unsupported-language rows have null scores. Candidate support cutoffs below the fixed mismatch cutoff are excluded, so sensitivity never promotes scores that the policy would reject. This is inspection evidence, not optimized policy. `observation` records the run date, browser-WASM backend and installed agent-browser version; cache source remains unknown.

A normal browser alternative is to serve the built app, open developer tools, create a module Worker using the built `benchmark.worker-*.js` asset URL, and send `{kind:'evaluation', requestId:1, modelId:'minilm', cases}` where `cases` is the repository JSON. Listen for `evaluation-result` or `error`, then terminate the worker. This is a developer interface, not automatic app behavior; sending the request authorizes the selected model downloads.

Observed browser-WASM run (2026-10-06, installed agent-browser version recorded in each JSON): both models produced zero literal false identity Matches and one false topical-support result among six held-out known mismatches. MiniLM left two of those mismatches unflagged; Granite left five unflagged, including inconclusive outcomes. MiniLM had four inconclusive/unassessed held-out outcomes, Granite six. These counts are case-specific and do not rank general model accuracy. Inspect per-row reasons/methods and the recorded cutoff sensitivity before considering new labels or thresholds. Current policy is unchanged.

The separate Granite resource pilot records a roughly 175 ms two-page parse, 14.28 s combined encoder load/initialization (network/cache unknown), and 3.27 s median of three warm four-input runs (range 3.20–3.29 s) on this development browser. The direct worker pilot did not collect page-visibility conditions, so it is functional evidence rather than a user-device timing guarantee. The app benchmark captures those conditions in its own receipt.
