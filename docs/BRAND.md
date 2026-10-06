# Interface brand direction

The adopted product name is **PDF Signal Check**, described as **Text, structure, and metadata for machine use.** Its tagline is **Inspect the PDF. Understand the input.** The current local repository and package slug is `pdf-signal-check`. The former slug `pdfs-for-ai-actionability` is retained as project history. The name suits the initial UN-system audience and broader professional industries without implying institutional endorsement, certification, or guaranteed AI accuracy. It has not received trademark or domain clearance.

Position the product around inspectable input quality: show what machines extract, how publication metadata agrees with visible/tagged evidence, and what still requires review. Reducing misleading context and wasted processing is the motivation. Downstream compute savings and hallucination prevention are not established benefits.

“AI-ready” appears in current document-extraction positioning, including [Hancom Data Loader](https://master.hancom.com/en/ai/products/dataloader). An evidence-focused checking identity is more precise for this tool's defined scope. The adopted-name search and shortlist are recorded in [NAMING.md](NAMING.md); these checks do not establish trademark or domain availability.

## Interface decisions

- Hero: **Inspect the PDF. Understand the input.** Supporting copy names extracted text, connected tags, and publication metadata.
- Qualify every Yes/No with its text-profile version. A structural pass is separate from publication identity and order review.
- Show title, author, and reading-order statuses beside the verdict. Missing analysis is visible as not assessed or requiring review rather than silently represented as a pass.
- Keep deterministic metadata comparison separate from optional local model screening. Relatedness is advisory, with inference provenance and first-use download cost visible.
- Open failing and indeterminate structural details. Offer page inspection where a location is available; describe document-only findings plainly.
- Name the corpus **Example PDFs**. Paired author and reading-order fixtures show both the problem and the intended comparison.
- Provide a tagged-order/content-stream-order selector. Neither extracted sequence proves semantic correctness on its own.

Retain the warm neutral surfaces, restrained typography, and explicit preview legend. Red denotes concrete text issues, amber graphics require further inspection, and blue identifies selected evidence. Keep highlights approximate where geometry does not resolve glyph outlines or clipping.

Extraction rehearsal lets people switch a bounded page transcript between tagged and content-stream order and click evidence on the original page. Paired fixtures show the same visible publication with changed author metadata or tag order. Ground-truth labels are displayed only for explicitly loaded synthetic examples; uploaded filenames never establish truth. A collapsible SHA-256 input receipt records the original file bytes and supports repeatable review without implying correctness.

Summary statuses are interactive disclosures. Title and author cards reveal document metadata beside credible recovered publication text; reading order reveals tagged and content-stream sequences with the actual advisory reason. The comparison opens beside the summary, with explicit page evidence and optional preview navigation. Match and uncertain states expose evidence and limitations as well as suspected mismatches. Disclosure actions do not trigger model inference.

## Adopted-name verification

The October 6, 2026 naming pass changes current product-facing labels to PDF Signal Check while keeping repository/package/profile identifiers, privacy-notice preference key, fixture bytes, generator attribution, and historical receipts stable. Runtime export and batch labels share `src/brand.js` constants. No model, policy, or dependency change is included.

- 122 tests passed and production build succeeded.
- Actual agent-browser checks at 1280×900 and 390×844 confirmed the title, two-line wordmark, descriptor, tagline, and export action fit without horizontal overflow.
- Browser-downloaded `14-author-mismatch-pdf-signal-check.pdf` and `.png` carry the adopted brand. PDF title/creator metadata are PDF Signal Check; all four rendered PDF pages and the PNG were visually inspected. Author mismatch values and the approximate byline crop remain intact.
- Download filename stem is `pdf-signal-check`, including batch summaries. Privacy preference compatibility remains intact.
- Independent read-only QA passed against build `index-J_w3P01O.js`: root and Pages-path mobile labels, overflow checks, and saved privacy preference compatibility. Reopening the notice preserved its checkbox state; clearing the preference restored the notice behavior and returned focus to the privacy action.
- Internal QA screenshots: `/tmp/pdf-signal-check-desktop.png`, `/tmp/pdf-signal-check-mobile.png`; actual sample downloads are in the local Downloads folder. These QA artifacts are not committed application assets.

## Repository identity

The local folder and npm package were subsequently renamed to `pdf-signal-check`. The planned future GitHub location is `preventionweb/pdf-signal-check`; repository creation, remote configuration, pushes, and publication have not been performed. Historical validation URLs and receipts retain the paths used when those checks ran.

After the local rename, all 122 tests and the production build passed from the new folder. Agent-browser verified a real author-mismatch review under `/pdf-signal-check/` at 390×844 with the correct brand, comparison evidence, and no horizontal overflow. The local-only production preview for this check used `http://127.0.0.1:4182/pdf-signal-check/`; it is not an external deployment.
