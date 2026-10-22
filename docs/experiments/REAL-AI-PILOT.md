# Existing AI usefulness: real-report pilot

Observed 22 October 2026, after [#7](https://github.com/PreventionWeb/pdf-signal-check/pull/7) merged. This evaluates existing MiniLM, Granite R2 and CLIP workers, rather than a new VLM. **No validated additional concern was found in this pilot.** This is a small diagnostic result, not evidence that these models never help.

## Method and limits

Five unmodified publication versions, 743 pages, were analyzed locally. A checker report was excluded during source verification. This is a convenience sample, English-focused, with uneven tagging and metadata; source versions are not guaranteed to be publisher-final editions. Some source families have appeared in development before. It is not a fresh held-out benchmark.

One assistant reviewer visually checked source pages and photo crops before inference. Thirty text targets and twenty photo candidates were labelled and sealed with original-byte, request, report, label and crop hashes. The 30 text targets comprise 24 spread heading/body pairs, three cross-page numeric pairs enriched for differing values and lexical overlap, and three unresolved name variants. No mismatches were manufactured to increase the positive count. Labels were 26 support / one association mismatch / three uncertain for text, and sixteen support / zero mismatch / four uncertain for photos. Three uncertain photos had no safe crop; the other had partial evidence. These are **not independent human labels**.

Both text models received complete production document requests, including current budgets, language guards and nearby-section policy. This avoids testing isolated sections under a different decision policy. A missing declared language prevented text inference on one document; no English assumption was supplied. Selected targets budgeted out or rejected as generic headings remain not run.

CLIP received each document's available photo crops. PDF.js Node canvas used the production crop-geometry and render-budget helpers. This tests the worker on realistic crops, but does not establish pixel-identical browser cropping or exercise the full production UI/controller. Each document worker was terminated after its request; the runs are not warm-batch speed, transfer or RAM measurements. Inputs and detailed outputs remain ignored/local. Only [aggregate counts](../../evaluation/real-report-pilot-aggregate.json) are published; the [developer workflow](../../scripts/real-ai-pilot/README.md) documents reproduction with a local corpus.

## Coverage before quality

| Recovered input | Count |
| --- | ---: |
| Heading/body candidates | 131 |
| Numeric sentence candidates | 387 |
| Unresolved name pairs | 3 |
| Safe description/caption pairs | 0 |
| Unmatched contents entries with target headings | 0 |
| Saved figure descriptions | 42 |
| Eligible photo descriptions | 20 |
| Available photo crops | 17 |

Three documents had no saved figure descriptions. Caption ownership guards yielded no safe pairs in this sample; this does not imply the publications have no printed captions. Missing input is a coverage finding, not a successful comparison. No caption or contents usefulness claim can be made here. Four decoration candidates were inventoried but not evaluated; duplicate-image usefulness was also outside the labelled task.

## Text observations

| Frozen sample, 30 targets | MiniLM | Granite R2 |
| --- | ---: | ---: |
| Targets inferred | 25 | 15 |
| Not run | 5 | 15 |
| Uncertain after inference | 9 | 9 |
| Concerns on labelled mismatches | 0 | 0 |
| Concerns on labelled support | 0 | 0 |
| Concerns on uncertain inputs | 1 | 0 |

The one labelled association error remained uncertain under both models. It involved a statistic fragment treated as a heading and paired with another block. Topical similarity does not validate heading roles; this is an evidence/role limitation, not an estimate of factual-error recall. Neither model explicitly reassured on that mismatch. Absence of a numeric concern is also not a correctness judgment.

Across complete workloads, MiniLM screened 88 heading/body pairs and 377 numeric sentences; Granite screened 50 and 237 respectively. Their smaller/larger downloads should not be confused with equal workloads: production budgets differ. No tokenizer truncation was recorded for the tested text inputs, although upstream excerpts remain bounded.

MiniLM produced one section concern and one numerical concern outside the frozen targets. A separate **post-output** visual audit found both to be false alarms: fragmented heading evidence in one, and sentences referring to different hazard contexts in the other. This audit was not folded back into the blind labels. Granite produced no section or numerical concerns. MiniLM's concern on an uncertain name target did not establish incorrect metadata: candidate ownership remained unresolved.

The existing rules left the selected name pairs unresolved, and the selected numeric pairs did not meet the identical-wording conflict rule. Photo candidates had passed the deterministic description filters. No validated incremental AI concern over those baselines was observed. This is not a precision comparison for every deterministic check: structural/decorative rule findings were not independently labelled in this pilot.

## Photo observations

CLIP encoded seventeen crops. Its semantic blank-panel classifier excluded **four visibly nonblank photo crops**, leaving thirteen usable by its own filter. One document then had only four usable descriptions, below the five-description minimum, so none of that document's descriptions were ranked. The other document supplied nine ranked descriptions.

One of those nine was flagged despite its pre-inference support label. No known wrong photo descriptions were present, so recall and a meaningful precision@5 benchmark are unavailable. The observed one-in-nine false alarm is a small diagnostic denominator, not a calibrated population rate. No description-token truncation was recorded. Ranking remains dependent on the current pool; an unflagged description is not verified alt text, and dates, places and identities cannot generally be confirmed from pixels alone.

## Next work

1. **Repair evidence before changing thresholds or adding weights.** Preserve relevant heading/hazard/time/scope context for numeric comparisons; join wrapped headings before creating section/name candidates. Evaluate this against separately reviewed examples that include genuine contradictions as well as legitimate different measurements.
2. **Replace or constrain semantic blank rejection.** A semantic label is insufficient evidence that a crop is visually blank. Test a bounded pixel-content check and crop completeness/whitespace handling against photos, panels and clipped images. Keep unavailable crops separate from blank images and expose insufficient-pool coverage.
3. **Make the optional offer depend on recovered jobs.** After deterministic results, explain which comparisons are actually available and why some cannot run, then offer explicit local model consent. The sparse input coverage here strengthens the case for that flow.
4. **Continue chart research with an OCR baseline and independent labels.** This pilot does not deliver the issue's independently labelled chart/map set, real-chart VLM evaluation, wrong-value controls, multilingual evaluation or controlled device measurements. Keep #8 a draft and retain the VLM integration gate.

No production behavior, model, threshold, UI, export or acceptance rule changed in this follow-up. Verification: production browser-WASM workers completed five requests per text model and two CLIP workloads; source pages/crops were visually reviewed; 413 unit tests and the production build passed. Unit tests cover seal/privacy contracts, not model accuracy.
