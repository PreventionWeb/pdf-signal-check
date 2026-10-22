# Consistency advisories

Status: delivered on `khawkins98/consistency-checks` (October 2026). Advisory only: profile acceptance is unchanged.

## Why

Most real reports we tried have no saved title, description or keywords, so the earlier AI checks (saved metadata against opening text) usually had nothing to compare. The more common, more useful question is whether the PDF **agrees with itself**: does the title read the same on the cover, in the properties and in the page headers; do the dates line up; is the language right; are maps and charts hidden from screen readers? These checks use what is already in the PDF, and most of them need no AI.

## What is checked

`src/engine/consistency.js` produces `report.consistency.items`. Each item has a **severity**:

| Severity | Meaning | Shown as |
| --- | --- | --- |
| `concern` | Likely wrong or out of date | Check, Warning |
| `minor` | A small difference to tidy up | Check, Minor (ranked last; title differences grouped into one task) |
| `unresolved` | Rules cannot tell | Couldn’t check, unless a completed AI comparison settles it |

| Check | Severity | Rule |
| --- | --- | --- |
| Title written differently: saved title, cover (adjacent large cover lines joined), most frequent running header/footer | year differs or one word swapped: concern. Punctuation, word order, Latin-script spelling (≤2 letters), saved title missing words: minor. Different wording: unresolved | Case-only differences are ignored. Punctuation differences against the cover are ignored, because joining wrapped cover lines loses the punctuation a line break stood for. A shortened running title is normal and not flagged. Headers that share few content words with the title are treated as chapter names. Only the most frequent header can be sent for reworded comparison |
| Still marked Draft | concern | “Draft”, “for review”, “not for circulation”, “embargoed” and similar, on the first page or a running header only (body text such as “the draft law” is ignored) |
| Leftover placeholders | concern | “Error! Reference source not found.”, lorem ipsum, `[insert …]`/`[TBC]`, `XX%` |
| Figures older than the first-page date | concern | Only when pages 1–2 state “as of / updated &lt;Month Year&gt;”. Sentences elsewhere saying “by / as of / until &lt;earlier Month Year&gt;” that also contain another number (a data claim) |
| Declared language vs text | concern | Script share (≥60% Arabic, Cyrillic, Han, …) or common-word counts for en/fr/es/de/pt/it/nl, requiring a clear winner (≥30 hits, ≥1.8× the runner-up). Silent when unsure. The detected language is also kept as `report.consistency.language` and shown beside the saved Language in Document properties (“The text reads as …”) |
| Saved title in a different script from the text | concern | Latin-script title on non-Latin text, or the reverse |
| Placeholder saved values | title: concern; description that is only a link: minor | Numeric or file-name titles (`report_final`), `Untitled`, `Microsoft Word - …`; keywords that are `docId:` values or mixed-case ID tokens (Canva/InDesign) |
| Map or chart marked as decoration | concern | A decorative image covering ≥12% of the page beside a Figure/Map/Chart caption or a `Source:` line, or ≥150 decorative drawing operations beside a Figure/Map/Chart caption. Table captions never count (decorative table borders are correct). A caption must be followed by punctuation, so “Figure 20 identifies…” does not count. A labelled Figure on the page raises the bar to ≥25% / ≥600 |

`page.js` now records header/footer lines (including artifact text, split into left/right segments), the size of decorative images (including inside form XObjects) and decorative drawing counts. `titles.js` also matches saved titles against wrapped cover lines, which removed several false “couldn’t confirm the title” results.

## Contents, repeated figures and image descriptions (October 2026, second pass)

