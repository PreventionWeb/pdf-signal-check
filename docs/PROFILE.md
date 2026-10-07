# Text actionability profile 0.3

App version 0.8.0 uses `text-actionability-0.3`, distinct from the broader proposed profile v1. Profile 0.3 extends 0.2 with bounded embedded-file inventory and conservative scope handling when payloads or unresolved attachment evidence are found. Profile 0.2 introduced marked-content integrity checks, whitespace-only title handling, narrowed list/table connections, and unsupported state-only references. Advisory identity/order/visibility findings remain separate from acceptance. A Yes means that every required predicate below passed within this scope. A No distinguishes detected defects from analysis that could not establish compliance.

## Required predicates

1. **Parsing:** pdf-lib and PDF.js can load the file. Encrypted PDFs are excluded. Analysis is limited to 50 MB, 200 pages, 1 million decoded operators, 250,000 text items, 10 MB per decoded content stream, and bounded object/structure traversal.
2. **Title:** a nonempty title exists in the Info dictionary or XMP. XMP is parsed as XML with language alternatives preserved. Malformed, oversized, or DTD-bearing XMP prevents acceptance.
3. **Language:** catalog language is accepted by `Intl.getCanonicalLocales`. This validates syntax, not that the declared language describes the content.
4. **Text decoding:** non-artifact text is extracted, with no replacement characters, private-use characters, disallowed controls, or empty Unicode strings on observed text glyphs. This is an indicator check, not proof of correct glyph semantics or exhaustive Unicode conformance.
5. **Tag connection:** a marked structure tree contains indirect elements and page content references. Element parent links and content parent-tree associations agree. Cycles, duplicate ownership, invalid MCIDs, empty trees, unknown roles, and unresolved references prevent acceptance. Every raw content reference must have observed text or graphic content. A referenced sequence containing only state operations produces an indeterminate supported-scope result; a reference with no observed sequence fails connection. Harmless empty paragraph tags with no content references are not rejected.
6. **Text coverage:** every extracted non-artifact text item has a page-scoped marked-content association owned by a structure element. Artifact declarations are trusted; this does not prove that producers designated artifacts correctly.
7. **Supported scope:** no Form XObjects, Type 3 fonts, ActualText replacements, optional content, inline images, forms, annotations, associated files, embedded-file payloads, object-reference tags, separate-stream marked references, or non-artifact graphic painting operations are detected. Unresolved or incomplete attachment inventory also prevents acceptance. Such features produce indeterminate outcomes, not assertions that the document itself is broken. Unused resources can also trigger conservative exclusions.
8. **Marked-content integrity:** logical page content streams have balanced BMC/BDC/EMC boundaries. Raw lexical inspection catches extra EMC boundaries that PDF.js can silently recover, while ignoring literal/hex strings, comments and names. Numbered marked-content occurrences have unique, nonnegative integer MCIDs within the logical page stream. Unnumbered containers and artifacts remain supported; Form XObjects and inline-image content remain excluded rather than asserting equivalent stream coverage.
9. **Completion:** every page and required check completes. An error or exceeded limit prevents acceptance.

The narrowed project profile requires lists to contain LI elements, LI to contain LBody and optional Lbl, table sections to contain TR, and TR to contain TH/TD. These containers must not directly own text instead of those relationships. These are project-profile constraints, not claims of universal PDF invalidity. Basic list and table child relationships are inspected during tag traversal. Logical order, semantic correctness of assigned roles, complex table associations, and visually correct text are not established by this profile. Valid PDF/UA files can be outside its supported scope.

## Title consistency

Title comparison is separate from structural acceptance. The rules preserve years and normalize Unicode typography, case, and whitespace. A normalized match with a credible first-page H/H1 or prominent cover candidate returns Match. Later headings, references and body-size cover lines remain inspection evidence but cannot establish Match. Conflicting Info and default XMP titles, or otherwise identical title wording with different years, returns Suspected mismatch. Near-identical titles of at least five tokens with one substituted term are also flagged for inspection; this heuristic does not prove an entity mismatch. Other differences remain Uncertain.

