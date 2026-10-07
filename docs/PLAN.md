# Implementation plan

Build a browser-local PDF analysis tool from zero, using PDF-A-go-actionable as a credited reference. The core product is a reproducible machine-actionability acceptance gate, followed by an optional assessment of metadata consistency.

## Shipped implementation

App version 0.8 implements [text actionability profile 0.3](PROFILE.md), guided single-PDF review, publication-first identity comparisons, illustrated reading-order clues, contextual help, explicit finding provenance, captured exports, calibration PDFs, optional pinned model screening, and bounded embedded-file inventory. GitHub Pages is the selected v1 hosting target. The app and inference runtime are static assets; no server or API key is required. The private PreventionWeb repository contains the baseline and implementation branches; merging and Pages deployment remain pending.

The proposed profile below remains the broader target. The first implementation does not prove correct glyph semantics, visual reading order, or meaningful graphics. MiniLM is a provisional evaluation baseline, and model thresholds remain uncalibrated.

Foreground batch review adds sequential processing of up to 20 PDFs, frozen settings and explicit optional-download consent, per-item source receipts and progress, pause/stop/retry controls, retained detail review, compact JSON, and explicit retention decisions. Reports and source handles remain session-only. Revised-file comparison and persistent resumable sessions remain follow-ups.

## Decisions recorded on October 5 2026

- Start a fresh repository rather than adapt the existing application's UI or fork its history.
- Keep PDF processing local and the interface simple: upload, verdict, evidence, and report export.
- Define a versioned project profile rather than claim universal machine actionability or PDF/UA conformance.
- Use deterministic rules for structural acceptance. Keep model judgments separate and allow uncertainty.
- Start semantic work with embeddings through Transformers.js. Defer generative inference until measured ambiguous cases justify it.
- Benchmark compact English and newer multilingual models before choosing a default. See [model options](MODEL-OPTIONS.md).

## Proposed profile v1

These requirements are a design proposal. Finalize their exact predicates, scope, exclusions, and supported PDF features before implementing the acceptance gate.

| Requirement | Evidence to collect |
| --- | --- |
| Document can be processed | Successful parsing and extraction; explicit handling of encryption, unsupported features, errors, and analysis limits |
| Text has usable Unicode representations | Mappings for characters actually used and extraction results; account for valid encoding alternatives and ActualText rather than requiring ToUnicode blindly |
| Semantic structure connects to content | Resolvable structure references, correct content association, valid role resolution, and evidence beyond a tagging flag or empty tree |
| Relevant content has structural coverage | Account for content through tags or explicit artifacts; detect partial tagging, dangling references, and unaccounted content |
| Relationships can be recovered | Extract heading, list, and table relationships where present; validate structural integrity without claiming that every assigned role is semantically correct |
| Required metadata exists | Title and language at minimum; retain XMP and Info values independently and report conflicts |
| All required checks finish | No pass after a required check errors, reaches a traversal cap, or encounters unsupported content |

Validate structure links in their correct content-stream scope. A page number and MCID alone may not uniquely identify marked content in Form XObjects. Include parent-tree relationships and referenced annotations where needed, or explicitly mark the feature unsupported.

Logical order matters to machines, but syntactically valid structure does not prove correct reading order. State what v1 can establish mechanically; leave semantic order correctness outside the proven verdict unless a validated method is added.

Use requirement outcomes such as pass, fail, indeterminate, and not applicable internally. Overall acceptance is Yes only when every applicable required check passes. A No must distinguish a known violation from insufficient evidence. Optional checks do not silently change acceptance.

## Metadata comparison

Begin with title consistency. Preserve metadata provenance, candidate text, page numbers, and structure references so every finding is inspectable.

