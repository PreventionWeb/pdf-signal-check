# Results and downloadable signal-check report

Status: first export/crop slice implemented in app 0.6; independent validation passed (88 wave 1 tests and actual browser/Poppler export QA). PDF, dedicated PNG, and JSON snapshots are user-initiated. This document specifies results, report download, and their connection to the guided review. It does not change text profile 0.2 or implement PDF repair.

## User outcome

After checking a PDF, the user can understand the input risks, inspect the source evidence, and download a readable snapshot to share or retain. The snapshot records what was checked, what was found, and what remains unresolved. It is an analysis report about the original PDF, not a certificate, repaired PDF, or promise of accurate downstream AI output.

“Performance of the input” means observed extraction/structure/identity outcomes here. Download size, elapsed analysis time, and optional model configuration can be recorded separately as resource observations. They must not become a quality score or claims about saved computation, hallucination rates, memory use, or model accuracy without measurements.

## Result contract

Use the existing report as the source of truth. Both the on-screen review and the exported report read a fixed completed-report snapshot; neither reruns analysis or models just to produce an export.

| Category | Display and export behavior |
| --- | --- |
| Required defect | A required predicate failed; show its reason and supported evidence. |
| Required indeterminate result | Compliance could not be established, including unsupported features, incomplete analysis, errors, or limits. Do not describe this as a proven PDF defect. |
| Advisory suspected mismatch / requires review | Show the compared metadata or sequence and the located evidence. Keep separate from structural acceptance. |
| Advisory uncertain | State why evidence or interpretation is insufficient; do not imply the issue was resolved. |
| Known unassessed scope | Name excluded features, bounded pages/text, skipped checks and items, unsupported language, and unverified semantic properties. This is distinct from checks that ran and returned uncertainty. |
| Passed check / normalized metadata match | Available as optional success frames and included concisely in the report. A pass applies only to the named predicate or comparison. |

Do not add a composite percentage or replace profile-qualified Yes/No with a universal “AI safe” label. Counts describe actual checks and findings, with defined units; a document-level issue with many evidence regions is one finding, not many defects.

## Human-readable report content

The first page contains the file name, original byte count and SHA-256, assessment time, app/report-schema/profile versions, the qualified structural result, counts by the categories above, and a short next-action list. A No explains whether defects were found, compliance was not established, or both. If SHA-256 could not be computed, state that it is unavailable.

Subsequent content includes:

- Required outcomes and the exact analysis limits/supported scope applicable to this run.
- Publication identity comparisons with independent Info and XMP values, credible title/byline candidates, page numbers, and the deterministic/advisory method.
- Reading-order and visibility findings, including the relevant tagged versus stream sequence rather than only a colored page image.
- Optional semantic results: selected preferences at export time separately from the last completed configuration, pinned model/revision/precision/pooling, requested checks, per-field inference flags, evaluated/skipped keyword and section counts, provisional thresholds, and actual bounded source evidence.
- Model input provenance: consumed/input token counts and truncation warning; full decoded consumed text may be an optional appendix to avoid silently making a concise report into a full text extraction. The accompanying JSON remains the detailed machine-readable record.
- Unassessed scope and unresolved findings, suggested next steps, and a clear statement that the original PDF was not changed.

The default report includes compared values and bounded evidence snippets needed to understand findings. It does not automatically reproduce every extracted page or all model inputs. Use explicit omission labels when item/thumbnail/snippet limits are reached, and refer to the JSON for complete available evidence. Suggestions distinguish a source-authoring change, a downstream extraction choice, and a manual verification task; they are not interchangeable repairs.

## Evidence images and comparisons

For a located finding, a bounded page crop can sit beside its extracted/metadata comparison. Include the page number, overlay legend, and a short explanation of what the region establishes. Multiple disjoint regions should be shown as separate crops or a bounded page thumbnail with numbered regions; do not present a large union crop as one precise issue location.

Use the same PDF.js viewport matrix and existing PDF-space quadrilaterals as the preview, with rotation and crop offsets included. Crop from a freshly rendered source-page canvas for the export, independent of the current preview page, zoom, selected overlay, and unfinished UI render. Apply modest padding, clamp to the rendered viewport, and report unavailable/outside-viewport geometry instead of inventing a rectangle. Graphic bounds are approximate and may include clipped-away space; vertical text and excluded Form content have no reliable overlay. Document-level metadata findings use a comparison card with no fabricated page location.

A source crop shows the rendered PDF and deliberately selected evidence overlays only. It must not capture the surrounding browser page, other report panels, file chooser, acknowledgement modal, or unrelated document state. Avoid a general screenshot of the application as the report-generation mechanism.

Suggested first-slice limits: at most six findings with images, one source-page render at a time, at most 1 megapixel per image and 6 megapixels of embedded images per report. Retain existing renderer ceilings. Additional findings remain in the report as text, with an explicit image-omission note. Limits are implementation targets requiring mobile measurements, not fixed memory guarantees.

## Downloads and privacy

Offer separate, named actions: **Download PDF Signal Check report (PDF)** and **Download detailed report (JSON)**. PDF is the first human-readable snapshot format. App 0.6 also offers a PNG image of a dedicated one-page summary layout; do not ship an arbitrary screenshot or “Download snapshot” action whose contents are unclear.

Immediately beside the export actions, explain: “Reports can include your document’s file name, metadata, text excerpts, and page images. Downloads are generated on this device; share them only with the people you intend.” Export is explicit and does not upload, automatically persist document contents, or alter the original file. Generated PDF/JSON can themselves contain sensitive data, even though input analysis is local. Filename sanitization and text rendering must handle arbitrary metadata safely.

