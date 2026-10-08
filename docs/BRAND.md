# Interface brand direction

The adopted product name is **PDF Signal Check**, described as **Text, structure, and metadata for machine use.** Its tagline is **Inspect the PDF. Understand the input.** The current local repository and package slug is `pdf-signal-check`. The former slug `pdfs-for-ai-actionability` is retained as project history. The name suits the initial UN-system audience and broader professional industries without implying institutional endorsement, certification, or guaranteed AI accuracy. It has not received trademark or domain clearance.

Position the product around inspectable input quality: show what machines extract, how publication metadata agrees with visible/tagged evidence, and what still requires review. Reducing misleading context and wasted processing is the motivation. Downstream compute savings and hallucination prevention are not established benefits.

“AI-ready” appears in current document-extraction positioning, including [Hancom Data Loader](https://master.hancom.com/en/ai/products/dataloader). An evidence-focused checking identity is more precise for this tool's defined scope. The adopted-name search and shortlist are recorded in [NAMING.md](NAMING.md); these checks do not establish trademark or domain availability.

## Current interface decisions

The application uses the pinned **PreventionWeb Mangrove 2.0.0 theme** while retaining the official UNDRR logo in the top-left institutional header, as requested. See [theme assets, integrity hash and token evidence](MANGROVE.md). The product remains PDF Signal Check; repository/profile/preference identifiers are independent of presentation. The film keeps its UNDRR/PreventionWeb co-branding and approved narration.

- Lead the homepage with **Help people and their tools understand your PDF** and concrete examples of lost meaning. Connect diagnosis to source-document repair and rechecking the export.
- Lead completed results with Fix and Check counts. Keep the formal text-profile receipt and method in Technical details. A structural pass does not guarantee accessibility or accurate AI answers.
- Keep Couldn’t check and optional Make it travel further separate from tasks and collapsed by default. Optional opportunities do not count toward the headline.
- Present standard checks as a useful option, with optional multilingual or English AI comparisons. Show language coverage and download costs before explicit consent; keep token and speed details secondary.
- Use the official PreventionWeb interactive teal (`#0a6969`) for application brand controls, product identity and export headings. Preserve red/amber outcome semantics and the established evidence colors; brand choice never changes a PDF finding.
- Keep image, identity and reading-order evidence close to the selected task. Show actual saved values and recovered sequences; no extracted order is automatically proof of the intended reading order.
- Call the public corpus sample reports. Its eight fictional variants run through the same checks; their known labels never establish the outcome of an uploaded PDF.

The October 2026 [UX reference architecture](UX-ARCHITECTURE.md) is the current interaction guide. Historical verification below records earlier layouts and colors rather than prescribing them.

## Adopted-name verification

The October 6, 2026 naming pass changes current product-facing labels to PDF Signal Check while keeping repository/package/profile identifiers, privacy-notice preference key, fixture bytes, generator attribution, and historical receipts stable. Runtime export and batch labels share `src/brand.js` constants. No model, policy, or dependency change is included.

- 122 tests passed and production build succeeded.
- Actual agent-browser checks at 1280×900 and 390×844 confirmed the title, two-line wordmark, descriptor, tagline, and export action fit without horizontal overflow.
- Browser-downloaded `14-author-mismatch-pdf-signal-check.pdf` and `.png` carry the adopted brand. PDF title/creator metadata are PDF Signal Check; all four rendered PDF pages and the PNG were visually inspected. Author mismatch values and the approximate byline crop remain intact.
- Download filename stem is `pdf-signal-check`, including batch summaries. Privacy preference compatibility remains intact.
- Independent read-only QA passed against build `index-J_w3P01O.js`: root and Pages-path mobile labels, overflow checks, and saved privacy preference compatibility. Reopening the notice preserved its checkbox state; clearing the preference restored the notice behavior and returned focus to the privacy action.
- Internal QA screenshots: `/tmp/pdf-signal-check-desktop.png`, `/tmp/pdf-signal-check-mobile.png`; actual sample downloads are in the local Downloads folder. These QA artifacts are not committed application assets.

## Repository identity

The local folder and npm package were subsequently renamed to `pdf-signal-check`. At that stage, GitHub publication was deferred. The private repository is now [PreventionWeb/pdf-signal-check](https://github.com/PreventionWeb/pdf-signal-check), with the empty baseline on `main` and implementation on `feature/initial-implementation` for a squash PR. GitHub Pages has not been deployed. Historical validation URLs and receipts retain the paths used when those checks ran.

After the local rename, all 122 tests and the production build passed from the new folder. Agent-browser verified a real author-mismatch review under `/pdf-signal-check/` at 390×844 with the correct brand, comparison evidence, and no horizontal overflow. The local-only production preview for this check used `http://127.0.0.1:4182/pdf-signal-check/`; it is not an external deployment.