Candidates come from tagged headings and prominent cover text on the first page. Candidate collection is limited to the first three pages and twelve unique texts. A heading or a cover line is evidence to inspect, not automatically the true document title. A legitimate title on a later frontmatter page can remain Uncertain because title evidence scope is deliberately conservative. Entity and edition comparison beyond exact wording is deferred.

Setup recommends Granite R2 for multilingual coverage, offers MiniLM as the compact English option, and allows checks without an AI model. Choosing an AI model enables [hybrid semantic screening](SEMANTIC.md) for each PDF after explicit saved consent, offering a choice of pinned MiniLM English or Granite R2 multilingual ONNX encoders through Transformers.js and WASM. Deterministic rules settle exact title agreement and known identity warnings before inference; Match is a rules result, not AI certainty. A separate AI title-relatedness advisory also runs for rule-settled titles when evidence is available; it never overrides identity warnings. Requested AI checks screen ambiguous titles, subject relevance, individual delimited keywords, and bounded tagged heading/body pairs. Missing or unsupported declared languages prevent model inference by default. When the declaration is missing, an explicit user English assumption can enable optional single-document screening; the PDF declaration and required language outcome stay unchanged, and the assumption is recorded separately in the screening receipt. Model-specific provisional thresholds yield related, suspected mismatch, or uncertain advisories; they are uncalibrated, not comparable confidence across models, and never change text-profile acceptance. The report preserves selected model/checks, per-field methods, evaluated/skipped counts, consumed token counts, truncation flags, decoded consumed text, and located evidence. Relatedness does not prove metadata identity, assigned roles, factual correctness or reading order.

## Embedded and associated files

The attachment inventory inspects embedded-file name trees, associated-file arrays, related-file entries, file-attachment annotations, and reachable file specifications. It separately records raw embedded-stream declarations without a resolved file context; unreachable declarations are possible inactive remnants, not established active attachments. Content-stream-level associated-file instructions are not interpreted.

