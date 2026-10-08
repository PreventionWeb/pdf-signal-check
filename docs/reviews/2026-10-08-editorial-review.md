# Editorial and user-journey review — 8 October 2026

Review of `feature/initial-implementation` at `33ed03f`. Review only: no application, configuration, policy, narration or model changes. This is the editorial profile of the requested independent review; the technical profile covers implementation correctness and export verification separately.

The central journey is strong: a clear-looking document can lose meaning, the tool identifies concrete things to fix or check, and the person repairs the source and exports again. The current homepage and approved story communicate that much better than the older README. The most urgent confirmed journey problem is the About page’s skip link. The largest editorial opportunities are simplifying the first-use decision and making the repair handoff as clear as the diagnosis.

## Scope and evidence

Read AGENTS.md, UX-ARCHITECTURE.md, ARCHITECTURE.md, PROFILE.md, EVALUATION.md, the approved narration and full story script, plus relevant UI/export source. Exercised the production preview at `http://127.0.0.1:5202/pdf-signal-check/` in isolated Chromium session `astra-editorial-review`, using desktop views at 1280/1440 pixels wide and a 390 × 844 mobile viewport.

Browser coverage: first-visit privacy notice; homepage and eight sample cards; first-use setup with an explicit no-AI choice; Partly prepared results, image evidence, reading-order comparison and inspector, technical tab; mobile result layout; homepage-to-About video link, play/pause, scene selection and settings; missing-information repair gate; navigation to batch intake. No model downloads, paid API calls, real private PDFs or secrets were used. No full batch was run in this editorial session. Export source and the technical reviewer’s reported download results inform the handoff suggestions; this profile did not independently render the export. Playback controls, sampled scenes, captions and transcript were reviewed, not continuous audio quality or every animation frame. This is not a screen-reader usability test or accessibility certification.

## Prioritized findings

### E1 — P1, confirmed: “Skip to content” leaves About instead of skipping within it

**Evidence:** `src/app/App.jsx:42` recognizes only `#about` and `#about-video` as About routes; `src/app/App.jsx:115` points the shared skip link at `#main`. Browser reproduction: open the story through the homepage link, focus “Skip to content”, press Enter. The URL changed from `?scene=8#about-video` to `?scene=8#main`, About disappeared, and the intake page appeared. The paused story was lost from the visible page.

**Impact:** The people most likely to use the accessibility shortcut are taken away from the explanation they wanted to read or listen to. This directly undermines the product’s seeing/listening promise.

**Suggestion:** Keep the active page and story state while moving focus to its main content. This needs a routing/focus correction, not replacement wording. The technical review owns the implementation details. Verify with keyboard activation from both About entry points, then verify the intake/results shortcut still works.

### E2 — P2, confirmed: current public-facing documentation contains stronger claims and older workflows than the app

**Evidence:** `README.md:7` says well-structured PDFs mean screen-reader users and AI tools “both get it right”, then later disclaims guaranteed AI accuracy. `README.md:15` says six samples; `README.md:47` says four simple examples; the live page offers eight. `README.md:31` describes “Document → Checks → Processing → Review”, while the current interface uses intake, modal setup, and the results workspace. `docs/ARCHITECTURE.md:56` and `:66` still describe reviewed annotations/group checkboxes after the user explicitly removed that interaction. `docs/ARCHITECTURE.md:23` says “Local assets only”, conflicting with the current pinned external UNDRR theme/font/logo policy.

**Impact:** Readers and future contributors receive a contradictory explanation of capability and UI. A caveat later in a paragraph does not neutralize an earlier unconditional promise.

**Suggested replacement for the claim:** “Good structure gives screen readers and other tools clearer information to work with. Missing or misleading structure can make information harder to follow or extract. Human review is still needed.”

**Suggested workflow wording:** “Choose a PDF or one of eight samples, confirm your check settings on first use, then review Fix and Check beside the pages. Technical evidence remains available separately.” Remove the obsolete reviewed-state statements and describe the approved versioned UNDRR asset loading accurately. Update current contributor guidance; retain dated validation records as historical evidence rather than rewriting history.

### E3 — P2, editorial/product decision: setup demands a model decision before the sample demonstrates the tool’s value

