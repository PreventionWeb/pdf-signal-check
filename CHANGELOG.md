# Changelog

Updates to PDF Signal Check, newest first. Entries use dates rather than release versions and describe changes merged to `main`, unless marked as in progress. The initial entry groups the work delivered with the first preview.

## 2026-10-23

- In progress on the polishing branch: adapted the [GOV.UK Design System task-list principles](https://design-system.service.gov.uk/components/task-list/) for clearer task names, supporting hints, explicit statuses and quiet separators across review, settings, batch progress and device-test results. Mangrove remains the app’s design system. Completion indicators describe processing steps, not document correctness; unresolved findings remain separate from completed checks. Tightened the configuration dialog’s heading spacing. Fixed desktop review panes so their scrollable height fits the visible space below the header, allowing the middle column to scroll independently of the PDF.

- Simplified first-use AI setup to Granite R2, with explicit download permission, separate image-model consent and a skippable text speed test. Eligible AI checks now follow standard analysis automatically; AI can be skipped for an intake without changing future defaults. Earlier settings require fresh consent and historical reports retain their model provenance.

- Improved numerical comparisons to distinguish units, scales, dates, locations and other recovered context. Fixed grouped decimal parsing, percentage-point comparisons, rounding false alarms and comparisons involving several quantities.
- Bounded numerical comparison work and recorded when a limit leaves comparisons unfinished, without failing the PDF analysis.
- Kept AI-retrieved numerical candidates in experimental technical evidence, outside fix/check tasks, headline counts and scores. Setup explains this before download consent. Original statements and context remain available in Technical details and the full PDF report.
- Added reproducible evaluations using both shipped text models and 64 assistant-authored synthetic cases. The results show useful additional retrieval alongside unsupported flags; they do not establish real-report accuracy. See the [evaluation record](docs/experiments/NUMERICAL-CONSISTENCY.md).
- Improved saved-description and keyword comparisons in large reports by retaining relevant passages before document sampling, within the existing evidence and inference limits.
- Corrected numerical scoring so an empty AI result cannot earn positive consistency credit. Made text and image similarity claims more cautious, preserved source context in review and exports, and asked readers to compare scope or image use before making corrections.
- Added this dated changelog, linked from the app footer and README.

History: [#10](https://github.com/PreventionWeb/pdf-signal-check/pull/10), [#11](https://github.com/PreventionWeb/pdf-signal-check/pull/11), [#12](https://github.com/PreventionWeb/pdf-signal-check/pull/12).

## 2026-10-22

- Reworked results into an inbox with an in-place PDF viewer, highlighted evidence, word-level comparisons and source-edit guidance.
- Added consistency checks for titles, dates, draft labels, placeholders, declared language, contents entries, repeated quantities and heading tagging.
- Expanded graphic review, including rule-based decoration checks and optional local image classification and English photo-description comparisons, with separate model consent.
- Added one progress screen covering PDF analysis and optional AI steps, with progress, skipped-step explanations and cancellation.
- Changed single-PDF checks to show standard results first, then offer optional AI comparisons based on evidence recovered from that PDF. Saved settings do not automatically start AI for the next single PDF.
- Tightened caption ownership, preserved nearby context for numerical comparisons, and prevented comparisons across some distinct hazards, times and heading scopes.
- Replaced semantic guesses about blank crops with a pixel-content check. Improved image-only retry, cancellation and source ownership, and clarified insufficient comparison pools.
- Added clearer receipts for actual model execution, consumed text and token truncation. Clearing all text checks also disables accompanying text comparisons.
- Fixed graphics-heavy analysis failures, stale highlights, reading-order display recovery and numeric subset comparisons.

History: [#5](https://github.com/PreventionWeb/pdf-signal-check/pull/5), [#7](https://github.com/PreventionWeb/pdf-signal-check/pull/7), [#9](https://github.com/PreventionWeb/pdf-signal-check/pull/9).

## 2026-10-20

- Updated the pinned Mangrove components and PreventionWeb theme.
- Improved About-page typography, upload spacing and transitions using the design system's content and motion patterns.
- Let preview access persist across tabs for up to 30 days, with an explanation at the preview gate and improved focus after unlocking.

History: [#4](https://github.com/PreventionWeb/pdf-signal-check/pull/4).

## 2026-10-12

- Updated the pinned Mangrove components and PreventionWeb theme.
- Adopted shared progress bars for analysis, AI comparisons, device speed tests and batch processing; simplified loading announcements.

History: [#3](https://github.com/PreventionWeb/pdf-signal-check/pull/3).

## 2026-10-08

- Delivered the initial browser-local preview with checks for saved document information, text structure, reading-order clues, image descriptions, links, attachments and hidden instructions aimed at AI.
- Added guided single-PDF and foreground batch workflows, sample PDFs, evidence inspection and source-document repair guidance.
- Added optional English and multilingual text comparisons, explicit model-download consent and a separate device speed test.
- Added downloadable tagged PDF fix lists and full reports, JSON records and a summary image, captured from a fixed report/source snapshot.
- Added the UNDRR/PreventionWeb presentation, About page, narrated explainer and AI/privacy information. Activated GitHub Pages hosting.
- Published the project under the Apache License 2.0, with dependency and asset notices.

History: [initial implementation](https://github.com/PreventionWeb/pdf-signal-check/commit/b5a943d), [#2](https://github.com/PreventionWeb/pdf-signal-check/pull/2).