1. Parse XMP with an XML-aware approach, preserving language alternatives, and read Info metadata separately.
2. Compare normalized titles and identify conflicting metadata sources. Normalize typography and whitespace while preserving meaningful years, editions, and identifiers.
3. Collect credible title candidates from cover content and tagged headings. The first H1 is a candidate, not automatically the document title.
4. Apply explicit checks for changed years and editions; assess organization and country differences when evidence supports them.
5. Use embeddings to rank candidates and screen unresolved semantic differences. Similarity establishes relatedness, not identity.
6. Return Match, Suspected mismatch, or Uncertain with the compared evidence. A cosine score is not a probability of correctness.

The app screens subject and keyword relevance against bounded opening excerpts using provisional, uncalibrated thresholds. Keep title identity separate from topical relevance. A matching phrase deep in a reference section must not establish that metadata names the document correctly.

Legitimate subtitles, series titles, translations, and multilingual documents need evaluation cases. Missing candidates, weak extraction, ambiguous evidence, or unsupported languages should produce uncertainty.

## Proposed architecture

- A PDF analysis worker loads the document and produces evidence independently of the UI.
- An extraction layer joins decoded text to the semantic structure, preserves logical order and provenance, and records coverage and unsupported features.
- A rules layer evaluates the versioned profile and creates findings with stable identifiers and reasons.
- A separate model worker performs optional local semantic comparisons. Pin model revisions, tokenizer, pooling, prompts, precision, and thresholds.
- A small interface shows the acceptance verdict, metadata assessment, and expandable evidence. Provide JSON export containing profile version, analysis completion, findings, and any model configuration used.

The current implementation uses pdf-lib for low-level object inspection and PDF.js for text extraction and preview. Keep analysis functions runnable outside the UI so browser and automated evaluation can use identical rules.

Load models only when semantic review is requested. Keep deterministic checks usable without WebGPU or a model download. Process PDF text as data, including if a generative stage is introduced later.

## Reference project lessons

PDF-A-go-actionable already demonstrates modular audits, worker messages, metadata detection, structure serialization, preview linking, and fixture generation. Its existing pass statuses cannot be reused as this profile's verdict without reviewing each predicate.

Important gaps from the initial review:

- The serialized tree contains roles and content references but not associated extracted text.
- Finding a ToUnicode entry does not establish that used characters map correctly.
- Finding a structure tree does not establish content coverage or valid associations.
- Reading order currently requires manual review.
- Audit errors currently become warnings; required-check errors here must prevent acceptance.

Credit the reference project in documentation and preserve MIT notices on any reused code. Record reused modules and their source revisions when reuse occurs.

## Milestones

1. **Specify the contract.** Finalize profile v1 and report schema; define supported features and representative pass, fail, and indeterminate fixtures.
2. **Prove extraction.** Build the PDF-to-evidence layer, including text and tag association, metadata provenance, and coverage accounting.
3. **Implement the acceptance gate.** Add deterministic rules and meaningful tests covering empty tags, partial tags, broken mappings, image-only pages, and analysis errors.
4. **Build the minimal browser flow.** Upload, verdict, evidence, and report export; add preview only where it helps inspect a finding.
5. **Evaluate title consistency.** Compare rule-only, embedding-only, and combined approaches before selecting a model and thresholds.
6. **Expand only with evidence.** Validate the shipped advisory subject/keyword screening, add author identity and semantic reading-order review, and consider a reranker or generative model for unresolved cases if evaluation supports the cost.

## Evaluation

Use approximately 100 to 200 representative PDFs across intended languages and document families. Label actual title candidates and metadata outcomes. Include wrong years, countries, organizations, editions, swapped subtitles, legitimate translations, and harmless formatting differences.

Split calibration and evaluation by report series or organization so nearby editions do not leak between sets. Measure false acceptance of incorrect metadata, false rejection of legitimate metadata, and uncertainty coverage. Keep evidence extraction identical when comparing models.

Measure cold download size and time, warm initialization, median and tail inference latency, and memory on intended browsers and devices. Check reference-vector agreement between WASM and WebGPU with tolerances; native CUDA or OpenVINO performance does not establish browser performance.

