# Local real-report usefulness pilot

This developer workflow measures the existing production workers. Explicit `run.mjs` invocation requests the pinned model assets. Inference stays in a loopback browser; no evidence is uploaded. It is not a product entry point or an accuracy certification.

Keep **all** inputs, labels, original-byte hashes, crops, detailed outcomes and source provenance in ignored `dev-corpus/<pilot>/`. Never copy detailed receipts into `evaluation/`. Only reviewed aggregates may be published. Install dependencies and `agent-browser`; the renderer also needs PDF.js's optional `@napi-rs/canvas` Node backend. It uses the production geometry and render-budget helpers, with a different canvas backend from browser crops.

## Prepare and label before inference

Choose unmodified source versions, verify they are publications rather than checker outputs, deduplicate bytes, and retain private provenance. Analyze with `analyzePdf` from `src/engine/analyze.js`, then freeze `buildScreeningRequest` from `src/runtime/screening-request.js` with all four checks, no undeclared language assumption and the current production limits. Do not force inferred language into text-model requests.

The private directory contains:

- `protocol.json`: sampling, label definitions, reviewer, task boundaries and limitations, fixed before inference.
- `inventory.json`: array of `{id, sha256, sourcePath, reportPath, q, photos, coverage}`. `q` is the complete screening request. `photos` comes from `descriptionCandidates(report)`; `coverage` counts pages, sections, facts, figurePairs, contents, names, savedDescriptions, photoCandidates and graphicCandidates. Paths remain local. Use simple local source IDs.
- `cases-unlabelled.json`: bounded text targets with `{id, sourceId, field, input, page}` or `pages`. Supported fields are `section` (target `input.sections[0].heading.key`), `name` (`targetId`), and `fact` (exactly two original `input.facts`). Selection must precede outputs. The input is target evidence for review; inference runs the complete document request.

Run `node scripts/real-ai-pilot/render.mjs dev-corpus/<pilot>`. Visually inspect source pages and photo crops, check ownership/completeness, and label before inference. Save `cases-labelled.json` and `photos-labelled.json` (copied from the renderer's `photos-unlabelled.json`), with every row's `expected` set to `support`, `mismatch` or `uncertain`, plus a substantive `reviewNote`. Unavailable crops must be uncertain/unassessed. Treat location/date/identity claims that pixels cannot verify separately from the visible main subject. Do not invent incorrect examples to fill a sample.

```sh
node scripts/real-ai-pilot/seal.mjs dev-corpus/<pilot>
npm run build
npm run preview -- --host 127.0.0.1 --port 4178
# In another terminal, sequentially:
node scripts/real-ai-pilot/run.mjs minilm dev-corpus/<pilot>
node scripts/real-ai-pilot/run.mjs granite-r2 dev-corpus/<pilot>
node scripts/real-ai-pilot/run.mjs clip dev-corpus/<pilot>
node scripts/real-ai-pilot/summarize.mjs dev-corpus/<pilot>
```

`seal.mjs` refuses to overwrite an existing seal. Runners verify original PDFs, reports, complete requests, labels and crop hashes before inference. Do not replace a seal after seeing results; register a new experiment. Output files also refuse overwrite. A `*-partial.json` checkpoint is explicitly incomplete and is not accepted by the summarizer. Failed runs are not successful observations.

The runner uses production built workers, fixed model budgets and normal language guards. It terminates each document worker and closes its browser on completion/error/deadline. This isolates document lifetimes but is **not** a warm batch performance measurement. CLIP receives only the available description crops per document; missing crops change the bounded ranking pool. Blank crops can reduce that pool further.

`aggregate.json` has no document IDs or excerpts. Review it before publication. `*-labelled-outcomes.json` stays private. Inference coverage, abstention after inference and not-run targets are separate. `no-flag` for numerical/CLIP checks means absence of a concern, never verified correctness. Whole-workload concern counts include unlabelled cases; inspect them separately and identify that review as post-output, not blind validation. No recall or precision@5 claim is available without an adequate labelled positive/retrieval set. Never tune thresholds from this pilot and then describe it as held-out evaluation.
