# Advisory: AI results, rule results and how people read them

Date: 2026-10-20. Scope: the results experience on `khawkins98/consistency-checks`, evaluated as if the metadata gate is removed and the page cap is 500. Evidence: all 20 local corpus PDFs through `analyzePdf` in Node, plus browser sessions (1366 px and 390 px) on the Sendai snapshot (no AI) and the OECD wildfire report (MiniLM). Screenshots: `/tmp/psc-advisor/`. No PDF content left the machine.

## 1. What a first-time, non-technical user understands and misunderstands

**Before any result: three interruptions.** A PIN, an "About AI and your PDF" modal (`02-after-pin.png`), then a two-step "Set up PDF checks" dialog whose pre-selected "Recommended" option is a 123 MB Granite download, followed by a speed test (`03-setup-desktop.png`, `10-setup-step2-ai.png`). A communications officer who wants to know whether their PDF is okay must first choose between "Granite R2 · multilingual" and "MiniLM · compact English". The Standard-checks path is quick and quiet; the AI path reads like installing software.

**Sendai snapshot, April 2026 (no AI; `05`–`08`).** Headline "1 thing to fix, 5 to check." The stale-date card is the best thing in the product: a quoted sentence, a crop, a pin, a plain consequence (`06-sfm-stale-date.png`). Two things undermine it: "What to change: Check whether these figures were updated" is not a change, and the plain tier leaks method jargon ("Page 1 · blue outline: one approximate located evidence region; 1 additional regions remain in textual/full-page evidence").

The same file shows the list's structural problem. Of five Check items, one or two are real; the rest are standing disclaimers dressed as tasks: "Check the reading order" (nothing was found), "Check the saved title matches the cover" (no title is saved, so it duplicates Fix item 1 and then lists four cumulative candidate strings that look like a bug: `07-sfm-title-dup.png`, `08-sfm-mobile.png`), and "Decide whether unlabelled graphics are content or decoration". The reader counts five problems.

**OECD wildfire report (MiniLM; `12`–`18`).** The user consented to a 24 MB model plus 27 MB runtime, watched a progress bar, and got a fix list with no AI in it. Technical details explains: "Keywords screening: 0 of 4 … Sections screening: 0 of 0 … Subject screening: No subject metadata or sufficient opening text" (`15-oecd-technical.png`). The default screen says nothing; the only trace is a count of 6 in the collapsed "Couldn't check" group, which opens onto sentences like "related terms do not average away flagged terms" (`16-oecd-couldnt-check.png`). The user will believe the AI checked the document and found it fine.

In the list, #2 is "39 cross-references aren't links", ranked Warning above the title and description concerns; #3 is "Decide whether unlabelled graphics are content or decoration (98)". On GAR 2025 the equivalents are 98, 153, 163 and 178, and "Maps or charts marked as decoration (19 pages)" sits next to "Check graphics marked as decorative (153)": two cards about decoration with different numbers.

**Misunderstandings to expect:** that the count headline measures severity (no tags at all and a missing title are one item each); that a Check item is confirmed; that "Couldn't check" is about their PDF; that AI read the whole document; and that AI produced the stale-date and Draft findings (rules did, and those are what people will remember).

## 2. How AI and rule results should interact

**Where the embedding model adds value on this corpus: almost nowhere, as wired.** Census of 20 files: 6 have a saved title, 3 a subject (one a DOI), 3 keywords (two are tool IDs), 4 have tagged headings with usable bodies on pages 1–3, and 2 have a title pair the rules left unresolved (one Arabic with no declared language, so no model runs). Every memorable finding in `docs/CONSISTENCY.md` came from rules. The current AI jobs compare metadata real reports rarely have against opening pages that are a cover, a TOC and a foreword.

**Default: standard checks, zero modals.** Offer AI after the first result, only when rules have found something to compare: "This PDF has 30 image descriptions and 4 keywords the AI could compare. Add AI checks (24 MB, stays on your device)?" No comparable inputs, no offer. Consent becomes a value proposition, the speed test leaves the critical path, and the OECD outcome cannot happen. The privacy notice becomes a footer link plus one sentence on that offer.

**"The AI checked this" as a receipt, not a badge.** One line under the headline: "Checked with standard checks" or "…and AI (English)"; when AI ran but compared nothing, "AI had nothing to compare in this PDF". A small "AI" tag on a card only when the model's judgement decided its bucket; never on rule findings.

**Uncertainty.** AI "uncertain" and rule "unresolved" belong together under Couldn't check as one plain line per kind with counts ("The AI couldn't judge 2 of 4 keywords"); the rest goes in the drawer. Standing limits (image meaning, text visibility, author names when none is saved) are a footnote, not items.

