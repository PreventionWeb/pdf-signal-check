# AI evidence review corrections — 23 October 2026

This change corrects review claims and scoring. It does not establish model accuracy or expand the deterministic text profile.

## Current release policy: experimental numerical gate

The fresh synthetic confirmation prompted a presentation-only gate that supersedes the PR10 per-pair numerical AI Check/score policy described in the historical delivery and validation record below. Original `semantic.factPairs` are now experimental technical receipts only: exact statements, context, pages and similarity remain in Technical details → AI coverage, full-report appendix and captured JSON, but never normalized fix/check tasks, headline counts, scores or the concise PDF fix list. Deterministic identical-wording warnings remain normal Check tasks and zero-credit review signals; empty screens still receive no positive credit. Image candidate behavior and generic compatibility helpers remain unchanged. No source policy, model, threshold, snapshot or inference changed; see [numerical consistency](AI-NUMERICAL-CONSISTENCY.md).

## Delivered

- The numerical-disagreement screen is flag-only. Empty results receive `null` numerical credit, regardless of whether other AI work ran or whether numerical coverage was absent, partial or complete. Recorded rule warnings and completed per-pair AI warnings retain `0` as review signals. The audit label is “Potential numerical disagreements”. Empty screening can no longer raise the Consistency or Overall score.
- Numerical cards say “Compare these two numbers”. Text-embedding candidates are described as potentially related statements, not verified instances of the same claim. The next action compares population, measure, time period and scope before conditional correction in the source data/document.
- Sentence detail shows exact retained `sentence.context`, labelled “Context in the PDF”. Missing context stays absent. Context is plain source text: it receives no inferred bounding box, target, highlight or separate page action. Existing sentence targets remain unchanged.
- Normalized numerical findings now retain each exact context string as separate unlocated text evidence after the first two sentence entries, for both rule and AI candidates. The full-report appendix receives this evidence through the existing exporter. Normalized numerical and similar-image findings also carry their own scope-first/use-first explanation and conditional next step instead of the generic “Decide which is correct, update the others” consistency instruction.
- Image duplicates are presented as similar-image candidates. Technical evidence names the retained cosine similarity without converting it to “percent alike” or a probability. Guidance asks users to compare pictures and their use before changing descriptions; identical pictures in different uses can legitimately have different descriptions.
- Finding provenance, current capability copy and the image-candidate documentation use the same conservative claims. `factCoverage.compared` is described as screened statements, not verified pair judgments.

Saved report objects, source identity, model/worker lifecycle, profile acceptance and export layout code are unchanged. Existing `same-fact` / `same-image` identifiers are retained for compatibility. Presentation wording also flows to consumers of the existing normalized findings and review tasks, including the fix-list and full-report PDF exports.

## Verification

Focused regression coverage in `test/consistency-audit.test.js` verifies no score uplift for unrelated AI or empty numerical screens at absent/zero/partial/full coverage; positive warnings remain zero-credit signals; exact source context survives presentation without new geometry or evidence mutation; missing context stays absent; and image candidates expose cosine evidence without percent identity claims. `test/flag-checks.test.js` retains its ordering/method contract with the revised numerical card title.

- Focused review suite: 56 tests passed across five files.
- Full repository suite at the verification checkpoint: 64 files, 467 tests passed.
- Production build passed, with the existing large-chunk advisory.
- After the final wording and score-regression refinements: 23 tests passed across the audit, flag-checks and scores files.
- After the appendix normalization correction: 68 tests passed across consistency-audit, flag-checks, findings, scores, export and consistency. Regression coverage checks both rule and AI context retention, original whitespace, absent context, unchanged first two evidence entries and sentence targets, no context geometry/target, unchanged source reports, and conditional normalized guidance for both candidate kinds.
- The production build passed again after the appendix correction, with the existing large-chunk advisory; `git diff --check` passed.

Browser verification used an isolated `agent-browser` session `audit-review-4223331dde35` and an owned Vite server on port 4193 with base `/pdf-signal-check/`.

At `http://127.0.0.1:4193/pdf-signal-check/`, the normal preview gate and privacy notice were completed, then the public Partly prepared sample was analysed using standard checks. Results and page rendering were visually inspected at 1440 × 1000 and 390 × 844. No optional model inference was requested.

At `http://127.0.0.1:4193/pdf-signal-check/dev-corpus/review-audit/`, an explicitly labelled synthetic fixture rendered the real `ConsistencyDetail`, review-task and provenance functions against injected receipts. It used the pinned Mangrove stylesheet with its integrity hash. Desktop/mobile screenshots were visually inspected: statements, retained context, conditional action and image candidate wording remained readable; mobile document width equalled its 390 px viewport. Both technical disclosures opened. The second sentence's page action reported page 2 / block b; context added no action or target. Browser text inspection retained the original context newline.

The fixture and screenshots remain local and ignored under `dev-corpus/review-audit/`; the proof directory contains `synthetic-desktop.png`, `synthetic-mobile.png`, `review-app-desktop.png` and `review-app-mobile.png`. Synthetic receipts are UI evidence only: no model ran and no PDF was analysed by that fixture.

## Limits and follow-up

This verification does not measure model accuracy, real-world false-positive rates, true picture identity, or factual correctness. Numerical parsing/scope changes and model evaluation belong to separate work. The coordinator's initial PDF download/render inspection exposed the generic appendix instruction and missing sentence context; the normalization correction above addresses those findings without export layout edits. After the correction, the coordinator downloaded both PDF variants through the browser using explicitly synthetic numerical/image receipts. Poppler rendered the one-page fix list and four-page full report; visual inspection of the fix list and affected technical-appendix page confirmed readable wrapping, exact retained multiline context, conditional scope/use-first guidance, and no clipping or overlap. Artifacts remain ignored under `dev-corpus/review-audit/proof/final-*`. This verifies the affected export paths, not encoder accuracy or source crop quality. Independent integration red-team review remains a separate check. Historical validation receipts remain historical; this document records the current review claim corrections.

Integration export review also corrected kind-specific normalized explanations and next steps, so the technical appendix no longer instructs readers to change a value or description before checking scope/use. Source context is separate unlocated text evidence after the two original sentence entries; sentence targets retain their order. Focused integration checks passed 68 tests across six files.