Inventory reads declarations and encoded stream lengths without decoding or returning attached file contents. Filenames, MIME types, descriptions, decoded-size declarations, and `AFRelationship` names remain unverified producer statements. A specific relationship and description can supply guidance, but do not establish payload safety, content format, or correct machine interpretation. Custom relationship names can be legitimate extensions. Missing guidance warrants review rather than a universal PDF-conformance failure. See [PDF Association guidance](https://pdfa.org/files-inside-pdf/) and [associated-files technical note](https://pdfa.org/wp-content/uploads/2018/10/PDF20_AN002-AF.pdf).

The default inventory bounds are 20,000 traversal steps, depth 64, 100 file records, 24 associations/aliases per file, and 1,024 characters per retained metadata field. Cycles in listings, dangling references, malformed declarations, truncation, unresolved payload contexts, and exceeded bounds prevent a complete inventory claim and text-profile acceptance. A completed scan establishes only what this bounded inspection found. A parsing failure leaves inventory explicitly unassessed.

Embedded payloads require a separate file-aware workflow; profile 0.3 returns No with an indeterminate supported-scope result even when their declared guidance is present. This is a scope limit, not proof that the PDF or attachment is defective.

## Reproducibility and resource limits

Dependencies are locked with npm. Model and runtime assets are fetched only on explicit semantic-screening request; PDF content is processed locally. Parsing limits constrain ordinary workloads but do not bound allocation before parsing or guarantee a fixed memory ceiling. The UI supports terminating the analysis worker.

The report contains file identity, profile and schema versions, required outcomes, metadata provenance, per-page evidence, limitations, and optional model configuration. Per-page evidence includes both content-stream text and connected text in tag-tree order; structure content leaves carry joined text and page-scoped keys. It does not persist document contents automatically. Export is initiated by the user.

## Visual evidence

The one-page preview projects text quadrilaterals and graphic bounding regions through PDF.js’s complete viewport matrix, including page rotation and crop offsets. Red regions identify extracted untagged or suspicious text; amber graphics require semantic inspection and remain indeterminate, rather than defects. Blue regions identify selected evidence. Graphics bounds may include clipped-away space. Unknown graphic operators, dangling references, and document metadata receive no invented region. Vertical text geometry is currently unavailable.

The logical-order overlay numbers connected text in tag-tree order, distinct from content-stream extraction order. It does not establish that reading order is correct. Form XObjects disable location overlays because reliable stream-scoped MCID joining is outside this profile. Canvas rendering is capped at 8 million pixels and 4,096 pixels per side; overlays cap at 1,500 regions. Preview failures never change profile acceptance.


## Bounded identity, order and visibility advisories

Info Author and XMP `dc:creator` values are preserved independently. Explicit first-page `Author(s):`, `Written by:`, or `By` lines supply byline candidates. Semicolon/“and” separated full names can support normalized same-name-set comparison. Comma-separated or initialed names, multiple byline candidates, missing metadata and partial overlap remain uncertain. Different full-name sets or conflicting Info/XMP author lists produce a suspected mismatch. Names are never authenticated; software Creator and publisher lines are not treated as authors.

Reading-order diagnostics inspect numbered tagged heading/list-label sequences (at least three observed steps). A repeated or decreasing step number produces Requires review with ordered, located evidence; a numbering restart can be legitimate. Absence of an anomaly remains Uncertain, and never certifies columns, prose, tables or global order. Tag connections and complete coverage alone cannot establish correct order.

Text-rendering modes 3 and 7 (invisible/clipping-only) produce a separate visibility review with linked content regions where recoverable. Invisible OCR/accessibility text can be legitimate, so it does not automatically fail the profile. Color, clipping, occlusion, off-page text, arbitrary glyph-to-text substitutions and producer artifact declarations remain material limits.

A second bounded order clue examines at least three short, geometrically located headings on unrotated pages with one recovered left alignment and no recovered body-column spread beyond the simple-layout guard. A substantial upward move in tag order produces review evidence. Multi-column, rotated, missing-geometry and more complex layouts abstain from that spatial rule; no detected anomaly still remains Uncertain. The report names the numbered or spatial detector.

## Drawing order versus tag order (advisory)

When numbered steps (headings or list labels such as “1. …”, at least three) are in increasing order in the tag tree but drawn in a different order in the content stream, `readingOrder` records a `numbered-step-drawing-order` finding. Screen readers follow the tags and are unaffected. Tools that extract text in drawing order, as many AI pipelines do, read the steps out of sequence. This mirrors the GAR2025 extraction example in the UNDRR–OCHA guidance. The comparison marks the drawing lane, not the tag lane. The check is narrow: unnumbered prose, captions and labels drawn apart from their values are not detected.

## Hidden instructions for AI (advisory)

`report.hiddenInstructions` screens text that readers cannot see but extraction and AI tools still read. It covers page text drawn with rendering mode 3 or 7, at an effective size under 1 pt, with a near-white fill (every channel at least `#f0`), or with its origin outside the page box. It also covers saved title, subject, keywords and authors, image alternate text and attachment descriptions. Text is NFKC-normalized, and zero-width and soft-hyphen characters are removed before matching. `src/engine/hidden-instructions.js` lists the instruction-like patterns:
- overriding instructions
- addressing an AI or a system prompt
- chat-template markup
- asking for a favourable review or selection
- asking to conceal information
- dictating the answer

Visible page text is not scanned, so documents that discuss prompt injection openly are not flagged. A match is a `requires-review` advisory shown under Check. It is independent of profile acceptance and does not prove intent. White text on a dark background, or reworded, translated or encoded instructions, are known sources of false positives and misses. Hidden runs are summarized per page after screening, so an OCR text layer does not enlarge the report. Matches keep a bounded snippet and approximate location.

## Figure alternate-text presence

A separate deterministic advisory inventories recovered Figure tags, including standard roles resolved through RoleMap, and non-empty `/Alt` entries. Descendant marked-content keys associate painted graphics with the figure. Broken structure or ambiguous nested Figure ownership prevents a reliable association. Non-artifact graphics without a recovered figure association are uncertain: they are not automatically declared meaningful images or missing-alt defects. Decorative artifact declarations remain trusted and excluded from this inventory.

Non-empty alternate text is shown as a presence success; absent or whitespace-only text on a declared Figure warrants review. This does not assess pixels, chart values, the accuracy/completeness of descriptions, or nearby equivalent text/data. Such structural presence checks follow [W3C PDF1](https://w3c.github.io/wcag/techniques/pdf/PDF1) without claiming its human accuracy test is automated.

Required supported-scope outcomes and acceptance remain unchanged. Scope limitations are presented under Uncertain / unchecked rather than Problems; this presentation distinction does not turn an indeterminate required check into a pass. Figure advisories and source evidence are captured in exported reports.

## Travel further: links, bookmarks, descriptions and data (advisory)

`src/engine/travel.js` records six advisories. They are opportunities and review clues, not profile predicates: none adds a required check or changes `report.accepted`. No link is followed and no attachment is opened. Link annotations still make the supported-content scope indeterminate, as before.

| Report field | What it records | Bounds and limits |
| --- | --- | --- |
| `links` | Link annotations from PDF.js `getAnnotations()`: page, rectangle, target kind (`uri`, `goto`, `named`, `attachment`, `none`), URL text and contents. Also the number of `Link` elements in the tag tree, as `linksTagged` (`all`, `some`, `none`). | 500 annotations per page, 2,000 links, 512-character URLs. The tag count does not show which annotation each `Link` element owns; `OBJR` references stay outside the profile. |
| `crossReferences` | Wording that names another part of the document (“Figure 1”, “Table 3.2”, “Map 2”, “Annex IV”, “Section 3”, “see page 4”) in recovered text items, and whether a Link annotation rectangle overlaps it. Labels at the start of a caption, heading or list label (“Figure 1. …”) are not references. `requires-review` when any reference has no link. | 200 recorded references. The match position is estimated proportionally within its text item, not measured per glyph. Text split across items, hyphenated or reused from a Form XObject can be missed or left unplaced. References to other publications (“Section 3 of the Act”) cannot be told apart. `targetCheck` is a stub (see below). |
| `outline` | Bookmarks from PDF.js `getOutline()`: count, depth, items with a target, titles, and how many tagged headings have a bookmark with the same wording. `opportunity` when there are no bookmarks and the PDF has at least two tagged headings or at least five pages. | 1,000 items, depth 16, 100 retained titles of 200 characters. Wording comparison ignores case and leading numbering. Bookmark destinations are not resolved to pages. |
| `machineMetadata` | Which publication details are saved: title, creator, description, keywords and language (Info or XMP), and the Dublin Core XMP `publisher`, `rights`, `date` and `identifier`. Also attached machine-readable description files (schema.org JSON-LD, RDF or Turtle, by MIME type or extension). `present` needs all four publication details and one such file. | XMP properties are bounded to 24 values of 1,024 characters each (`metadata.xmpProperties`). Values are producer statements: a saved identifier or licence is not verified, and an attached file is not parsed. Unparseable XMP leaves the advisory not assessed. |
| `figureData` | For each tagged, non-decorative Figure, whether a tagged `Table` has content on the same or an adjacent page, and whether a data file is attached (AFRelationship `Data`, or CSV, TSV, spreadsheet or JSON by type or name). `opportunity` when a figure has neither. | 100 tables. Being nearby, or attached, does not prove a table or file holds the figure’s values. Photos and illustrations need no data. Unlabelled graphics are not considered. |
| `detachedValues` | A short value with a sign, unit, decimal, percentage or currency (“+0.7 m”, “12%”) whose adjacent tagged sentence is drawn at least one other tagged item away in the content stream. Screen readers follow the tags; tools that read text in drawing order can separate the number from what it measures. | 20 findings. Bare integers, headings, list labels and table cells are skipped. Untagged text, charts and labels that are not adjacent in tag order are not assessed. |

### Planned checks

These are recorded so they are not forgotten; none is implemented.

- **Reference targets** (`crossReferences.targetCheck`, stub `inspectReferenceTargets`): check that a linked “Map 2” leads to the map it names, by resolving the GoTo destination or URI fragment and comparing it with nearby captions.
- **Link structure ownership:** match each Link annotation to its `Link` tag through `OBJR` and `StructParent`, rather than comparing counts.
- **Bookmark order and destinations:** resolve each bookmark to a page and position, and compare the order with the tagged heading order.
- **Structured-data content:** parse an attached JSON-LD file in a sandboxed, size-bounded way and compare its name, date and publisher with the saved properties.
- **Figure-to-data matching:** compare values in a nearby table, or an attached CSV, with values in the figure’s description.
