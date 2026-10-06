# 04 — Processing progress and device calibration

Status: structured progress delivered in app 0.5; app 0.6 adds the opt-in synthetic browser benchmark with an honest timing receipt. The full unified event envelope and predictive document timing remain future work. Depends on the existing analysis/model workers, pinned model registry, explicit model/check selection, cancellation guards and bounded preview. Text profile 0.2 and semantic policies do not change merely because progress or benchmarking is added.

## Current evidence and gaps

Historical app 0.4 emitted coarse analysis percentages with page updates before inspection finished, plus model download strings without inference-batch events. App 0.5 now emits actual completed-page counts after inspection, per-asset loaded/total bytes when supplied by download callbacks, indeterminate preparation/encoder initialization, initialization completion, and completed inference batches/text counts. Legacy analysis percentages remain compatibility stage estimates (`percentIsStageEstimate: true`), not measured end-to-end progress. Inference uses batches of at most four texts, with 256-token MiniLM and 512-token Granite caps. The preview renders separately after analysis; it can fail without invalidating an analysis result. Export currently creates a JSON download without acknowledgment that the browser saved it to disk.

Verified browser pilots established that both q8/WASM models can run, switch and truncate on the tested browser. They did **not** establish a dependable seconds-per-document figure, device requirements, peak RAM, a desktop speed guarantee, or an estimate for fifteen real PDFs. Treat these timing/memory quantities as unknown until instrumented and measured.

## Target V1 user experience

Delivered stages cover parse/page and model work; app 0.6 provides a standalone explicit benchmark. Its receipt separates synthetic fixture parse, combined encoder load/initialization, one warmup and three warm runs. Read/hash byte events and the full unified event schema remain proposed.

Show independent stages with actual work units. Avoid a single invented end-to-end percentage.

| Stage | Honest progress | Completion boundary |
| --- | --- | --- |
| Read file / hash | Reading or hashing; byte progress only if the reader exposes it | Bytes read / digest available |
| Parse / inspect objects | Activity indicator; discovered page count when available | Parsers and raw traversal complete |
| Inspect pages | `Completed 7 of 20 pages`; optionally `Inspecting page 8` | Increment after inspection returns |
| Download assets | Current asset and received/total bytes when known; separate assets | Required assets available, not encoder ready |
| Initialize encoder | Activity indicator and elapsed time | Selected pinned encoder initialized |
| AI screening | `Completed 2 of 5 inference batches` and text counts | Batch vectors validated; policy aggregation complete |
| Preview | `Rendering page 1`; separate from report completion | Render promise resolves or explicit preview error |
| Export | `Preparing report`; then `Download requested` | Blob/link available; no unsupported disk-save claim |

Cache hits, local initialization and missing transfer totals need their own labels. Pinned graph/tokenizer sizes inform expected first-use cost, not exact transferred bytes: smaller configuration files, the WASM runtime, server compression and cache behavior differ. Never infer a byte total from download percentage alone or count repeated callback updates twice. If total bytes are unknown, display bytes received plus an indeterminate indicator.

A completed check can legitimately return fail, indeterminate or uncertainty. Say processing completed with that result; do not label a canceled/errored stage successfully completed. Keep structural acceptance, optional AI status and preview status distinct. A rules-only selected screening can finish without loading a model, and should say so.

Immediate results should appear immediately. A brief CSS transition can acknowledge success, respecting reduced-motion settings, but must not delay results, extend work to a minimum duration, invent intermediate progress, or animate through fictitious processing steps. Slow or idle phases show elapsed time, the current stage and Cancel. Do not manufacture a stall timeout or ETA from animation duration.

## Proposed event and receipt schema

The delivered worker messages retain `{type: 'progress', progress}` for analysis and `{type: 'progress', message, requestId, progress}` for model work. Actual detail fields are `stage`, `state`, `completed`, `total`, `unit`; downloads additionally include `asset` and `scope: 'current asset only'`, inference includes `completedTexts` and `totalTexts`, and analysis retains `phase`, `percent`, `percentIsStageEstimate` plus terminal `analysisComplete`. Unknown totals are null. Model request nonces and UI run/worker guards remain in use.

The larger unified envelope below is a proposal. Cross-worker document/run IDs, sequence counters, phase elapsed durations and timing receipts have not all been implemented:

Use one future event envelope across workers and UI adapters:

