# Original calibration PDFs

Run `npm run calibration` from the repository root to regenerate all twenty two-page PDFs and `public/calibration/manifest.json`. The original generator creates eighteen fixtures; `node scripts/generate-attachment-calibration.js` appends two attachment fixtures without changing the earlier PDF bytes. All prose, invented observations, vector charts, logo marks, and embedded OOXML files are original project material under the repository license. No third-party content or personal data is included.

The documents deliberately share a plausible report series. Changing just a year or organization makes a difficult negative pair: topic similarity must not override publication identity. English and German controls provide a basic multilingual smoke test.

| File | Intended property |
| --- | --- |
| `01-clean-text.pdf` | Complete tagged text, matching Info/XMP title, language |
| `02-artifact-logo.pdf` | Same control with a decorative vector logo marked Artifact |
| `03-meaningful-figure.pdf` | Tagged vector chart with meaningful alternate text |
| `04-no-metadata.pdf` | No Info dictionary or XMP stream; language and complete tags remain |
| `05-untagged.pdf` | Extractable text, but no structure tree or MarkInfo |
| `06-empty-structure.pdf` | Marked flag and structure root exist, but contain no content |
| `07-partial-tags.pdf` | Second-page body is untagged while headings remain connected |
| `08-wrong-year.pdf` | Visible 2025 report; Info and XMP both claim 2024 |
| `09-wrong-entity.pdf` | Visible Harbor Observatory; metadata claims Mountain Observatory |
| `10-conflicting-metadata.pdf` | Info title says 2025; XMP title says 2024 |
| `11-combined-defects.pdf` | No metadata, partial body tags, tagged figure missing alternate text |
| `12-german-control.pdf` | German visible title, matching metadata, `de-DE` language |
| `13-tagged-title-mismatch.pdf` | H1 says Annual Report; Info/XMP says Annual Summary; matching tagged authors |
| `14-author-mismatch.pdf` | Correct title, tagged byline Maya Chen / Leo Martin, Info/XMP authors Iris Hale / Owen Brooks |
| `15-title-author-mismatch.pdf` | Wrong metadata year and wrong authors; visible H1/byline remain unchanged |
| `16-correct-reading-order.pdf` | Correct title/authors; two-column procedure in logical steps 1, 2, 3, 4 |
| `17-flawed-reading-order.pdf` | Identical visible procedure and content-stream text; valid tags read steps 3, 4, 1, 2 |
| `18-title-author-control.pdf` | Exact visible/tagged counterpart to 14, with correct Info/XMP authors |
| `19-embedded-files-guided.pdf` | Clean tagged report with valid fictional `.xlsx` data and `.docx` source notes; descriptions, MIME types, and Data/Source AFRelationship declarations |
| `20-embedded-files-no-guidance.pdf` | Same visible report and OOXML payloads; filenames remain, but description, MIME, and AFRelationship declarations are absent |

Each manifest entry records expected observable properties, deliberately introduced defects and the supported scope. These are **not certifications or preassigned overall verdicts**. The complete text controls use a Document structure element containing H1/H2/P elements; every semantic content span has an MCID, page reference, parent element and ParentTree mapping. The root ParentTree is indexed by each page's StructParents value. Running headers, page numbers and decorative logo marks are explicitly marked Artifact. Text uses standard embedded font resources with PDF standard encoding; a missing ToUnicode entry is not itself evidence that extraction failed.

Meaningful graphics are a boundary case for the initial text-centric engine. The chart control has a Figure element, alternate text and a marked content span, but an analyzer may correctly return indeterminate until it can verify graphics coverage. Alternate text alone does not establish that a graphic is correctly represented. Textual station values and visible chart labels make the intended chart meaning inspectable independently of the alt string.

## How to use the corpus

1. Check extraction, metadata conflicts, missing/empty trees and incomplete coverage against the manifest.
2. Compare candidate visible titles against Info and XMP separately. Wrong-year and wrong-entity samples should remain flagged even when embeddings are highly similar.
3. Keep deterministic conclusions separate from semantic similarity, unsupported-feature results and model uncertainty.
4. Measure loading/inference time separately from correctness; these small documents do not approximate large reports.

This is a synthetic smoke-test corpus, **too small and too repetitive to tune embedding thresholds or estimate real-world accuracy**. It does not test arbitrary fonts, damaged PDFs, encrypted documents, scans/OCR, forms, annotations, Form XObjects, tables, nested lists, unusual writing systems or adversarial instructions. Add independently labeled real-world documents and more varied positive pairs (legitimate subtitles, translations, abbreviations) before selecting thresholds. Preserve a held-out evaluation set and prioritize false acceptance of wrong metadata.

Initial generation QA: the first twelve PDFs were reopened with PDF.js, confirming two pages, successful text extraction, expected metadata and available page structure. Poppler renders were visually inspected for all pages after generation. These checks validate the intended fixtures, not PDF/UA or PDF/A conformance.