**Evidence:** `src/app/Setup.jsx:55` leads with “Choose a model for your PDFs”; `:56` recommends Granite and says “Use no AI model only if local AI cannot run”; `:60–69` presents model names, language coverage, token limits, estimated grades, runtime sizes and saved download permission. Browser: choosing Partly prepared as the first sample opens this screen before any result. All this is honest and the no-AI path works, but it is considerably more technical than the homepage’s “get a fix list” promise.

**Impact:** A less technical person must understand the mechanism before seeing the practical benefit. “Only if” also makes the no-download route sound inappropriate, although useful title, tags, order and image-description findings were delivered in the no-AI sample run.

**Suggestion:** Preserve the model recommendation and explicit consent policy while putting the decision in user terms. For example: heading “Choose your checks”; lead “Every option checks the PDF’s text, tags and saved details. Optional AI also compares short passages with titles, descriptions and headings.” Label the existing options by purpose first, retaining model names as secondary identifiers. Keep total expected download cost and supported languages visible before consent; put tokenization and detailed benchmark explanations behind “Compare technical details”.

**Optional policy choice:** Rename “No AI model · fallback” to “Standard checks · no model download” and say “You can add AI comparisons later.” This is a proposed change in emphasis, not a defect or instruction to overturn an intentional AI-first recommendation. A sample-only standard-check shortcut is another possible experiment, not a prerequisite for release.

### E4 — P2, editorial suggestion: give the result a stronger handoff action and distinguish the short fix list from the full record

**Evidence:** `src/export/ExportMenu.jsx:44` places “Download fix list (PDF)” and “Download detailed report (JSON)” together in the hero. The compact result use suppresses the session-lifetime and document-content note at `:48`. `src/review/ResultHero.jsx:13` can show a next step, but `src/review/workspace.js:116` supplies none when tasks exist. The plain repair reminder appears lower in the issue legend. `src/export/report.js:57` always adds a technical appendix. The technical reviewer reports that the two-page Partly prepared sample produced an eleven-page PDF, including eight technical pages.

**Impact:** The app diagnoses clearly, but the next social step—what to send to the person who can actually repair it—is less prominent. JSON competes with the practical action; a download called “fix list” can be unexpectedly long and technical for its recipient.

**Suggestion:** Add a single task-specific sentence near the PDF action: “Send this fix list to whoever edits the original document. Ask for an updated PDF, then check it again.” Keep the reminder that the app does not repair the PDF. Move JSON to Technical details or a secondary download menu. Consider a short fix-list PDF plus a separately labelled “Full report with technical evidence”, or clearly disclose that the existing PDF includes the appendix. Preserve captured evidence and source identity in either design.

Retain a concise persistence explanation where it is useful: “Download the results to keep them after closing this tab.” The full privacy note can stay in the existing notice. Do not restore Reviewed checkboxes: their removal is an explicit preference, and this recommendation does not require them.

### E5 — P2, confirmed terminology drift; count implementation belongs to the technical review: batch uses a different vocabulary for the same review job

**Evidence:** `src/batch/BatchPanel.jsx:93` displays “detected concerns”, “human-review items” and “tool limits”; single-document results use Fix, Check and Couldn’t check. `:316` leads with “Foreground session only”; `:333` says “Queue settings (frozen when started)”; `:329` uses “traditional checks”. Browser batch intake confirmed that these terms appear in the real flow, with five zero-status counts before files are added. The technical reviewer independently identified count differences between batch summaries and grouped results.

**Impact:** Opening a report can appear to change both the number and kind of work required. Operational jargon also makes the batch page feel like a different product.

**Suggestion:** Use the same grouped Fix / Check / Couldn’t check semantics in the queue and report. Present processing state separately (“Finished checking” rather than a quality verdict). Suggested note: “Keep this tab open while PDFs are checked. Closing or reloading clears the queue.” Suggested configuration label: “Checks for this batch”; supporting text: “These settings apply to all PDFs in this run.” Empty intake can lead with “Choose up to 20 PDFs” instead of “0 of 0 PDFs finished”. Preserve the actual pause/stop and retention distinctions; simplifying the language must not conceal them.

### E6 — P3, confirmed copy inconsistency: About promises a one-time model download