| Check | Rules | AI |
| --- | --- | --- |
| Contents against the pages (`contents.js`) | Finds contents lists (lines ending in a page number, at least four, counting upwards), the printed-to-PDF page offset (the most common offset, supported by at least 40% of entries), entries whose heading is on another page (concern), and the same entry with different page numbers in two lists (concern, entries of four or more words). Headings that wrap are joined; body sentences that only start with the heading words do not count. Unaligned lists (two-page spreads, merged columns) stay quiet. Figure and table entries are never judged without a text match | Entries with no word-for-word heading on the expected page are compared with that page's headings: related becomes minor (“worded differently”), unrelated a concern |
| Same figure, different numbers (`facts.js`) | Sentences stating a quantity with a unit (%, countries, people, billion, …); not citations, captions or contents lines. Two sentences conflict only when a value for the same unit differs, neither restates a subset of the other, they share a year (or state none), neither value sits inside the other's range, and the words around the two numbers mostly match. Identically worded sentences need no AI | Sentences are embedded (spread across the document within a per-model budget: MiniLM 300, Granite 60) and pairs above `factHigh` (MiniLM 0.88, Granite 0.95, provisional) on different pages are checked by the rules above. Shown in Check as “Warning (AI)”, ranked after rule warnings, with an AI tag |
| Image descriptions (`figure-descriptions.js`) | Authoring-tool placeholders (“[Alt text was not generated.]”, “Description automatically generated”), generic words (“chart”, “image 3”) and file names are treated as **missing** (Fix). The same description on three or more images is listed first in the review task (logos excepted) | A description with a caption on its page is compared with the caption; little in common moves it to the front of the review list. Nearby body text is not used: an accurate photo description rarely shares words with the text beside it |

Measured on the corpus with MiniLM in Node (`node scripts/corpus-review.mjs --ai minilm`): the only AI-decided concern is GAR 2025's “nearly nine in ten (86%)” on page 143 against “(89%)” on page 154, a genuine inconsistency. The next most similar pairs (0.82–0.86) were different measures, which set the 0.88 threshold. Contents checks are quiet on every corpus report after fixing false positives; the one real contents disagreement (Global Synthesis chapter lists vs the main list) sits in a merged two-column layout the line reader cannot split. Rules caught Office placeholder alt text on four reports. The 351-page wildfire report used the full 300-sentence budget (16 s in Node; browser WASM is slower). These are observations on 20 files, not accuracy rates.

## Where AI helps

Rules decide everything they can. The local embedding model is used only for title pairs the rules leave **unresolved** (different wording). These are sent with the title check (`names` in the screening request, at most eight). The model's provisional title thresholds turn a pair into minor (“worded differently”, related) or concern (“may name a different document”). The AI never overrides a rule-based concern or minor result, and never runs when the declared language is outside the selected model's coverage. Results record `nameItems` with actual inference provenance.

## Observed on real reports (local files, not committed)

Twenty public reports from the maintainer's machine, run with `analyzePdf` in Node:

- GAR 2025: 19 pages where maps and charts are marked as decoration (spot-checked visually: pages 34, 44 and 99 are a map, an illustration with a chart, and a chart with a table).
- Sendai Framework snapshot, April 2026: the first page says “Data as of April 2026”, but “176 countries reported … by October 2025”.
- EW4ALL handbook (French): declared `en-US`; keywords contain a `docId:` value.
- Arabic GP information note: the saved title is an English title from another document.
- HIPs review: the first page still says “Draft Report 8 May 2025”.
- A job opening whose saved title is its number, and a school bulletin whose keywords are Canva IDs.
- OECD report: saved title adds “(EN)”; the description is only a DOI link (minor).

False positives found and fixed during this pass: footer page-number stripping cut “-2030” from a year range; joined cover lines produced punctuation differences; decorative table borders; Arabic extraction differences; chapter headers compared as titles. Remaining known limits: cover-title detection uses the four largest first-page lines and can include the publisher name. The decorative check is page-level (a caption and a large decorative graphic on the same page), not a geometric caption-to-graphic association. Running headers drawn inside images are invisible to it. Language detection covers a handful of Latin-script languages. Thresholds are hand-set from this small set, not a labelled evaluation.

## Not changed

- The missing-information gate that hid all results for PDFs without a saved title, description or keywords was removed after this pass, so these findings now show for those reports too. The analysis page cap was raised from 200 to 500 pages: GAR 2025 (253 pages, 36 MB) took about 16 s in Node and produced a 21 MB report, within the existing 50 MB, operation and text-item limits.
- The page-by-page “Check graphics marked as decorative” group stays in Check. Moving it would change the story's recorded headline counts and narration.

## Judging each decorative graphic (October 2026)

`page.js` records each artifact (decoration) sequence as one item: images and drawing operations, and its bounding box. `decorative.js` gives each a plain verdict from shape, size, repetition and surroundings, with no pixel analysis:

| Verdict | Rules, in order |
| --- | --- |
| Fine as decoration | a thin line or rule; the same box on 30%+ of pages (logo, header or footer band); under 0.4% of the page; borders or shading around tagged table cells; a few shapes, or a text-heavy area, behind text (a panel or box) |
| Probably carries information | a dense drawing (100+ shapes) or a large graphic (8%+ of the page) on a page with a figure or map caption |
| Can’t tell | many shapes with short numbers (a chart, or a table’s shading); a large picture with no caption; anything else |

