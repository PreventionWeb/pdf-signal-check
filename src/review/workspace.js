/** Presentation only: preserve every recorded outcome and the independent profile receipt. */
export function findingGroups(findings) {
  const groups = { problems: [], uncertainty: [], limits: [], success: [], coverage: [] };
  for (const finding of findings) {
    // An incomplete scan is a tool limit, not evidence of an attachment to review.
    // Keep the normalized finding in technical records and exports.
    if (finding.source?.path === 'attachments' && !finding.comparison?.inventory?.files?.length &&
      !finding.comparison?.inventory?.orphanStreams?.some(stream=>stream.origin === 'reachable-unassociated')) continue;
    const semantic = finding.source?.path?.startsWith('semantic');
    if (semantic && finding.category === 'unassessed') groups.coverage.push(finding);
    else if (finding.source?.checkId === 'supported-content' && finding.category !== 'success' && finding.category !== 'required-defect') groups.limits.push(finding);
    else if (['required-defect', 'advisory-concern'].includes(finding.category)) groups.problems.push(finding);
    else if (finding.category === 'success') groups.success.push(finding);
    else groups.uncertainty.push(finding);
  }
  return groups;
}
/** One review task for heading/text pairs; original member outcomes remain available. */
export function groupHeadingFindings(groups) {
  const headings = [...groups.problems, ...groups.uncertainty].filter(item => item.source?.path?.startsWith('semantic.sectionItems['));
  if (!headings.length) return groups;
  const ids = new Set(headings.map(item => item.id));
  const destination = groups.problems.some(item => ids.has(item.id)) ? 'problems' : 'uncertainty';
  const representative = headings[0];
  const grouped = { ...representative, id: 'review:heading-pairs', title: 'Check that headings describe their sections',
    source: { path: 'review.headingPairs' }, members: headings, targets: [], evidence: [], comparison: null };
  return { ...groups,
    problems: groups.problems.filter(item => !ids.has(item.id)),
    uncertainty: groups.uncertainty.filter(item => !ids.has(item.id)),
    [destination]: [...groups[destination].filter(item => !ids.has(item.id)), grouped],
  };
}
/** Group all image review, including descriptions that passed the presence check. */
export function groupFigureFindings(groups) {
  const figures = Object.values(groups).flat().filter(item => item.comparison?.figure);
  if (!figures.length) return groups;
  const ids = new Set(figures.map(item => item.id));
  const result = Object.fromEntries(Object.entries(groups).map(([key, items]) => [key, items.filter(item => !ids.has(item.id))]));
  for (const type of ['missing', 'described', 'unlabelled', 'decorative']) {
    const members = figures.filter(item => {
      const figure = item.comparison.figure;
      return (figure.decorative ? 'decorative' : !figure.tagged ? 'unlabelled' : !figure.alt ? 'missing' : 'described') === type;
    }).sort((a, b) => a.comparison.figure.page - b.comparison.figure.page);
    if (!members.length) continue;
    result[type === 'missing' ? 'problems' : 'uncertainty'].push({ ...members[0], id: `review:figures:${type}`,
      source: { path: 'review.figures' }, figureGroup: type, members, targets: [], evidence: [], comparison: null });
  }
  return result;
}
export function profileReceipt(report) {
  if (report.accepted) return 'Required text checks passed';
  if (report.checks?.some(check => check.status === 'fail')) return 'Required text defects found';
  return 'Required text checks not established';
}
export function profileReasons(report) {
  return (report.checks || []).filter(check => !['pass', 'not-applicable'].includes(check.status))
    .map(check => `${check.label || check.id}: ${check.summary || check.status}`);
}