## Publication identity and order priorities

Samples 13-18 label the printed/tagged publication H1 and byline independently of Info/XMP values. Author names are fictional. Info Author is a semicolon-delimited string; XMP `dc:creator` is an ordered `rdf:Seq`, distinct from the software Creator field. App 0.3 reads Info Author and XMP creators independently and compares an explicitly labeled first-page byline candidate. Sample 14 receives a suspected author mismatch while retaining a structural Yes; sample 18 supplies the matching-name control. This bounded advisory does not authenticate identity.

Samples 16 and 17 are positive/negative controls with identical visible layouts and content-stream extraction order. Page 2 explicitly directs readers through the left column before the right; numbered dependencies establish the intended order. The negative changes only structure-tree child order, keeping every MCID owned once, page ParentTree links correct, and all text covered. Intended H2 keys are `2:2, 2:5, 2:8, 2:11`; negative logical order is `2:8, 2:11, 2:2, 2:5`. Both retain structural Yes. Sample 17 now receives a Requires review advisory for the numbered sequence 3,4,1,2; sample 16 remains Uncertain with no anomaly detected. The overlay exposes order, while global semantic reading-order correctness remains unestablished.

Title samples 13 and 15 receive separate deterministic suspected-mismatch findings. Their structural Yes is intentionally preserved. The bounded author and numbered-step advisories detect these labeled cases; the corpus does not establish general identity or reading-order accuracy. `groundTruth` in the manifest records these distinctions, author sequences, exact order keys, and the intended role (`H2`). These paired fixtures support the bounded author-identity and reading-order checks; they do not calibrate embedding thresholds.

Sample 18 is the fully matching title/author control for 14: visible content and semantic text are identical, while author metadata changes. This isolates author identity from unrelated page-layout or extraction differences.

Expansion QA: all six new PDFs were reopened and analyzed. The expanded suite has 50 passing tests. Poppler renders of the new pages were visually checked. Independent review verified exact metadata/byline differences, correct ParentTree/MCID associations and the intentionally flawed logical sequence. These checks establish fixture truth and fixture properties, not PDF conformance or model accuracy. App 0.3 adds separate bounded advisories without treating their success on this series as calibration.


## App 0.6 resource and semantic evaluation

The optional device check parses the fixed public two-page control and embeds four fixed synthetic inputs, with one warm-up and three measured warm runs. It measures local cost separately from model accuracy; load/initialization is combined and network versus cache provenance remains unknown. The benchmark releases its encoder before completion.

A separate eighteen-case English/German development/held-out corpus in `evaluation/cases.json` broadens titles, date/entity differences, keyword topics and heading/body pairs. Browser-WASM observations and sensitivity tables live in `evaluation/*-observed.json`; see [EVALUATION](EVALUATION.md) for reproduction and limitations. This remains a small synthetic policy exercise, not validated real-PDF accuracy or confidence calibration. No thresholds are automatically tuned.

The reading-order advisory now also detects a recovered single-alignment heading sequence that reverses vertical order. Multi-column, rotated and incomplete spatial evidence abstain; numbered-step findings stay separate. Passing either narrow check cannot certify global reading order.

## App 0.8 attachment boundaries

Samples 19 and 20 copy the earlier clean report without modifying its visible pages or semantic tags. Each embeds `observations.xlsx` (an Observations worksheet with Station and Visibility_metres columns) and `source-notes.docx` (original fictional source paragraphs). The generated ZIP packages have the appropriate OOXML content-type and relationship parts and contain no macros. These are authored fixture properties, not conclusions obtained by the application's attachment inventory.

The guided fixture declares the spreadsheet as **Data** and the Word notes as **Source**, with descriptions connecting them to the publication. The negative fixture deliberately omits those descriptions, relationship names, and MIME types. A filename extension alone does not verify file type. Both receive **No: acceptance not established** under text-actionability-0.3 because embedded payload contents are outside the text profile, even when their metadata guidance is present. Missing guidance is a separate advisory, not a claim that a declared relationship proves correct interpretation or safe execution.

The analyzer records bounded raw attachment declarations and encoded stream lengths; it never decodes, opens, executes, or returns the embedded file contents. Declared decoded sizes, MIME types, descriptions, and AFRelationship values remain unverified producer statements. Inventory covers reachable dictionary/array relationships and separately labels raw unlinked/unreachable EmbeddedFile stream declarations as possible remnants. Content-stream-level associated-file instructions are not interpreted. Cycles, dead references, malformed listings, traversal limits, and unresolved streams make scope uncertain rather than establishing absence.

Generation QA: both new PDFs were reopened and analyzed; the original eighteen fixture files remained unchanged. Poppler rendered all four new pages, and each was visually inspected. Separate fixture-authoring QA checks the OOXML ZIPs and XML parts; this is not a payload-reading feature in the application or a claim of PDF/A conformance.
