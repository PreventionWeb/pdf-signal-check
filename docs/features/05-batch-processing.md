# 05 — Sequential PDF batch processing

Status: app 0.7 foreground queue delivered and independently validated with 15 files, retained exports, cancellation/recovery and actual browser-WASM model reuse. This feature targets a reviewable queue of approximately fifteen PDFs, including a session that could take thirty minutes. That duration is a resilience scenario, not a measured prediction. Persistence and background durability remain deferred.

## Delivered scope

Users select/drop PDFs, inspect names/sizes, choose traditional checks or explicitly authorize the displayed model/check settings, and start the queue. Settings are frozen when started. Twenty files, 300 MB total source bytes and 50 MB per file are the default admission caps; the analysis engine separately enforces 200 pages and its decoded/operator/traversal limits. There is one active source/hash/analysis/screening service, with no model substitution. Unsupported language/evidence stays explicitly skipped or uncertain.

Single-file analysis keeps its existing flow. Single-file and batch screening share the bounded request builder and semantic worker; they do not use the same queue controller. Worker ownership prevents simultaneous benchmark/single-file/batch execution. The batch client keeps one encoder warm across consecutive eligible files and releases idle workers when the queue finishes or pauses. Analysis workers and their nested PDF.js workers are disposed per item.

Rows retain profile outcomes separately from advisory concerns, uncertainty, AI skips/errors and processing status. Per-file progress uses actual completed pages, current-asset bytes and inference batches/texts, not a combined percentage or guessed ETA. One malformed file does not erase other results. A failed optional screening retains that document's structural report. Model initialization failure pauses scheduling and offers explicit retry or structural-only continuation instead of repeating a failed initialization fifteen times.

Users can pause after the current file, cancel the current file, stop all scheduling, reorder/remove queued items, skip queued items and retry failed/canceled/completed attempts. Pause finishes the current file; stop-all pauses and aborts it. Retry explicitly replaces the old outcome, clears stale provenance/progress/retention flags and uses a new epoch. Cancel is a processing outcome, never a compliance failure. Abortable FileReader reads and worker termination settle canceled attempts; an already running native hash can require bounded settlement before another service starts.

## Core and identity contract

`src/batch/queue.js` is DOM-free. Injected analysis, hash and screen services receive `{signal, configuration, onProgress}`; the scheduler owns sequencing and the browser client owns worker settlement. Async `destroy()` aborts the active attempt, releases handles/reports and invokes adapter disposal. Callback failures cannot wedge the scheduler. `src/batch/README.md` documents the API.

The delivered snapshot contains:

```js
{
  running, paused, activeId, configuration, modelFailure, observerError,
  budget: { estimatedSerializedBytes, limit, pendingSerializedBytes, measurement },
  items: [{
    id, name, bytes, epoch, status, phase, progress, sourceHash,
    requestedConfiguration, actualModel, summary,
    detailRetained, detailsReleased, error,
    timing: { startedAt, finishedAt, elapsedMs, conditionsAtStart, conditionsAtEnd }
  }]
}
```

File handles remain private in-session references. IDs distinguish duplicate filenames within a queue instance; SHA-256 identifies bytes when available without merging duplicates. Core epochs guard late results; worker request IDs and UI queue/source-generation guards prevent older attempts or cleared queue instances updating current state. A future unified cross-worker envelope with queue/run IDs is not fully implemented.

Timings use ISO start/end wall times and monotonic elapsed milliseconds measured in the queue's own context. Visibility/session conditions remain explicit, including unknown conditions. Sleep itself is not inferred with certainty. Observed timing does not create a future document ETA or hardware certification.

## Report retention and review

The report store estimates a default 20 MB of serialized UTF-8 JSON, **not RAM**. It may retain several full reports within that budget. Original source handles, parsed PDF state, model/WASM heaps, JSON serialization and temporary clones are outside the estimate. There is no hard browser-memory ceiling.

One completed pending report may spill beyond the serialized budget while scheduling is paused. No detail is silently evicted. Users explicitly export/release old details while retaining compact summaries, retain the pending report once it fits, or consent to summarize the pending item. An individually oversized report can be reviewed/exported with `getPendingReport(id)` before a discard decision; opening this clone adds temporary allocation outside the budget. ReportStore clones admitted reports and returns clones, preventing presentation edits from invalidating its estimate.

Compact summaries preserve required checks, title/author/order/visibility outcomes, normalized deduplicated finding counts, semantic check/item outcomes, skips/errors and model provenance. Requested settings remain distinct from actual inference. They omit page text and geometry. Opening retained results uses their original File/ID and completed report without running analysis again; only one document preview remains active. Detailed JSON/PDF/evidence exports operate on the selected report. Compact batch JSON avoids constructing an unrestricted all-document ZIP.

## Browser lifetime and privacy

The queue is foreground, in-session work. Hidden tabs, scheduling, sleep, navigation, browser discard or closure can interrupt/delay it. Closing/reloading loses queue state, File references and retained reports. Clear releases current session handles/reports; there are no saved local reports to delete. Nothing is automatically stored in localStorage, IndexedDB or a server. Downloads are requested artifacts, not verified disk saves.

[Page Visibility behavior](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) explains why hidden-tab progress is not a durability promise. A visibility warning is informational and does not change acceptance.

## Acceptance and validation

- Fifteen files run sequentially with one active document/inference request and attributable progress.
- Malformed, oversized, unsupported-language, model-error and canceled outcomes remain distinct.
- Pause, stop-all, cancellation, retry and pending reorder/remove reject stale events.
- Frozen model/check consent and actual inference provenance survive summary/detail release.
- Budget pressure pauses before detail loss and requires explicit retention choices.
- Pending oversized detail remains reviewable/exportable without hidden admission.
- Previewing retained results does not rerun batch analysis or accumulate every preview.
- Worker abort/disposal settles active promises, releases encoders and allows a fresh attempt.

Core tests cover fifteen-file sequencing, mixed failures, stale progress, cancellation/retry, model-init decisions, budget consent, immutable clones and lifecycle cleanup. Fake-worker client tests verify settlement and request/configuration routing; actual browser queue/model/preview checks are separate QA. Simulated slow service controls add no artificial delay to real processing. Large real documents still need performance characterization; tiny device benchmark timing is not a batch prediction.

## Deferred work

Persistent report storage/saved manifests, durable file permissions, reload recovery, concurrent PDF processing, automatic model switching, large ZIP generation, service-worker/background execution, parser/vector checkpoints, progress after tab closure and guaranteed ETAs remain future capabilities. Any persistence feature needs new explicit consent, quota/error handling and deletion controls; it is not part of this delivered foreground queue.

Observed browser-WASM model checks on the app 0.7 build verified one model initialization across consecutive English MiniLM files, explicit German MiniLM abstention with zero embedded inputs, and actual English/German Granite inference with bounded token provenance. The model worker was reused within each queue and all tracked main-thread analysis/model workers terminated at idle/clear. These observations verify runtime routing and lifecycle, not semantic accuracy or complete browser-memory reclamation. `actualModel` is populated only when inference ran; `semantic.model` retains the selected result configuration even for rules-only or unsupported-language outcomes.