The intended benefits of fewer extraction errors and less wasted AI processing are hypotheses. Measure downstream effects separately before making quantitative product claims.

## Open choices

- Primary audience and downstream workflows: ingestion, search, retrieval, or structured extraction.
- Supported languages and acceptable model download budget.
- Whether metadata source conflicts are profile violations or separate consistency findings.
- Supported forms, annotations, Form XObjects, and PDF versions for v1.
- Final product name and whether semantic consistency ever becomes a separate policy gate.


## Next priorities: publication identity and reading order

The user prioritizes metadata titles and authors that contradict the actual publication markup, and incorrect semantic reading order. Calibration samples 13-18 isolate these cases with tagged H1/bylines and a correct/flawed two-column pair.

App 0.3 adds advisory comparison of separately preserved Info Author and XMP `dc:creator` sequences against credible tagged/printed bylines. Missing or ambiguous bylines remain uncertain. Evaluate name variants, multiple authors, source conflicts, and publisher/software Creator distinctions against real documents before treating this as publication-identity validation.

Reading-order work must distinguish valid structural connectivity from semantically correct order. The negative two-column fixture has complete coverage and consistent parent links yet reads steps 3-4 before 1-2. The overlay and extraction rehearsal make this inspectable; bounded numbered-step advisories can flag suspicious sequences but do not establish overall correctness. Evaluate layout, dependencies, and content relationships against labeled correct-order counterparts before adding any model judgment, and keep it advisory until validated. These gaps do not silently change the existing text-profile acceptance contract.

App 0.3 adds a profile-qualified summary, explicit advisory statuses, and paired example demonstrations. Input receipts use SHA-256 of the original file bytes and identify the analyzed input rather than proving its correctness. The UI working label PDF Input Check follows the [brand direction](BRAND.md); the formal project name and repository slug are retained.


## Selective hybrid screening in app 0.4

Traditional checks run first and remain available without model downloads. Optional screening presents model language coverage, model/tokenizer asset sizes, and benefits/limitations before the user explicitly runs selected checks. MiniLM is the smaller English choice; Granite is the multilingual alternative. Browser speed and memory remain unmeasured, and per-model thresholds are provisional.

Users select title, subject, individual keyword, and bounded tagged-heading/section checks. Settled title rules need not trigger title embeddings. Results retain the model actually used, requested/skipped checks, and consumed-input/truncation provenance; changing the picker does not relabel an earlier result. Missing or unsupported language keeps semantic conclusions uncertain. Canceling an AI run retains the structural report and previous completed result.

Calibrate each model against held-out document families and evaluate per-keyword/section false alarms before using semantic findings as operational gates. Section association is bounded and heuristic; it does not validate every heading role or reading order.


## Captured exports and bounded evidence in app 0.6

Export/crop work is modular: `src/export` captures a completed report and source file together, produces a readable PDF/dedicated PNG summary/JSON receipt, and owns export cancellation. `src/evidence` renders a single original source page with the full PDF.js viewport matrix and crops one reliable region per finding. No application screenshot or current-preview canvas is used. Up to six PDF evidence images are capped at one megapixel each; page rendering retains 4096-side/eight-megapixel ceilings. Exact geometry failures and excluded Forms receive textual evidence rather than invented regions.

Reports distinguish captured preference values from the model configuration that actually completed. Replacement aborts the old export; later model results cannot relabel its captured report. Names outside the bundled Noto Sans font use a labeled browser-raster fallback, with nonextractable-text/browser-font limitations and exact values in JSON. These exports are human analysis receipts, not repaired PDFs or conformance certificates.

Synthetic browser tests explicitly disclose model/tokenizer/runtime download costs and use public fixed input, never the user's PDF. The UI terminates an idle screening encoder when testing starts and cancels a test before screening begins, keeping completed results intact. Timing observations do not imply RAM requirements, universal device speed, or a document ETA.