/** Review urgency is presentation-only; uncertainty never becomes a confirmed defect. */
export function reviewPriority(finding) {
  if (finding.figureGroup === 'missing' || (finding.comparison?.figure?.tagged && !finding.comparison.figure.alt)) return { rank: 0, key: 'critical', label: 'Critical', noticeVariant: 'negative' };
  if (finding.members?.length) return finding.members.map(reviewPriority).reduce((highest, item) => item.rank < highest.rank ? item : highest);
  if (finding.source?.path === 'readingOrder' && finding.comparison?.readingSequenceMissing) return { rank: 0, key: 'critical', label: 'Critical', noticeVariant: 'negative' };
  if (finding.category === 'required-defect') return { rank: 0, key: 'critical', label: 'Critical', noticeVariant: 'negative' };
  if (finding.category === 'advisory-concern') return { rank: 1, key: 'warning', label: 'Warning', noticeVariant: 'warning' };
  return { rank: 2, key: 'manual', label: 'Needs manual check', noticeVariant: 'info' };
}

/** Plain-language orientation, without promoting incomplete or scope-limited checks to a pass. */
export function reviewSummary(report, groups) {
  const tasks = [...groups.problems, ...groups.uncertainty].sort((a, b) => reviewPriority(a).rank - reviewPriority(b).rank);
  const criticalCount = tasks.filter(item => reviewPriority(item).key === 'critical').length;
  const headline = !report.analysisComplete ? 'The check could not finish'
    : criticalCount || report.checks?.some(check => check.status === 'fail') ? 'This PDF needs work'
      : groups.problems.length ? 'This PDF needs a closer look'
      : 'No problems auto-detected';
  const nextStep = tasks.length
    ? ''
    : 'Download a report to keep the results, including successful checks.';
  const unresolved = (report.checks || []).filter(check => !["pass", "not-applicable"].includes(check.status));
  const graphicsOnly = unresolved.length === 1 && unresolved[0].id === "supported-content"
    && unresolved[0].evidence?.length > 0
    && unresolved[0].evidence.every(value => /non-artifact graphic painting operations/.test(value));
  const scope = report.accepted
    ? 'The PDF met this tool’s requirements for text and structure. You should still check important information yourself; this is not an accessibility certificate or a guarantee of AI accuracy.'
    : report.checks?.some(check => check.status === 'fail')
      ? ''
      : graphicsOnly ? 'This PDF includes graphics. The tool checks for figure descriptions, but cannot judge image or chart meaning. It therefore cannot give a complete pass for this PDF.'
        : 'This is a partial result: some checks could not give an answer. That may be a limit of this tool, rather than a problem with your PDF. The PDF has not met all of this tool’s requirements.';
  return { headline, nextStep, scope, tasks, criticalCount };
}