**Do more, given "flag, don't suggest":** triage of long human-judgement lists, where ranking helps and deciding does not. The clearest candidate is image descriptions: compare each alt text with its caption or surrounding tagged text, surface the five least related first, combined with rules for filename-like, generic or duplicated alt text. Short texts, plentiful in tagged PDFs, and an ordering tolerates false positives. Second: the existing title-variant reclassification, sound but rare. **Do less:** subject and keyword screening against opening excerpts, and heading/body on the first three pages; keep them behind the experiment flag until retrieval is proven.

## 3. Prioritised recommendations

1. **Standard checks by default; contextual AI offer after results.** Why: AI contributed to neither browser run and could contribute to about 3 of 20 files; three modals precede the first result. Effort M. Worked if: first result under 10 s with no dialogs; offer shown only on files with comparable inputs.
2. **Remove disclaimers-as-tasks** (reading order with no finding, title-matches-cover with no saved title, author names with none saved, text visibility). Effort S. Worked if: median corpus Check count falls by 2 with no labelled finding lost.
3. **Merge the two decoration cards and cap counts.** One "Maps or charts marked as decoration" card ranked first, with the page-level 153 folded in as context; unlabelled graphics becomes one lower-ranked card naming the three pages with captions. Effort M. Worked if: no card title carries a number above 20 without a "start with" subset.
4. **Lead sentence under the count headline**, derived from the top Fix item ("Start with: export a tagged PDF; most other problems follow from that"). Effort S. Worked if: four of five testers name the root cause unprompted.
5. **Move cross-references-aren't-links to Make it travel further.** It is aspirational by the owner's definition and outranks real concerns. Effort S. Worked if: on OECD and GAR the first Check item is a consistency concern or figure review.
6. **"Checked with…" receipt line and AI tag only on AI-decided cards.** Effort S. Worked if: a tester can say which items the AI influenced.
7. **Scrub method language from the plain tier** (evidence-region line, screening sentences, cumulative title candidates). Effort S. Worked if: no sentence about the tool's method remains outside the drawer.
8. **Prototype alt-text triage** (experiment 2) before investing further in metadata screening. Effort L. Worked if: precision@5 above 0.8 on a labelled set.

## 4. Testing and evaluation loop

Keep `dev-corpus/pdfs/` ignored. Add an ignored `dev-corpus/expectations.json` keyed by SHA-256: page count, metadata presence, expected headline counts, and per-finding labels `{id, kind, label: true|false-positive|missed, note}` for consistency, cross-reference, decoration and title items. A `test/corpus.test.js` skips when the folder is absent; otherwise it runs `analyzePdf` on each file and fails on new items or expected items that vanish. Commit the test and a schema README; never commit hashes paired with filenames, titles, extracted text, crops or JSON reports (the school bulletin alone makes this non-negotiable). Aggregates (counts per kind, FP rate per rule, runtime per page) can go in `docs/EVALUATION.md` as numbers only.

False-positive tracking: each rule tuning (the "-2030", chapter-header and table-border fixes) becomes a label flip in expectations plus a synthetic case in `test/consistency.test.js`, so public tests keep the behaviour and the private file keeps the provenance.

Title-variant thresholds: generate pairs from the corpus (saved/cover/running triples, cross-document negatives, scripted-perturbation positives), run both models through the `scripts/evaluate-models.mjs` worker path with a generated, uncommitted cases file, and record only score distributions and chosen cutoffs. With two real unresolved pairs in 20 files, spend little here until experiment 4 settles the feature's yield.

## 5. Experiments

1. **Opt-in-later AI.** Hypothesis: a post-result offer raises the share reaching a result without lowering AI uptake where it helps. No telemetry exists, so use six moderated sessions: completion, time to first result, and whether participants can say what the AI did.
2. **Alt-text triage.** Hypothesis: cosine(alt text, caption or nearby text) plus rules ranks bad descriptions first. Label the Strategic Framework's 30 descriptions and the synthetic samples; success is precision@5 ≥ 0.8 and beating a rules-only baseline.
3. **Headline comprehension.** Hypothesis: a root-cause lead sentence changes what people tell the designer. Five participants per variant on GAR and the Annual Report; success is four of five naming tags or the title before "178 images".
4. **Title-variant yield.** Hypothesis: under 10% of real reports yield an unresolved pair a model can judge. Count across the corpus plus 30 more public reports; if confirmed, keep the capability but drop it from the AI offer copy.
