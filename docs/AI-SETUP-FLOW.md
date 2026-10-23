# Automatic AI setup — 23 October 2026

## Delivered behavior

The first PDF, sample or batch waits for explicit download permission. Granite R2 is the single text-model choice; all four text comparison groups run by default. Image-model downloads have a separate checkbox and visible costs. MiniLM remains pinned for historical reports and developer evaluations, not normal setup.

The consent action starts a synthetic text speed test before processing the selected PDF. A valid saved Granite receipt avoids repeating it. The test can be canceled; its failure does not prevent continuing with AI. Continuing saves permission for automatic eligible AI after standard analysis on subsequent PDFs. Opening Settings, help, or restoring saved preferences starts no model work.

Skip AI for this intake runs standard checks without saving an AI-off default. During AI, skipping retains completed standard results. Batch screening has an independent abort scope: it terminates the current model request, waits for settlement, ignores late callbacks, and preserves the source/hash/attempt/requested settings. Following files retain the frozen batch settings. A new batch restores the default; historical frozen retries keep their recorded model.

The new automatic-run policy uses fresh version 2 consent. Earlier MiniLM, Granite or standard-only settings do not silently authorize it. Existing report provenance remains authoritative. Missing language still requires a per-PDF English assumption; unsupported languages, absent comparison evidence and insufficient usable image crops skip honestly. AI never changes deterministic profile acceptance.

## Verification

Final combined verification passed: **560 tests in 67 files**, `npm run build`, and `git diff --check`. The build retains the existing large-chunk warning.

Production browser checks used `/pdf-signal-check/` at desktop 1440×1000 and mobile 390×844:

- First sample held before consent, with no workers and no external requests beyond approved theme assets.
- Explicit consent started one benchmark; completion was disabled while busy. Cancellation terminated it; an injected worker failure left retry and continuation available.
- Real standard analysis and real Granite inference completed automatically after continuation, with the actual model identified in the result receipt.
- A real synthetic benchmark completed (0.17 seconds PDF preparation, 3.33 seconds model startup, 2.92 seconds median warm text comparison on this device). Returning to setup reused its valid receipt without constructing another benchmark worker.
- Reset followed by current-intake skip produced standard results without persisted consent or an initial optional-AI offer.
- Active AI skip in a real two-file batch retained the first PDF’s standard result and advanced to the second.
- Mobile and desktop had no horizontal page/dialog overflow. Export layout was not changed.

Controller and worker-adapter tests cover consent migration, no work on preference restoration, held intake, stale callbacks, image recovery, batch cancellation settlement and historical retry identity. Independent red-team review identified existing-results setup and newly consented image recovery gaps; both were fixed and independently rechecked with regression coverage. The reviewer’s 98 focused tests and independent text/image worker reproductions passed; no unresolved P1/P2 finding remained. The remaining wording cleanup replaces the old optional-AI offer with a missing-language recovery action, with 24 focused contracts passing and coordinator review of its consent and idle-state guards.

## Limits

The speed receipt measures a fixed synthetic text workload on one device. It does not predict a PDF’s total processing time, image-model speed, accuracy or available RAM. Downloads and browser caching vary. Image inference needs eligible evidence and separate consent; the batch workflow retains its existing text-screening scope. AI numerical candidates remain experimental technical evidence, outside tasks, scores and headline counts.
