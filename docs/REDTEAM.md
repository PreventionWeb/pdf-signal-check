# Adversarial review and fixes (2026-10-05)

This review mutated the original connected text fixture and checked independent hostile cases beyond the repeated annual-report corpus. These results are deterministic regressions, not estimates of general PDF/model accuracy.

| Reproduction | Before | App 0.3 / profile 0.2 |
| --- | --- | --- |
| Info Title contains whitespace only | Yes, title presence passed | No, missing meaningful title |
| Repeat MCID 1 in a second content sequence | Yes, silently joined extra text | No, marked-content integrity fails |
| Remove EMC closures / add an extra EMC | Yes, parser recovery concealed malformed boundaries | No, raw/observed boundary inspection fails |
| Change H1 into L with directly owned text and no LI | Yes | No under narrowed project list constraints |
| Connect MCID to q/Q-only operations | Yes, state changes counted as content | No—unsupported reference content, indeterminate |
| Append harmless P with empty K and no reference | Yes | Yes; no universal empty-tag defect claimed |
| Later chapter H2 exactly repeats wrong metadata title | Match despite contradictory first-page H1 | Weak candidate cannot establish Match |
| All extracted text uses rendering mode 3 | Yes, no visibility finding | Structural Yes plus explicit visibility review |
| Tagged byline contradicts metadata authors | Yes, unassessed | Structural Yes plus suspected author mismatch |
| Fully connected numbered tags read steps 3,4,1,2 | Yes, unassessed | Structural Yes plus order review and located sequence |

Positive regressions preserve legal unnumbered BMC/BDC containers, artifact boundaries, MCID reuse across different pages, and marked-content boundaries spanning multiple content streams of one page. Raw scanner strings/comments/PDF names cannot impersonate operators. Form XObjects/inline image binary data remain explicitly outside the supported stream scope.

## Remaining priorities

- Publication/byline candidates remain heuristic. Legitimate frontmatter on later pages, subtitles, aliases, initials, transliterations and mixed languages need independent labeled examples. Names should not be delegated to embedding similarity as proof of identity.
- Numbered-step checks flag order anomalies, not all order defects. Multi-column unnumbered prose, interleaved captions, tables and paragraph meaning require more evidence; a numbering restart can legitimately trigger review.
- Invisible rendering is one observable clue. White-on-white text, occluded/off-page content, intentionally incorrect Unicode mappings and misleading artifact declarations can still evade these checks. A profile Yes must stay qualified by these boundaries.
- The semantic model may truncate inputs at 256 tokens; evidence can include characters beyond what the encoder consumed. Future work should export consumed token spans before using long excerpts to support narrower factual claims. Current results remain broad topic screening.
- Keywords are currently embedded as one metadata string. A relevant keyword can mask unrelated keywords; per-term reporting is a future improvement. The current result must not be described as validating every keyword.
- Decoded-stream/operator limits apply after parser allocation. The project does not guarantee a memory ceiling for hostile compressed PDFs. Worker cancellation is the escape hatch; safer bounded decompression and adversarial allocation tests remain future work.
- The synthetic corpus is too small and repetitive to calibrate thresholds. Hold out distinct publications and track false title/byline acceptance before using advisory scores as operational gates.

The required profile changed to 0.2 because marked-content integrity adds a predicate. Author, title consistency, numbered-step and visibility advisories do not change structural acceptance. All limitations stay in exported report/documentation.
