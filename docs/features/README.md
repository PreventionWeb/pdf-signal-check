# Guided PDF review feature plan

Requested October 6, 2026. The guided single-PDF slice shipped in app 0.5; app 0.6 added human-readable PDF and dedicated PNG exports, cropped evidence, opt-in device calibration, and a labeled semantic evaluation harness. App 0.7 delivers the independently validated bounded foreground batch queue. The text profile remains 0.2. These briefs distinguish delivered behavior from deferred capabilities; see the [delivery audit](../DELIVERY.md).

The product should guide someone from understanding the tool to inspecting the problems in their PDF, with the clarity of a tax-software interview. The interface should ask for one useful decision at a time, retain earlier choices, and make the evidence and next action concrete.

## Intended journey

1. **Get oriented.** Explain local PDF processing, optional AI, external asset downloads, fallibility, and AI-assisted development. Retain the acknowledgement and notice preference. Offer a meaningful example or the user's own PDF.
2. **Choose the review.** Run traditional checks without an AI download, or select a supported recommended model or another model with visible language, download, and scope tradeoffs. Confirm before downloading or starting optional inference.
3. **See real progress.** Separate asset download, model preparation, PDF analysis, and inference. Fast completion should feel responsive; long jobs should expose actual work, elapsed time, cancellation, and recovery.
4. **Start with problems.** Summarize required failures, unsupported scope, and advisory concerns separately. Step through evidence, consequences, and practical source-document fixes. Missing assessment must remain visible.
5. **Keep a review record.** Export a human-readable analysis PDF or a snapshot, alongside the existing JSON. Clearly label the output as an analysis record, not a repaired PDF or certification.
6. **Explore further when needed.** Offer successful checks as a secondary view. Optional device calibration and the multi-file queue use the same review/report contracts.

## Feature briefs and assigned analysis

| Brief | Workstream | Status / dependency |
| --- | --- | --- |
| [01 — Guided onboarding](01-guided-onboarding.md) | UX agent: orientation, examples/upload, review/model choice, navigation | First slice delivered using the existing acknowledgement and model registry |
| [02 — Issue review](02-issue-review.md) | UX agent: issue-first overview, guided evidence frames, fix guidance, optional successes | Delivered, including bounded crops where trustworthy geometry is available |
| [03 — Results and exports](03-results-and-exports.md) | Independent review agent: human-readable PDF/snapshot and evidence fidelity | PDF, dedicated PNG, frozen JSON, source identity and omission labels implemented |
| [04 — Processing and calibration](04-processing-and-calibration.md) | Engine agent: honest progress, resource guidance, opt-in device calibration | Actual progress and opt-in fixed-workload timing receipts implemented; no hardware grade or guaranteed ETA |
| [05 — Batch processing](05-batch-processing.md) | Engine agent: bounded queue, per-file state, failures/cancellation | Delivered and independently validated, including recovery, retention decisions, model reuse and exports |

## Delivery sequence

**First implementation slice — delivered:** guided single-file entry and explicit run choice; issue-first summary and step-through review using existing title/author/order fixtures; actual worker page/download/inference progress and cancellation. The detailed inspection view and JSON export remain available as an advanced route. Review annotations stay in memory and do not alter machine outcomes. Independent review verified 74 tests, production build, mobile/Pages flow, real MiniLM inference, comparisons, cancellation, and focus; see [validation receipts](../VALIDATION.md).

**Second slice — implemented:** analysis PDF and dedicated PNG exports based on frozen finding frames; trustworthy bounded source crops; opt-in fixed-workload device calibration and measured resource guidance. Both shipped models also have recorded browser-WASM results on a small labeled development/held-out set; see [evaluation scope and limitations](../EVALUATION.md). No hardware requirement, model accuracy guarantee, or universal reading-order claim follows from these measurements.

**Third slice — delivered:** sequential multi-file queue with shared model reuse, isolated failures, per-file progress, cancellation, pause/stop/retry and pending reorder/remove. Admission is bounded to 20 files/300 MB total/50 MB each. Retained detail has a 20 MB serialized estimate plus one explicitly identified pending spill; it is not a RAM cap. Scheduling holds source File references and loads one document at a time. Budget pressure pauses for an explicit retention choice; no persistence or background durability is claimed. The final suite passed 122 tests across 14 files, the production build passed, and independent root/Pages/mobile/model/recovery checks passed.

The briefs may refine dependencies, but batch should build on the single-file flow rather than trigger a second competing UI.

## Shared rules

- Keep structural acceptance, metadata identity, semantic relatedness, and unassessed scope separate in every screen and export.
- Show detected problems first. Provide successful checks on demand; do not turn uncertain or unassessed outcomes into congratulations.
- Pair claims with recoverable evidence. A document-level metadata finding can lack a crop; a crop illustrates source evidence and does not prove that text is visually correct.
- Explain how to correct the source document or export settings. Do not imply that this app repairs PDF tagging or rewrites publication identity.
- Keep PDF contents local. Explain external model/site asset requests. Save no source PDFs or extracted content by default; exports remain user initiated.
- Treat progress as observed work. Do not simulate completion, fabricate a remaining-time estimate, or imply that a background tab can safely run indefinitely.
- Keep keyboard access, mobile layout, reduced-motion behavior, cancellation, and recovery part of each feature's acceptance criteria.
- Retain the GitHub Pages/static architecture and credit the reference projects.

## PM review gates

Before implementation, reconcile the briefs into one navigation/state contract and prioritize a bounded first slice. Before each commit, verify the relevant user journey against calibration controls and adverse cases. Use rendered visual QA for PDF exports and independent review for evidence, uncertainty, and lifecycle behavior. Record shipped behavior separately from planned features.