Then: a full-page background without a caption is fine; a few shapes are a simple box. Pages with a "probably carries information" item become the “Maps or charts marked as decoration” concern; pages with “can’t tell” items stay in a Check group that says how many other graphics were judged fine; graphics judged fine leave the task list. On GAR 2025 this flags 24 pages (five more than the page-level rule, all checked visually as charts or maps) and clears hundreds of rules, panels and backgrounds across the corpus. A picture with 400+ letters of text drawn on it is a background for that text (fine).

## Optional image model for “can’t tell” graphics (October 2026)

With separate consent in setup (“Also look at images with an on-device image model”, 89.12 MB, plus 64.50 MB when a PDF has photo descriptions to check), CLIP ViT-B/32 (`Xenova/clip-vit-base-patch32`, pinned revision, q8, WASM, `src/image.worker.js`) looks at clean crops of up to 40 “can’t tell” graphics with little text on them (120 letters or fewer, 1%+ of the page; text on a graphic misleads the model). It compares each crop with ten label phrases embedded ahead of time (`scripts/precompute-image-labels.mjs` → `src/engine/image-labels.json`), so the browser downloads only the image half of the model. It never describes images or drafts alt text.

What its answers are allowed to do (`imageVerdict`):
- **Decoration** (content score 20% or less): the graphic leaves the “can’t tell” list. On the October 2026 Sendai snapshot it correctly called coloured header bars and empty cells plain panels.
- **Content** (85%+ and a chart, map, photo, diagram or table label): counts only for a graphic covering 5%+ of the page with 40 letters or fewer. Thin strips with text were the failure: it called three table rows “bar charts” at 96–98%. Accepted content calls become an AI-tagged “Maps or charts marked as decoration” concern on pages the rules didn’t flag, ranked after rule warnings. On GAR 2025 it found two the rules couldn’t place (a rotated bar chart, page 92; a scatter chart, page 16).
- It never overrides a rule verdict. AI coverage in Technical details lists how many graphics it looked at and what it decided.

Measured in Node about 130 ms per graphic after a 24 s first load; in the browser the 89 MB download dominates the first run. These are observations on a handful of reports, not accuracy rates; thresholds are hand-set. ### Descriptions against their pictures

With the same consent, the model also checks photo descriptions (`descriptionCandidates`, `rankDescriptions`). Its text half (64.50 MB) is downloaded only when a PDF has descriptions to check. The rules choose what it may judge: real descriptions (not placeholders the rules already flagged), well-shaped crops (no slivers: some PDFs tag only a strip of a photo), and not descriptions of text graphics (chart, diagram, infographic, map, logo, “titled”…), because CLIP cannot read text. It needs at least five such images in a report, because each description is ranked against the others: a description its own picture ranks below third is flagged. Crops the model sees as a blank panel are left out. Flagged descriptions are listed first in “Review image descriptions” with a plain note; nothing is suggested in their place.

Evaluation on the UNDRR Strategic Framework (30 real descriptions, 8 usable photos): no genuine description was flagged, and 71% of deliberately swapped descriptions were caught. Recovering image positions drawn inside form XObjects (now attributed to the page-level Figure tag around them) was needed for usable crops. The other corpus reports have too few usable descriptions to check, which the rule correctly skips. This is one report's evidence, not an accuracy rate.

## Styling left out of “unlabelled graphics” (October 2026)

Untagged drawings that are page styling no longer make a page an “unlabelled graphics” task (`figures.js`): thin lines running along a line of text (link underlines, strikethrough), pages whose only untagged drawings are long hairlines (header and footer rules, dividers), and backgrounds behind text (a drawn box or band with sentence-length text inside it, or a picture with 400+ letters over it, the same bar the decoration judgement uses). Untagged drawings inside forms now keep their position on the page, which these rules need. On the corpus this removed 43–58% of flagged pages on the reports where it applied (for example 58 → 38, 97 → 54, 8 → 2, and 24 → 1 on the October 2026 harmful-information guidance note), and the pages checked visually were disclaimers, reference lists with linked URLs, shaded tables and boxed sidebars. Short labels in a chart do not count as sentence-length text, so charts stay flagged.
