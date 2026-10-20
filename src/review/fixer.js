/**
 * "For the person fixing it": what the tool found, where to change it in common authoring tools, the exact PDF fields for
 * developers, and how the tool decided. Presentation only; the steps are general guidance for current tool versions.
 */
const STEPS = {
  properties: [
    ['Word', 'File → Info → Properties: Title, Tags (keywords) and Comments (description). Word does not reliably export publisher, date or licence; add those in Acrobat or your publishing system.'],
    ['InDesign', 'File → File Info: Document Title, Author, Description, Keywords and Copyright.'],
    ['Acrobat Pro', 'File → Properties → Description for title, author, subject and keywords; Additional Metadata for licence and other publishing details.'],
  ],
  language: [
    ['Word', 'Select all text, then Review → Language → Set Proofing Language.'],
    ['InDesign', 'Set the language in the Character or Paragraph style the text uses.'],
    ['Acrobat Pro', 'File → Properties → Advanced → Reading Options → Language.'],
  ],
  tags: [
    ['Word', 'Use heading, list and table styles; then File → Save As → PDF → Options → turn on “Document structure tags for accessibility”.'],
    ['InDesign', 'Map paragraph styles to export tags, set the order in the Articles panel, then Export → Adobe PDF (Print) with “Create Tagged PDF” turned on.'],
    ['Acrobat Pro', 'All tools → Prepare for accessibility → Automatically tag PDF, then check the order in the Reading Order or Tags panel.'],
  ],
  text: [
    ['Word', 'Use installed text fonts and real text, not pictures of text; export again.'],
    ['InDesign', 'Don’t convert text to outlines; export again with fonts embedded.'],
    ['Acrobat Pro', 'For scanned pages, Scan & OCR → Recognize text; check the result against the page.'],
  ],
  images: [
    ['Word', 'Right-click the image → View Alt Text, and write what it shows or its main finding.'],
    ['InDesign', 'Object → Object Export Options → Alt Text; under Tagged PDF, choose “Figure”, not “Artifact”, for meaningful images.'],
    ['Acrobat Pro', 'All tools → Prepare for accessibility → Fix alternate text; use the Reading Order tool to change a graphic from Background to Figure.'],
  ],
  hidden: [
    ['Word', 'Select all text and set the font colour to Automatic to reveal white text, then delete what shouldn’t be there.'],
    ['InDesign', 'Check for white, tiny or hidden-layer text frames in the Layers panel and delete them.'],
    ['Acrobat Pro', 'Use Edit PDF or the Content panel to find and delete the hidden text.'],
  ],
  wording: [
    ['Any tool', 'Edit the sentence, heading or label in the source document, then export the PDF again.'],
  ],
  contents: [
    ['Word', 'Right-click the table of contents → Update Field → Update entire table.'],
    ['InDesign', 'Layout → Update Table of Contents.'],
    ['Acrobat Pro', 'Fix the source document instead; contents lists are hard to correct reliably in a PDF.'],
  ],
  links: [
    ['Word', 'Insert → Cross-reference (or Link); for bookmarks, Save As → PDF → Options → “Create bookmarks using headings”.'],
    ['InDesign', 'Use Cross-References and Hyperlinks panels; turn on Bookmarks and Hyperlinks when exporting.'],
    ['Acrobat Pro', 'Edit PDF → Link → Add or edit; Bookmarks panel for navigation.'],
  ],
  attachments: [
    ['Acrobat Pro', 'Attachments panel: check each file’s description; publishing systems can set the relationship and purpose.'],
  ],
};
const FIELDS = {
  properties: 'Info dictionary: /Title, /Author, /Subject, /Keywords. XMP: dc:title, dc:creator, dc:description, dc:subject, dc:publisher, dc:date (or xmp:CreateDate), dc:rights, dc:identifier.',
  language: 'Document catalog /Lang (a BCP 47 tag such as en-GB or fr); spans in other languages use /Lang on their structure element.',
  tags: 'Catalog /StructTreeRoot and /MarkInfo << /Marked true >>; page content wrapped in marked content with /MCID linked from structure elements.',
  text: 'Font /ToUnicode maps; text drawn as paths or images has no extractable characters.',
  images: 'Figure structure element with /Alt; decorative content is wrapped as /Artifact marked content.',
  hidden: 'Text drawn with render mode 3 (Tr 3, invisible), a near-white fill, under 1 pt, or outside the page box.',
  contents: 'Table of contents text and its /Outlines (bookmarks) if present; page labels in /PageLabels.',
  links: '/Link annotations with /A actions or /Dest, and Link structure elements; /Outlines for bookmarks.',
  attachments: '/EmbeddedFiles name tree and /AF associated files with /AFRelationship and /Desc.',
};

const PROPERTY_PATHS = /^(metadataConsistency|authorConsistency|machineMetadata|checks\.title|semantic\.(title|titleAI|subject|keywords|keywordItems)|consistency\.(placeholder|name:saved|language:title))/;
/** Which kind of fix this is, from the finding's recorded source. */
export function fixTopic(finding) {
  const path = finding.source?.path || '', check = finding.source?.checkId, kind = finding.comparison?.consistency?.kind;
  if (PROPERTY_PATHS.test(path)) return 'properties';
  if (check === 'language' || kind === 'language') return 'language';
  if (['structure', 'coverage', 'content-integrity'].includes(check) || path === 'readingOrder' || path.startsWith('semantic.section')) return 'tags';
  if (check === 'text') return 'text';
  if (finding.figureGroup || finding.comparison?.figure || kind === 'decorative' || path === 'review.consistency:decorative') return 'images';
  if (path === 'hiddenInstructions' || path === 'textVisibility') return 'hidden';
  if (/^contents-/.test(kind || '') || path === 'review.consistency:contents') return 'contents';
  if (['crossReferences', 'links', 'outline'].includes(path)) return 'links';
  if (path === 'attachments') return 'attachments';
  if (path.startsWith('consistency.') || path.startsWith('review.consistency')) return 'wording';
  return null;
}

const first = value => Array.isArray(value) ? value.map(item => item?.text ?? item).filter(Boolean).join('; ') : value;
/** Every saved document property the tool read, with “Not saved” for gaps. */
export function savedProperties(report) {
  const m = report.metadata || {}, x = m.xmpProperties || {};
  const title = m.xmpTitles?.find(item => item.lang === 'x-default')?.text || m.xmpTitles?.[0]?.text || m.infoTitle;
  return [
    ['Title', title], ['Author', m.author || first(m.xmpAuthors)], ['Description (Subject)', m.subject], ['Keywords', m.keywords],
    ['Language', m.language], ['Publisher', first(x.publisher)], ['Publication date', first(x.date)], ['Licence (rights)', first(x.rights)], ['Identifier', first(x.identifier)],
  ].map(([label, value]) => ({ label, value: String(value ?? '').trim() || null }));
}

export function fixerDetails(finding, report) {
  const topic = fixTopic(finding);
  return { topic, steps: STEPS[topic] || [], fields: FIELDS[topic] || null, properties: topic === 'properties' || topic === 'language' ? savedProperties(report) : null };
}
