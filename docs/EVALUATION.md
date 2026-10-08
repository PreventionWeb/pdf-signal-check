# Semantic policy evaluation

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