**Evidence:** `src/app/AboutPage.jsx:150` says a chosen local model “downloads once”. Setup explicitly says transfer/cache cost varies (`src/app/Setup.jsx:68`) and resetting setup leaves downloaded files in the browser cache (`:77`). A repeat transfer remains possible after cache removal or a different pinned model.

**Suggested replacement:** “If you choose a local AI model, its files download with your permission and the checks run on your device. Your browser may reuse downloaded files on later visits.” This keeps the reassuring privacy claim while avoiding cache certainty.

## Story and About: preserve the approved direction

The approved eighteen-scene narration now has a coherent causal chain: people see/listen and machines process; one visible chart finding becomes inaccessible or ambiguous through specific hidden-layer problems; downstream search and AI effects are explicitly possible; repairs come before optional wider reuse. The “possible wrong answer” is marked hypothetical, the example is identified as fictional, and the real-result cameo says “problems like these”. Do not weaken these distinctions or imply that the animation is a captured AI experiment.

The homepage’s static linked poster opens the paused About player at the right section. At 390 pixels wide, captions and controls were readable, the transcript was discoverable, and the inspected About/result states had no document-level horizontal overflow. The reading-order example uses method steps, not rearranged chart labels; the cake analogy is framed as an analogy. Full narration and scene descriptions remain available in the transcript. These are strengths worth preserving.

Two optional refinements need no rewrite of the approved voice track:

- **Improve a paused scene jump.** Choosing scene 8 in Playback settings while paused lands at 78.72 seconds, where the stage is initially blank while the new caption is already present. Playing resolves it as the objects enter. A representative still for paused scene selection would make the scene menu more useful as an illustrated reference. Do not change continuous-play timing merely to address this preview case. See `src/story/StoryPlayer.jsx:122` and animation-time handling at `:118`.
- **Strengthen the bridge from explanation to practice.** Place an unobtrusive “Try the example in the tool” action near the completed story, or name the “Chart as a picture, text out of order” sample in adjacent copy. Users otherwise need to remember which of eight differently named samples corresponds to the closing result. Keep the existing “Check your own PDF” primary action and preserve the distinction between the multiple synthetic examples used in the story.

About’s production flow usefully separates authoring advice from what this tool contributes. As a later editorial pass, qualify its card labels rather than adding repeated disclaimer paragraphs: for example, change “This tool checks: Image descriptions, decorative graphics” to “This tool checks: whether labelled images have saved descriptions, and which graphics are marked decorative.” That more closely matches the presence-versus-quality distinction already explained elsewhere. The primary UNDRR–OCHA guidance is named but not linked in “Where this comes from”; add its public source link when available so the GAR2025/Copilot example and production guidance can be traced directly. No external factual verification of that example was attempted in this review.

## Purposeful choices that should not be reported as defects

- The missing-document-information gate is an explicit product prerequisite. In the browser it leads with “This PDF needs basic fixes first”, shows what is absent, supplies Word/Acrobat/InDesign steps and offers an updated-file path. It does not need to expose the suppressed checklist. If tightening copy, say “Add basic document information before continuing this tool’s detailed review”; do not claim all these fields are universally mandatory or change the gate threshold.
- Make it travel further is collapsed and uncounted in the reviewed result. Couldn’t check is separately collapsed and explained as a tool limit. Cross-reference and detached-value concerns under Check are explicitly allowed by the UX reference; do not move them solely because they originate in the travel module.
- A “Well prepared” sample may still require people to inspect descriptions or decorative graphics. That is consistent with the tool’s limits and does not justify a blanket green certification. A small expectation-setting sample note could help: “Even well-prepared PDFs still need a human check.”
- Technical details are available and substantial. They belong behind the technical tab/drawer; their existence and the narrow formal profile are not editorial defects. The needed improvement is consistency at the transition to batch and downloads.
- The first-visit privacy notice and explicit asset-download consent have a clear purpose. Simplify wording and hierarchy if desired; do not remove consent or blur what is stored locally.

## Suggested order of work

Fix the skip-link route, reconcile current README/architecture claims, and align batch summary semantics first. Then choose whether to simplify first-use framing and separate the concise repair handoff from the full technical download. Preserve the approved narration and evaluate the small scene-preview/practice-link refinements independently. No requested changes were implemented by this review.