Capture the report snapshot and source identity together before rendering. File replacement, cancellation, or a later model result cannot mix content from different runs. Use a separate export epoch and cancellation state, release temporary canvases/blob URLs, and stop rendering promptly when canceled or the source changes. Disable duplicate export requests while one is running; keep the completed analysis available. If source bytes have been released, permit a text-only report with a stated image omission or ask for the source to be selected again and verify its hash before adding images.

pdf-lib is already bundled and can assemble a purpose-designed browser-generated PDF from text and bounded JPEG/PNG images. Plan a font strategy before implementation: supported input languages include Unicode scripts that standard PDF fonts do not cover. The first report must preserve supported names/text or clearly declare its export-language limitation; it must not crash, replace names with misleading glyphs, or silently transliterate them. Bundled suitable fonts are preferable to an extra external request during export. Page rendering, font licensing, PDF text extraction, and download behavior need their own validation.

## Guided review connection

Start with findings that affect required acceptance, then advisories needing attention, with indeterminate scope visible throughout. Provide **Next finding**, **Previous finding**, a stable “Finding 2 of 5” position, and a compact list for direct navigation. Export and exit remain available; users do not have to finish a wizard to obtain results. Optional **Show passed checks** reveals success frames without making them mandatory steps.

Each frame presents: the observed outcome; the exact source/evidence comparison; why it matters to extraction or identity; what to inspect or change; and what cannot be established. Do not fabricate the correct title, author, reading order, or semantic role. A suggested source-edit task says to return to the original authoring document/tool, regenerate the PDF, and recheck it. This app cannot currently fix those properties in the PDF.

Review state is separate from analysis state. “Reviewed” or “Needs source edit” is a user annotation, never a change to a predicate, advisory, or overall Yes/No. Keep annotations in memory for the current file and label them in exports; no automatic localStorage document storage. Back/Next restores selected finding, evidence location, expanded comparisons, and review annotations. Choosing a new file resets those states. Browser Back should preserve a sensible in-app view when supported, without making the user lose the file unexpectedly or creating a history entry for every focus/zoom change.

## First slice versus later work

The first overall delivery slice establishes the common finding view and single-file navigation; the [feature index](README.md) schedules human-readable export in the second slice. The first export implementation then generates a concise PDF with textual comparisons plus up to six truthful evidence images, keeping the existing JSON alongside it. Support cancellation, source identity guards, Unicode text, and explicit scope/omission labels from the start. Implement and validate the report generator independently before rewiring the whole analysis flow.

Delivered in app 0.6: dedicated summary PNG, session-only Reviewed annotations captured separately from outcomes, bounded evidence crops, and explicit omission/privacy receipts. Later: expanded appendices, free-form review notes, source-tool-specific repair guidance, richer measured resource receipts, and revised-file comparisons. In-place PDF editing, automatic “fix all,” universal accessibility/compliance certification, and a model that invents repair values are outside this feature.

## Acceptance criteria and focused QA

1. The exported structural/advisory outcomes, compared values, versions, source hash, completed model configuration and omission counts equal the captured report. Current selector preferences do not relabel prior inference. A canceled or unsupported-language run is not exported as completed model inference.
2. Fixtures 13/14/18 show the correct title/author comparisons; 16/17 show the differing tagged sequence despite identical visible pages. Required indeterminate graphics/Form findings are not colored or worded as proven defects. Missing geometry produces a truthful text-only entry.
3. Render the generated PDF and visually inspect every page for clipped/wrapped values, overlapping labels, orphan headings, readable comparisons and crop captions. Re-extract its text to confirm names, years and non-ASCII text survive. Test long titles, multiple authors, German and at least one non-Latin-script input before claiming broad export language support.
4. Rotated and cropped source-page fixtures produce crops at the actual issue location. Multi-region findings stay intelligible; a preview zoom or page selection does not change export content. Output image/page/pixel limits are enforced and visibly reported.
5. File replacement during export, export cancellation, preview failure and late model completion cannot produce mixed-source or mislabeled output. A text-only export remains possible when visual evidence fails, with the failure noted.
6. Mobile layout and download work from the GitHub Pages subpath. Export progress is announced, cancel and finding navigation are keyboard accessible, focus returns sensibly, comparison content has a useful reading order, and status distinctions do not depend on color alone.
7. A short review has no forced success tour or mandatory AI download. User review annotations do not alter machine outcomes, and Back/Next preserves context. Unsupported models/languages expose a clear skip path to results/export rather than a dead-end step.

## Cross-feature product risks

The most consequential risks are losing uncertainty when simplifying results, allowing a wizard to imply the PDF is repaired, and giving rendered crops more precision than their source evidence warrants. A successful model run is not a verified identity; a high relatedness score must never become a green “title fixed” frame. Metadata-only defects need textual comparisons, while order risks need sequences as well as images.

Avoid mandatory linear progress where the next step waits on a large optional model download. Traditional results should be immediately reachable, cancellation should retain them, and the user should choose expensive checks with clear language/size information. Missing language cannot be solved by pretending an unsupported model ran; inspecting the declaration and choosing to skip are valid paths.

The report is a frozen receipt. The screen can continue to evolve after a download starts, but the receipt must identify the run it captured. Distinguish assessment time from export time and make unassessed scope conspicuous in both places. These safeguards are more valuable for the first slice than a polished aggregate score or a broad screenshot export.