```js
{
  runId, documentId, requestId, sequence,
  phase: 'read' | 'hash' | 'parse' | 'pages' | 'asset-download' |
         'model-init' | 'inference' | 'aggregate' | 'preview' | 'export',
  state: 'started' | 'progress' | 'completed' | 'failed' | 'canceled',
  completedUnits, totalUnits, unit: 'bytes' | 'pages' | 'batches' | 'texts',
  elapsedMs, assetId, modelKey, message
}
```

Unknown totals are null. Elapsed durations are measured within the emitting context; raw `performance.now()` values from different worker time origins must not be directly subtracted. Use sequence/run identity for ordering. Count inference work after preparing/deduplicating requested inputs, so rule skips and missing evidence do not create fictitious batches. Emit both batch start and completed batch events; percentage should represent completed work.

A timing receipt stores per-phase durations, actual work counts, selected model/revision/precision/backend/token cap, cold/warm/unknown asset state, cancellation/error, and whether the page became hidden. Do not include PDF excerpts in a device benchmark record. Existing document reports can keep their current evidence under the normal export policy.

## Optional device check

Offer “Test this browser” after showing the selected model's potential download cost. Download consent is explicit; do not start a network/model benchmark on upload, model selection or page load. Structural checks remain usable without it.

The first version uses a tiny public synthetic fixture and fixed bounded embedding inputs spanning short titles and a few 256/512-token passages. Measure file parsing separately, model load and initialization together (network versus cache remains unknown), then one warm-up and three measured warm inference runs. The benchmark owns a separate encoder, releases it before completion, and cannot run alongside screening. Label the cache/load state; do not clear caches or pretend cached load is a cold network test. A benchmark budget and Cancel control bound this optional work. Report median and observed range, sample dimensions and the current browser session—not an inferred processor tier.

Display measured results such as “Three warm sample batches took … on this browser; large PDFs can differ.” Do not translate one tiny sample into a guaranteed document duration or a hardware allow/deny rule. A failed model load means that attempt failed, not that the user's device cannot process PDFs. Keep sleep/visibility changes in the record and discard or clearly flag affected samples.

Use monotonic `performance.now()` for short within-context durations. Long queue wall time is separate; sleep behavior differs across browsers. [MDN timing reference](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now)

RAM remains unknown unless a supported measurement is explicitly collected. `performance.memory` is nonstandard and can omit worker/other allocations, so do not show it as total PDF/model RAM or use it as a gate. `measureUserAgentSpecificMemory()` has availability/security restrictions; it is an optional diagnostic, not a GitHub Pages prerequisite. [Legacy memory limitations](https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory), [memory measurement requirements](https://developer.mozilla.org/en-US/docs/Web/API/Performance/measureUserAgentSpecificMemory)

Device calibration measures cost, not semantic accuracy. Similarity thresholds still require independent labeled positive/negative documents and a held-out set for each model/configuration.

## Acceptance criteria

- Unknown-duration phases remain indeterminate; displayed page/batch completion never advances before actual completion.
- Asset download, encoder initialization and inference are separately observable; repeated events do not inflate counts.
- No network/model action occurs before an explicit run/benchmark request; rules-only checks avoid unnecessary model load.
- Fast completion, long initialization, cache hit, unknown transfer length, worker error and cancellation each have honest terminal states.
- Stale events cannot affect a later run; Cancel releases the active worker and retains previously completed reports.
- Benchmark receipts identify fixture/workload/model configuration and measurement conditions, with no hardware guarantee or PDF-content telemetry.
- Preview failure and unavailable memory APIs do not change profile acceptance.

## Implementation order and deferred work

App 0.5 delivered initial structured worker events and guided stage presentation. App 0.6 adds the optional local device check with combined load/initialization timing and three warm-run measurements. Next extend general document instrumentation with the remaining unified event envelope. The batch controller in feature 05 consumes this same event contract. Defer predictive ETAs until varied real documents provide error bounds; defer universal hardware requirements, memory certification, cloud telemetry and automatic model substitution.


App 0.7's sequential queue forwards the same actual per-file page/asset/batch units. Queue counts describe item outcomes separately from profile acceptance; they do not create a common percentage across bytes, pages and inference. Benchmark and document processing remain mutually exclusive, and no batch ETA or hardware requirement follows from the observed tiny-workload receipt.

The optional browser device test now has an actual five-minute attempt deadline. Expiry terminates its worker, preserves an earlier completed timing receipt, and reports that this chosen time budget expired; it does not declare the device unsuitable. A focused lifecycle test verifies explicit start, completed-worker release, and timeout retention. The developer evaluation harness retains its independent fifteen-minute deadline.