export function reviewTask(finding) {
  if (finding.figureGroup) {
    const count = finding.members.length;
    const descriptions = {
      missing: ['Add descriptions for images', `${count} image${count === 1 ? '' : 's'} labelled as meaningful ${count === 1 ? 'has' : 'have'} no saved text description. People and tools that cannot see them may miss important information.`, 'Add useful alt text or equivalent nearby text. Mark an image as decorative only if it conveys no essential information.'],
      described: ['Review image descriptions', `${count} image${count === 1 ? '' : 's'} ${count === 1 ? 'has a saved description' : 'have saved descriptions'}. Review whether each description explains the important information; presence alone does not establish accuracy.`, 'Compare each image with its saved description. For charts, include key values and relationships or a data table.'],
      unlabelled: ['Decide whether unlabelled graphics are content or decoration', `Graphics on ${count} page${count === 1 ? '' : 's'} could not be linked to an image label. Check their intended role.`, 'Label meaningful graphics and add useful descriptions. Mark backgrounds, borders and purely decorative shapes as artifacts.'],
      decorative: ['Check graphics marked as decorative', `Graphics on ${count} page${count === 1 ? '' : 's'} are marked as decoration and excluded from machine-readable content. Check that they convey no essential information.`, 'Keep purely decorative graphics marked as artifacts. If a graphic conveys information, give it an image label and a useful description.'],
    };
    const [title, summary, action] = descriptions[finding.figureGroup];
    return { title: `${title} (${count})`, summary, action, detailAction: `${action} Make changes in the source document or a PDF accessibility editor, export again and recheck.`, why: 'Meaningful images need equivalent information in text. Decoration should be excluded so it does not interrupt the reading sequence.' };
  }
  if (finding.members) return {
    title: 'Check that headings describe their sections',
    summary: `Review the ${finding.members.length} heading${finding.members.length === 1 ? '' : 's'} below against the text that follows each one. The AI results are suggestions for review, not confirmed errors.`,
    action: 'Compare each heading with the text beneath it.',
    detailAction: 'Read each heading and its excerpts below, then check the full section in the PDF. Revise misleading headings in the source document. If the wrong text follows a heading, check the PDF’s structure labels, then export and recheck.',
    why: 'Clear headings help readers and software understand a document. The AI compares short excerpts and may miss important context.',
  };
  const path = finding.source?.path || '';
  const check = finding.source?.checkId;
  const broaderEvidence = finding.comparison?.retrieval?.mode === 'document-evidence-v1';
  const comparedText = broaderEvidence ? 'the selected excerpts from across the PDF' : 'the opening text it checked';
  if (path.startsWith('semantic.keywordItems[') && finding.method === 'embedding-screening' && finding.category !== 'unassessed') {
    const keyword = finding.comparison?.query || finding.title.replace(/^Keyword: /, '');
    const summaries = {
      uncertain: 'The AI could not tell whether this saved keyword describes the opening text it checked. This is a question for you to review, not a confirmed error.',
      'suspected-mismatch': 'The AI found little connection between this saved keyword and the opening text it checked. The keyword may still describe a topic covered later in the PDF.',
      'semantically-related': 'The AI found a connection between this saved keyword and the opening text it checked. This does not prove the keyword is accurate for the whole PDF.',
    };
    return {
      title: `Does this keyword describe the PDF? “${keyword}”`,
      summary: (summaries[finding.outcome] || finding.summary).replaceAll('the opening text it checked', comparedText),
      action: 'Compare this saved topic with the excerpts and the rest of the PDF.',
      detailAction: 'A keyword is a topic saved in the PDF’s properties to help people and tools find it. Read the excerpts below, then check the rest of the PDF. If this topic belongs in the document, keep the keyword. If it does not, change or remove it in the source document or PDF properties, export again and recheck.',
      why: broaderEvidence ? 'The AI compares meaning across selected excerpts, while the word-matching baseline looks for literal words. Both searches can miss omitted text and neither verifies facts.' : 'Keywords help people and tools find relevant documents. This AI check compares meaning, rather than searching for the exact words. It uses short excerpts from the beginning of the PDF, so a topic covered later may not appear in its evidence.',
    };
  }
  const failed = finding.outcome === 'fail';
  const success = finding.category === 'success';
  const uncertain = !failed && !success;
  const task = (title, summary, detailAction, why) => ({ title, summary,
    action: detailAction.split(/(?<=\.) /)[0], detailAction, why });
  const repairTags = 'In the original document, use heading styles and proper paragraph, list and table formatting. Export with PDF tags enabled (often called an accessible or tagged PDF), then recheck. For an existing PDF, ask someone with a PDF accessibility editor to add or repair the tags.';
  if (check === 'structure') {
    const missing = failed && finding.summary === 'No structure tree found.';
    return task(missing ? 'Add labels that explain the document’s structure' : 'Check how the PDF labels its content',
      missing ? 'The PDF has no tag tree: the machine-readable labels that identify headings, paragraphs, lists and tables. A visible table of contents does not supply these labels.'
        : failed ? 'The PDF has structure labels, but some connections between those labels and the document’s content are missing or inconsistent.'
          : success ? 'The structure labels are connected to the PDF’s content. This does not confirm that each label is appropriate or that the reading order is correct.'
            : 'The tool could not confirm that the PDF’s structure labels are connected correctly.',
      repairTags,
      'Screen readers and other tools use these labels, called tags, to understand how the content fits together. A page can look well organised while this information is missing.');
  }
  if (check === 'title') return task('Check the saved document title',
    failed ? 'No title is saved in the PDF’s document properties. A title printed on the page does not fill in this setting.'
      : success ? 'A title is saved in the PDF’s document properties. Whether it matches the publication is checked separately.' : 'The saved title could not be checked.',
    'Open the source document’s properties and set its title to the publication’s title. Export again and recheck. You can also correct the title with a PDF editor.',
    'Tools may display or use the saved title to identify the document, even when a different title appears on its pages.');
  if (check === 'language') return task('Check the document language',
    failed ? 'The PDF’s language setting is missing or is not in a recognised format.'
      : success ? 'The PDF has a recognised language setting. The tool has not confirmed that it matches the language of the text.' : 'The PDF’s language setting could not be checked.',
    'Set the document language, such as English, in the original document or a PDF editor. Check that it matches the text, then export again and recheck.',
    'The language setting helps screen readers pronounce words and helps this tool decide which AI checks can run.');
  if (check === 'coverage') {
    const noText = failed && finding.summary === 'No relevant text to account for.';
    return task('Check that the PDF’s structure includes all its text',
      noText ? 'The tool could not extract text to check whether the structure labels include it.'
        : failed ? 'The PDF’s structure leaves out some of its text. Screen readers and other tools may skip those words or read them in the wrong place.'
          : success ? 'All extracted text counted by this check is connected to a structure label. Text marked as decoration is excluded.' : 'The tool could not confirm that the structure labels include all the text.',
      noText ? 'Try selecting and copying a sentence from the PDF. If the pages are scans, use text recognition (OCR), check the recognised words, and export a tagged PDF before rechecking.'
        : 'Check that the highlighted words are included in the PDF’s structure as a heading, paragraph or other appropriate part of the document. A PDF accessibility editor can add the missing connections. If much of the text is affected, export a new PDF from the original document with PDF tags enabled, then recheck it.',
      'Text can be selectable on a page yet missing from the document structure used by screen readers and other tools.');
  }
  if (check === 'text') return task('Check the words machines can read',
    failed ? finding.summary === 'No non-artifact text could be extracted.' ? 'The tool could not extract text, apart from anything marked as decoration.' : 'Some extracted characters may be missing or incorrect, even if the page looks right.'
      : success ? 'The text was extracted without the character problems this tool checks for. This does not prove every word matches the page.' : 'The tool could not finish checking the extracted text.',
    'Compare the recovered words with the PDF page. Try copying a sentence into a text editor. For scanned pages, use text recognition (OCR) and check the words it produces. For incorrect characters, try a fresh export from the source document and recheck.',
    'Screen readers, search and AI tools use extracted words. A page image can look correct while those words are missing or wrong.');
  if (check === 'content-integrity') return task('Check the PDF’s internal content labels',
    failed ? 'Some internal labels are repeated or do not start and end consistently. This can make it unclear which content belongs together.' : success ? 'No repeated or unbalanced content labels were found by this check.' : 'The internal content labels could not be fully checked.',
    'Try exporting a fresh tagged PDF from the source document. If the issue remains, share the technical details with the person responsible for PDF export or accessibility repair, then recheck the corrected file.',
    'These labels connect page content to the document’s structure. Their internal connections can need repair even when the page looks normal.');
  if (path.startsWith('semantic.') && finding.method === 'embedding-screening' && finding.category !== 'unassessed') {
    const section = path.startsWith('semantic.section');
    const subject = path === 'semantic.subject';
    if (subject) {
      const value = String(finding.comparison?.query || finding.comparison?.metadata?.subject || '').trim();
      const quoted = value.length > 240 ? `${value.slice(0, 239)}…` : value;
      const context = value ? `The description saved in this PDF’s document properties ${value.length > 240 ? 'starts with' : 'is'} “${quoted}”${/[.!?]$/.test(quoted) ? ' ' : '. '}` : 'The saved description (called the subject) is a short summary stored in the PDF’s document properties. ';
      const result = finding.outcome === 'suspected-mismatch' ? 'The AI found little connection between this description and the opening text it checked. Check whether it describes the whole document.'
        : finding.outcome === 'semantically-related' ? 'The AI found a connection with the opening text it checked. Check whether the description is accurate for the whole document.'
          : 'The AI could not tell whether this description matches the opening text it checked. Please compare it with the document yourself; this is not a confirmed error.';
      return task('Check the PDF’s saved description', context + result.replaceAll('the opening text it checked', comparedText),
        'Read the saved description and the excerpts below, then check the whole PDF. If the description is inaccurate, edit the Subject field in the source document’s properties or a PDF editor, export again and recheck.',
        broaderEvidence ? 'The saved description helps people and software understand what the PDF is about. This experimental check compares selected excerpts from across the PDF; omitted text may still change the assessment.' : 'The saved description helps people and software understand what the PDF is about. This AI check uses short excerpts from the beginning, so it may miss topics covered later.');
    }
    const label = section ? 'heading' : subject ? 'saved subject' : path === 'semantic.keywords' ? 'saved keywords' : 'saved title';
    const material = section ? 'the following text it checked' : 'the opening text it checked';
    return task(section ? 'Does this heading describe the text below it?' : `Does the ${label} describe this PDF?`,
      finding.outcome === 'suspected-mismatch' ? `The AI found little connection between the ${label} and ${material}. This suggests a possible mismatch for you to review.`
        : finding.outcome === 'semantically-related' ? `The AI found a connection between the ${label} and ${material}. This does not prove that the wording is accurate.`
          : `The AI could not tell whether the ${label} describes ${material}. This is not a confirmed error.`,
      section ? 'Read the heading and excerpts below, then check the full section in the PDF. If the heading is misleading, revise it in the source document. If the wrong text follows it in the extracted order, check the PDF’s structure labels. Export again and recheck any changes.'
        : `Compare the ${label} with the excerpts below and the whole document. ${subject ? 'The subject is a short description saved in the PDF’s properties. ' : ''}If it is inaccurate, correct the document properties in the source document or a PDF editor, export again and recheck.`,
      `This AI check compares meaning using short excerpts. ${section ? 'It may not see the whole section or all the context for the heading.' : 'It may miss topics covered later in the document.'} Similar meaning does not establish factual accuracy${label === 'saved title' ? ' or the correct publication, year or edition' : ''}.`);
  }
  if (path === 'metadataConsistency' || path === 'deterministicTitle') return task('Compare the saved title with the publication title',
    finding.outcome === 'match' ? 'The saved title matches a likely title found on the first page. The tool cannot confirm that this is the intended publication title.'
      : finding.outcome === 'suspected-mismatch' ? 'The saved title may identify a different title, year or edition, or the PDF contains conflicting saved titles.' : 'The tool could not confirm that the saved title matches the publication title.',
    'Compare the saved title below with the full title on the cover or title page, including the year and edition. Correct the document properties if needed, export again and recheck.',
    'The saved title can identify the wrong publication even when the page text is readable. A shortened title or a title page later in the PDF may need your judgement.');
  if (path === 'authorConsistency') return task('Check the author names',
    finding.outcome === 'match' ? 'The saved author names agree with a likely author line on the first page. This does not verify authorship.'
      : finding.outcome === 'suspected-mismatch' ? 'Saved author names differ from a likely author line, or the PDF has conflicting saved author lists.' : 'The tool could not confirm whether the saved author names agree with the names on the page.',
    'Compare the saved names below with the publication’s authors. Check initials and distinguish authors from editors and publishers. Correct the saved author information if needed, export again and recheck.',
    'Saved author information helps tools attribute the document. Differences in spelling or initials can need human judgement.');
  if (path === 'readingOrder' && finding.comparison?.readingSequenceMissing) return task('Add a machine-readable reading order',
    'No machine-readable reading sequence was recovered. Screen readers and other tools may not know which text to read first.',
    'In the original document, use heading styles and export with PDF tags enabled. For an existing PDF, use a PDF accessibility editor to add or repair its reading order. Export an updated PDF and recheck it.',
    'A page can look well organised while the reading sequence used by screen readers and other software is missing.');
  if (path === 'readingOrder') return task('Check the reading order',
    finding.outcome === 'requires-review' ? 'The tool found numbering or heading positions that may indicate text is read out of order. A deliberate numbering restart or layout choice could also explain this.' : 'The tool has not established the reading order of the whole document. No warning from this check would prove that the order is correct.',
    'Compare the extracted sequence with how the PDF should be read, especially across columns and numbered steps. If no sequence is available, check or add structure labels with a PDF accessibility editor. Correct the order there or in the source document, then export again and recheck.',
    'Screen readers and other tools can follow a different order from the one suggested by the page layout. Connected structure labels alone do not guarantee a sensible sequence.');
  if (path === 'textVisibility') return task('Compare extracted words with the visible page',
    finding.outcome === 'requires-review' ? 'The PDF contains text set not to appear as ordinary visible text. It may be useful recognised text behind a scan, or it may differ from what people see.' : 'This check did not establish that every extracted word is visible. Text can still be hidden by colour, overlap or other layout choices.',
    'Compare the extracted words with the page. Text behind a scan can be useful if it matches the image. If words are incorrect or duplicated, correct the recognised text or the source document, export again and recheck.',
    'Search, screen readers and AI tools can use words that people cannot see on the page. Hidden text is not automatically a defect.');
  if (path.startsWith('figureAlternatives')) {
    const figure = finding.comparison?.figure;
    if (figure?.decorative) return task(`Decorative graphics on page ${figure.page}`, finding.summary,
      'Check that these graphics convey no essential information. If they do, label them as meaningful images and add useful descriptions.',
      'Graphics marked as decoration are excluded from machine-readable content.');
    if (figure) return task(figure.tagged ? `Image ${finding.comparison.figureNumber || 1} on page ${figure.page}: check the description` : `Graphics on page ${figure.page}: content or decoration?`,
      !figure.tagged ? 'A graphic was found, but the tool could not reliably connect it to an image label. It may convey information or may be decoration.'
        : !figure.alt ? 'An image label was found without a saved text description.'
          : figure.status === 'uncertain' ? 'A text description is saved, but the tool could not reliably connect the image label to the page content.' : 'A text description is saved for this image. Its accuracy and completeness have not been checked.',
      figure.tagged ? 'Look at the image and decide what information it conveys. For a meaningful image, check that its text description or nearby text explains that information. For a chart, include key values and relationships or a data table. Use the source document or a PDF accessibility editor to add or correct the description and image label. Mark purely decorative graphics as decoration, then export again and recheck.' : 'Check whether these graphics convey information. Mark backgrounds, borders and purely decorative shapes as decoration (artifacts) in your source document or PDF accessibility editor. For meaningful images or charts, add an image label and a useful text description or nearby equivalent. Export again and recheck.',
      'People and tools that cannot interpret the image need its important information in text. Finding a description does not prove that it is useful or correct.');
  }
  if (path === 'attachments') return task('Check files attached to this PDF', finding.comparison?.inventory?.files?.length
    ? `This PDF lists ${finding.comparison.inventory.files.length} attached or linked file${finding.comparison.inventory.files.length === 1 ? '' : 's'}. Their contents have not been checked.`
    : 'An embedded-file declaration was found, but the tool could not recover its filename or purpose.',
    'Check the listed files and their purpose with the publisher or source document. Make sure the PDF explains how to use them. Review each attachment separately; this tool does not open or analyse its contents.',
    'Important information may be in an attached file rather than on the PDF pages. A filename or description alone does not establish what the attachment contains.');
  const checks = {
    load: ['Check that the PDF can be opened', 'Read the file error and try a fresh PDF export if needed.'],
    completion: ['Complete the PDF check', 'Some checks did not finish. Read the reason and decide whether to retry or use another tool.'],
  };
  if (checks[check] && !success) return { title: checks[check][0], action: checks[check][1] };
  return { title: finding.title, action: finding.category === 'required-defect'
    ? 'Inspect the failed check and follow the guidance to correct the source document.'
    : finding.category === 'advisory-concern'
      ? 'Compare the evidence with the page to decide whether this needs a correction.'
      : uncertain ? 'Inspect the evidence: the tool could not confirm this automatically.' : 'Review the recorded evidence and limitations.' };
}

/** A drawing-operation count does not establish the number of distinct images. */
export function reviewLimitEvidence(value) {
  return /non-artifact graphic painting operations/.test(value)
    ? 'This PDF contains graphic content. Check that meaningful images and charts have a useful text description or nearby text that conveys the same information.'
    : value;
}
