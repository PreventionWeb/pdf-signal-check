/** Presentation only: preserve every recorded outcome and the independent profile receipt. */
export function findingGroups(findings) {
  const groups = { problems: [], uncertainty: [], limits: [], success: [], coverage: [], opportunities: [] };
  for (const finding of findings) {
    // An incomplete scan is a tool limit, not evidence of an attachment to review.
    // Keep the normalized finding in technical records and exports.
    if (finding.source?.path === 'attachments' && !finding.comparison?.inventory?.files?.length &&
      !finding.comparison?.inventory?.orphanStreams?.some(stream=>stream.origin === 'reachable-unassociated')) continue;
    // Comparing a saved title or author list with the page means nothing when none is saved; the missing value is its own Fix item.
    const saved = finding.comparison?.metadata;
    if (['metadataConsistency', 'authorConsistency'].includes(finding.source?.path) && finding.outcome === 'uncertain' && saved &&
      !Object.values(saved).flat().some(value => String(value?.text ?? value ?? '').trim())) continue;
    const semantic = finding.source?.path?.startsWith('semantic');
    if (semantic && finding.category === 'unassessed') groups.coverage.push(finding);
    else if (finding.source?.checkId === 'supported-content' && finding.category !== 'success' && finding.category !== 'required-defect') groups.limits.push(finding);
    else if (finding.category === 'opportunity') groups.opportunities.push(finding);
    else if (['required-defect', 'advisory-concern'].includes(finding.category)) groups.problems.push(finding);
    else if (finding.category === 'success') groups.success.push(finding);
    else groups.uncertainty.push(finding);
  }
  return groups;
}
/** Heading/text pairs become at most two tasks: suspected mismatches to check, and pairs the AI could not judge.
 * Original member outcomes remain available. */
export function groupHeadingFindings(groups) {
  const headings = [...groups.problems, ...groups.uncertainty].filter(item => item.source?.path?.startsWith('semantic.sectionItems['));
  if (!headings.length) return groups;
  const ids = new Set(headings.map(item => item.id));
  const group = (id, members) => ({ ...members[0], id, title: 'Check that headings describe their sections',
    source: { path: 'review.headingPairs' }, members, targets: [], evidence: [], comparison: null });
  const concerns = headings.filter(item => item.category === 'advisory-concern');
  const unresolved = headings.filter(item => item.category !== 'advisory-concern');
  return { ...groups,
    problems: [...groups.problems.filter(item => !ids.has(item.id)), ...(concerns.length ? [group('review:heading-pairs', concerns)] : [])],
    uncertainty: [...groups.uncertainty.filter(item => !ids.has(item.id)), ...(unresolved.length ? [group('review:heading-pairs:unresolved', unresolved)] : [])],
  };
}
/** Descriptions to review first: shared by several images, or unrelated to their caption according to the AI. */
export const descriptionConcern = item => {
  const description = item.comparison?.description;
  return description ? (description.flags.includes('duplicate') ? 2 : 0) + (description.image?.mismatch ? 2 : 0) + (description.ai?.status === 'suspected-mismatch' ? 1 : 0) : 0;
};
/** One plain note on why a description is listed, or null. */
export function descriptionNote(item) {
  const description = item.comparison?.description;
  if (!description) return null;
  if (description.flags.includes('auto-generated')) return 'This is a placeholder written by the authoring tool, not a description.';
  if (description.flags.includes('file-name')) return 'This is a file name, not a description.';
  if (description.flags.includes('generic')) return 'This only names the kind of image; it does not say what it shows.';
  if (description.flags.includes('duplicate')) return `The same description is used for ${description.duplicates} images.`;
  if (description.image?.mismatch) return `The on-device image model found this description matches its picture less well than ${description.image.rank - 1} other description${description.image.rank === 2 ? '' : 's'} in this report do. Check that it describes this image; the model can be wrong.`;
  if (description.ai?.status === 'suspected-mismatch') return `The AI found little in common between this description and the caption “${quote(description.caption)}”. It may describe a different image.`;
  return null;
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
      return (figure.decorative ? 'decorative' : !figure.tagged ? 'unlabelled' : !figure.alt || item.comparison.description?.unusable ? 'missing' : 'described') === type;
    }).sort((a, b) => descriptionConcern(b) - descriptionConcern(a) || a.comparison.figure.page - b.comparison.figure.page);
    if (!members.length) continue;
    result[type === 'missing' ? 'problems' : 'uncertainty'].push({ ...members[0], id: `review:figures:${type}`,
      ...(type === 'decorative' ? { decorativeFine: members[0].comparison?.decorativeFine || 0 } : {}),
      source: { path: 'review.figures' }, figureGroup: type, members, targets: [], evidence: [], comparison: null });
  }
  return result;
}
/** Small title differences become one tidy-up task; maps and charts marked as decoration become one task. */
export function groupConsistencyFindings(groups) {
  const all = [...groups.problems, ...groups.uncertainty];
  const sets = [
    ['review:consistency:minor-names', all.filter(item => item.comparison?.consistency?.left && item.severity === 'minor')],
    ['review:consistency:decorative', all.filter(item => item.comparison?.consistency?.kind === 'decorative').sort((a, b) => a.comparison.consistency.page - b.comparison.consistency.page)],
    ['review:consistency:contents', groups.problems.filter(item => /^contents-/.test(item.comparison?.consistency?.kind || ''))],
    ['review:consistency:contents-unresolved', groups.uncertainty.filter(item => /^contents-/.test(item.comparison?.consistency?.kind || ''))],
  ].filter(([, members]) => members.length > 1);
  const undecided = id => id.endsWith('-unresolved');
  // Keywords the rules already identified as internal codes need no separate AI card.
  const codes = new Set(all.flatMap(item => item.comparison?.consistency?.kind === 'keywords' ? item.comparison.consistency.terms : []));
  if (codes.size) {
    const code = item => item.source?.path?.startsWith('semantic.keywordItems[') && codes.has(item.comparison?.query);
    groups = { ...groups, problems: groups.problems.filter(item => !code(item)), uncertainty: groups.uncertainty.filter(item => !code(item)) };
  }
  // A saved-title/cover pair from the consistency rules replaces the older "couldn't confirm the title" comparison for the same pair.
  const coverPair = all.some(item => item.comparison?.consistency?.left?.role === 'saved' && item.comparison.consistency.right?.role === 'cover');
  if (coverPair) {
    const drop = item => item.source?.path === 'metadataConsistency' && item.outcome === 'uncertain';
    groups = { ...groups, problems: groups.problems.filter(item => !drop(item)), uncertainty: groups.uncertainty.filter(item => !drop(item)) };
  }
  // Maps and charts beside captions lead; the page-by-page decorative list becomes context in the same task.
  const decorative = all.filter(item => item.comparison?.consistency?.kind === 'decorative');
  const generic = decorative.length ? [...groups.problems, ...groups.uncertainty].find(item => item.figureGroup === 'decorative') : null;
  if (generic) {
    const keep = item => item !== generic;
    groups = { ...groups, problems: groups.problems.filter(keep), uncertainty: groups.uncertainty.filter(keep) };
    if (!sets.some(([id]) => id === 'review:consistency:decorative')) sets.push(['review:consistency:decorative', decorative]);
  }
  if (!sets.length) return groups;
  const ids = new Set(sets.flatMap(([, members]) => members.map(item => item.id)));
  const grouped = ([id, members]) => ({ ...members[0], id, consistencyGroup: id,
    source: { path: id.replace(':', '.') }, members, targets: [], evidence: [], comparison: null,
    ...(id === 'review:consistency:decorative' && generic ? { decorativeContext: generic.members.map(member => member.comparison.figure.page) } : {}) });
  return { ...groups, uncertainty: [...groups.uncertainty.filter(item => !ids.has(item.id)), ...sets.filter(([id]) => undecided(id)).map(grouped)],
    problems: [...groups.problems.filter(item => !ids.has(item.id)), ...sets.filter(([id]) => !undecided(id)).map(grouped)] };
}
/** Shared task grouping for individual review, batch summaries and captured hand-offs. */
export function reviewGroups(findings) {
  return groupConsistencyFindings(groupFigureFindings(groupHeadingFindings(findingGroups(findings))));
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
  if (finding.figureGroup === 'missing' || (finding.comparison?.figure?.tagged && (!finding.comparison.figure.alt || finding.comparison.description?.unusable))) return { rank: 0, key: 'critical', label: 'Critical', noticeVariant: 'negative' };
  if (finding.members?.length) return finding.members.map(reviewPriority).reduce((highest, item) => item.rank < highest.rank ? item : highest);
  if (finding.severity === 'minor') return { rank: 3, key: 'minor', label: 'Minor', noticeVariant: 'info' };
  // A fix for catalogues and AI tools rather than an accessibility-standard failure: after the structural fixes.
  if (finding.source?.path === 'machineMetadata' && finding.category === 'advisory-concern') return { rank: 0.5, key: 'important', label: 'Important', noticeVariant: 'warning' };
  // Concerns the AI decided rank after rule-based warnings.
  if (finding.category === 'advisory-concern' && ['embedding-screening', 'image-screening'].includes(finding.method) && finding.source?.path?.startsWith('consistency.'))
    return { rank: 1.5, key: 'ai-warning', label: 'Warning (AI)', noticeVariant: 'warning' };
  if (finding.source?.path === 'readingOrder' && finding.comparison?.readingSequenceMissing) return { rank: 0, key: 'critical', label: 'Critical', noticeVariant: 'negative' };
  if (finding.category === 'required-defect') return { rank: 0, key: 'critical', label: 'Critical', noticeVariant: 'negative' };
  if (finding.category === 'advisory-concern') return { rank: 1, key: 'warning', label: 'Warning', noticeVariant: 'warning' };
  return { rank: 2, key: 'manual', label: 'Needs manual check', noticeVariant: 'info' };
}

/**
 * Fix-list bucket. Follows recorded categories and review priority, never a confidence score:
 * fix = confirmed defects, check = suspected problems or human judgement, unknown = the tool could not decide.
 */
export function fixBucket(item) {
  // Opportunities are improvements, not problems: they never enter Fix or Check.
  if (item.category === 'opportunity') return 'travel';
  if (reviewPriority(item).key === 'critical') return 'fix';
  if (item.source?.path === 'machineMetadata' && item.category === 'advisory-concern') return 'fix';
  // Reading order always needs a person to confirm it, even when the tool found no problem.
  // A recovered order with no detected problem is a tip to listen for yourself, not a task.
  if (item.source?.path === 'readingOrder' && item.outcome !== 'requires-review' && !item.comparison?.readingSequenceMissing) return 'tip';
  if (item.figureGroup || item.source?.path === 'attachments' || item.source?.path === 'readingOrder') return 'check';
  // A saved title or author list beside page text the tool could not match is a comparison a person can make.
  if (identityPaths.test(item.source?.path || '') && item.comparison?.candidates?.length && item.outcome !== 'match') return 'check';
  if (item.members) return item.members.some(member => member.category === 'advisory-concern') ? 'check' : 'unknown';
  return item.category === 'advisory-concern' ? 'check' : 'unknown';
}
// Missing tags cause most other structural defects, so that fix comes first.
const rootCause = item => item.source?.checkId === 'structure' ? 0 : 1;
const identityPaths = /^(metadataConsistency|deterministicTitle|authorConsistency)$/;
const byPriority = (a, b) => reviewPriority(a).rank - reviewPriority(b).rank || rootCause(a) - rootCause(b);
/** Selectable review items by bucket, plus tool limits that only explain what was not checked. */
export function fixList(groups) {
  const lists = { fix: [], check: [], unknown: [], tip: [], limits: [...groups.limits, ...groups.coverage], travel: [...(groups.opportunities || [])] };
  for (const item of [...groups.problems, ...groups.uncertainty].sort(byPriority)) lists[fixBucket(item)].push(item);
  // Without any tags, untagged text and a missing reading order are consequences of the same fix.
  const noTags = lists.fix.find(item => item.source?.checkId === 'structure' && item.outcome === 'fail' && item.summary === 'No structure tree found.');
  if (noTags) {
    const consequence = item => (item.source?.checkId === 'coverage' && item.outcome === 'fail') || (item.source?.path === 'readingOrder' && item.comparison?.readingSequenceMissing);
    const related = lists.fix.filter(consequence);
    if (related.length) lists.fix = lists.fix.filter(item => !consequence(item)).map(item => item === noTags ? { ...item, related } : item);
  }
  return lists;
}
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** Plain-language orientation, without promoting incomplete or scope-limited checks to a pass. */
export function reviewSummary(report, groups) {
  const tasks = [...groups.problems, ...groups.uncertainty].sort(byPriority);
  const buckets = fixList(groups);
  const criticalCount = buckets.fix.length;
  const fix = buckets.fix.length, check = buckets.check.length;
  const headline = !report.analysisComplete ? 'The check could not finish'
    : fix ? `${plural(fix, 'thing')} to fix${check ? `, ${check} to check` : ''}`
      : check ? `Nothing confirmed to fix, ${plural(check, 'thing')} to check`
        : report.checks?.some(check => check.status === 'fail') ? 'This PDF needs work'
          : 'No problems auto-detected';
  // One plain sentence on where to start, so the count is not read as a severity score.
  const first = buckets.fix[0] || buckets.check[0];
  const firstCard = first ? fixCard(first, report) : null;
  const also = firstCard?.also?.length || 0;
  const nextStep = firstCard?.title
    ? `Start with: ${firstCard.title.replace(/\s*\(\d+[^)]*\)$/, '')}.${also ? ` Doing this should also fix ${plural(also, 'other item')}.` : ''}`
    : tasks.length ? ''
    : 'Download a report to keep the results, including successful checks.';
  const unresolved = (report.checks || []).filter(check => !["pass", "not-applicable"].includes(check.status));
  const graphicsOnly = unresolved.length === 1 && unresolved[0].id === "supported-content"
    && unresolved[0].evidence?.length > 0
    && unresolved[0].evidence.every(value => /non-artifact graphic painting operations/.test(value));
  const scope = report.accepted
    ? 'The PDF met this tool’s text and structure requirements. This is not an accessibility certificate.'
    : report.checks?.some(check => check.status === 'fail')
      ? ''
      : graphicsOnly ? 'This tool cannot judge image or chart meaning, so check those yourself.'
        : 'This is a partial result: some checks could not give an answer, so the PDF has not met all of this tool’s requirements.';
  const counts = Object.fromEntries(Object.entries(buckets).map(([key, items]) => [key, items.length]));
  // Standing tool limits are listed under Couldn’t check but never counted: the count is undecided items only.
  counts.couldntCheck = counts.unknown;
  return { headline, nextStep, scope, tasks, buckets, criticalCount, counts };
}

const documentPaths = /^(metadataConsistency|deterministicTitle|authorConsistency|machineMetadata|semantic\.(subject|keywords|keywordItems|title|titleAI)|checks\.(title|language)|consistency\.(placeholder|language))/;
/** Where the person should look: pages, document properties, or the whole document. */
export function fixLocation(item) {
  const members = item.members || [item];
  const pages = [...new Set(members.flatMap(member => [member.comparison?.figure?.page, ...(member.targets || []).map(target => target.page)]).filter(Number.isInteger))].sort((a, b) => a - b);
  if (documentPaths.test(item.source?.path || '')) return 'Document properties';
  if (pages.length) return pages.length === 1 ? `Page ${pages[0]}` : `Pages ${pages.slice(0, 5).join(', ')}${pages.length > 5 ? ` and ${pages.length - 5} more` : ''}`;
  if (['structure', 'content-integrity', 'text'].includes(item.source?.checkId) || ['readingOrder', 'outline', 'links'].includes(item.source?.path)) return 'Whole document';
  return '';
}
const quote = value => { const text = String(value || '').trim(); return text.length > 120 ? `${text.slice(0, 119)}…` : text; };
/** A short, concrete card: title, summary and the single change to make. The full guidance stays in reviewTask. */
export function fixCard(item, report = {}) {
  const task = reviewTask(item);
  const card = { title: task.title, summary: task.summary || item.summary, change: task.action, where: fixLocation(item) };
  const path = item.source?.path || '';
  if (item.comparison?.consistency?.left || item.consistencyGroup === 'review:consistency:minor-names') {
    const members = item.members || [item];
    const pages = [...new Set(members.flatMap(member => member.comparison?.consistency?.right?.pages || []))].sort((a, b) => a - b);
    const cover = members.some(member => [member.comparison?.consistency?.left?.role, member.comparison?.consistency?.right?.role].includes('cover'));
    return { ...card, where: [cover && 'Page 1', pages.length && 'Page headers and footers', members.some(member => member.comparison?.consistency?.left?.role === 'saved') && 'Document properties'].filter(Boolean).join(' · ') };
  }
  if ((path === 'metadataConsistency' || path === 'deterministicTitle') && item.outcome === 'suspected-mismatch') {
    const saved = report.metadata?.infoTitle || report.metadata?.xmpTitles?.[0]?.text;
    const page = report.metadataConsistency?.publicationCandidates?.[0]?.text;
    return { ...card, title: 'Saved title doesn’t match the cover',
      summary: saved && page ? `The title saved in the PDF is “${quote(saved)}”, but the first page shows “${quote(page)}”.` : card.summary,
      change: 'In the source document’s properties, set the Title to the full publication title, including year and edition. Then export again.' };
  }
  if (identityPaths.test(path) && item.outcome !== 'suspected-mismatch' && item.outcome !== 'match' && item.comparison?.candidates?.length) {
    const authors = path === 'authorConsistency';
    const saved = authors ? report.metadata?.author || report.metadata?.xmpAuthors?.join('; ') : report.metadata?.infoTitle || report.metadata?.xmpTitles?.[0]?.text;
    const page = item.comparison.candidates[0]?.text;
    return { ...card, title: authors ? 'Check the saved authors match the page' : 'Check the saved title matches the cover',
      summary: `${saved ? `The ${authors ? 'authors' : 'title'} saved in the PDF ${authors ? 'are' : 'is'} “${quote(saved)}”.` : `No ${authors ? 'authors are' : 'title is'} saved in the PDF.`} The first page shows “${quote(page)}”. The tool couldn’t confirm whether they match.`,
      change: authors ? 'If they differ, set the Author field in the source document’s properties to the publication’s authors. Then export again.' : 'If they differ, set the Title in the source document’s properties to the full publication title. Then export again.' };
  }
  if (path === 'hiddenInstructions' && item.outcome === 'requires-review') {
    const matches = item.comparison?.matches || [];
    const pages = [...new Set(matches.map(match => match.page).filter(Number.isInteger))].sort((a, b) => a - b);
    return { ...card, title: `Hidden text that gives instructions to AI (${matches.length})`,
      where: pages.length ? `${pages.length === 1 ? 'Page' : 'Pages'} ${pages.join(', ')}${matches.some(match => !match.page) ? ' and document details' : ''}` : 'Document details',
      summary: `This PDF contains text that people can’t see on the page but AI tools may extract, and it reads like instructions to an AI: “${quote(matches[0]?.text)}”`,
      change: 'Ask whoever made the PDF why this text is there. If it isn’t meant to be in the document, delete it from the source, then export again.' };
  }
  if (path === 'attachments') {
    const count = item.comparison?.inventory?.files?.length || 0;
    return { ...card, title: `Confirm the attached files (${count})`, where: 'Whole document',
      summary: `${count} file${count === 1 ? ' is' : 's are'} attached to this PDF. This tool didn’t open ${count === 1 ? 'it' : 'them'}.`,
      change: 'Confirm with the designer that each file should be included, and that each has a description saying what it is for.' };
  }
  if (path.startsWith('semantic.') && fixBucket(item) === 'unknown' && !item.members) {
    const label = path.startsWith('semantic.keyword') ? `the keyword “${quote(item.comparison?.query || item.title.replace(/^Keyword: /, ''))}”` : path === 'semantic.subject' ? 'the saved description' : path.startsWith('semantic.section') ? 'a heading' : 'the saved title';
    return { ...card, title: `The AI couldn’t judge ${label}`, change: '' };
  }
  if (path === 'authorConsistency' && item.outcome === 'suspected-mismatch') {
    const saved = report.metadata?.author || report.metadata?.xmpAuthors?.join('; ');
    const page = report.authorConsistency?.evidence?.[0]?.text;
    return { ...card, title: 'Saved authors don’t match the page',
      summary: saved && page ? `The authors saved in the PDF are “${quote(saved)}”, but the page lists “${quote(page)}”.` : card.summary,
      change: 'In the source document’s properties, set the Author field to the publication’s authors. Then export again.' };
  }
  const failed = item.outcome === 'fail';
  const check = item.source?.checkId;
  if (failed && check === 'coverage' && item.summary !== 'No relevant text to account for.') return { ...card, title: 'Some text is hidden from screen readers',
    summary: 'Some text on the page is not in the PDF’s tags, so screen readers and AI tools may skip it or read it in the wrong place.',
    change: 'Add the highlighted text to the tags as a heading, paragraph or other part of the document. If it is decorative, such as a page number, running header or background text, mark it as decoration (an artifact) instead. Then export again.' };
  if (failed && check === 'language') return { ...card, title: 'Set the document language',
    change: 'Set the document language, such as English, in the source document’s settings or a PDF editor. Then export again.' };
  if (failed && check === 'title') return { ...card, title: 'Add a document title' };
  if (failed && check === 'text') return { ...card, title: item.summary === 'No non-artifact text could be extracted.' ? 'Add real text to the pages' : 'Fix text that doesn’t copy out correctly',
    summary: item.summary === 'No non-artifact text could be extracted.' ? 'The pages have no text that software can read, apart from anything marked as decoration. They may be scanned images of text. Screen readers, search and AI tools get nothing from them.'
      : 'Some characters come out missing or wrong when the text is copied, even though the page looks right. Screen readers, search and AI tools read those wrong characters.' };
  if (failed && check === 'structure' && item.summary !== 'No structure tree found.') {
    const pages = [...new Set((item.evidence || []).map(text => /^Page (\d+):|^Content reference (\d+):/.exec(String(text))).filter(Boolean).map(match => Number(match[1] || match[2])))].sort((a, b) => a - b);
    return { ...card, title: 'Re-export the PDF so its tags are complete',
      where: pages.length ? `${pages.length === 1 ? 'Page' : 'Pages'} ${pages.slice(0, 5).join(', ')}${pages.length > 5 ? ` and ${pages.length - 5} more` : ''}` : 'Whole document',
      summary: 'The PDF has tags (the hidden labels screen readers and AI tools use), but some are broken: they point to content that isn’t there, or content isn’t linked to a tag. This usually happens when a PDF is edited after it was exported.',
      change: 'Export a fresh tagged PDF from the source document, for example in Word with “Document structure tags for accessibility” ticked, or in InDesign with “Create Tagged PDF”. Redo any edits made to the PDF in the source instead.' };
  }
  if (failed && check === 'structure' && item.summary === 'No structure tree found.') return { ...card, title: 'Export as a tagged (accessible) PDF', where: 'Whole document',
    summary: 'The PDF has no tags: the hidden labels that tell screen readers and AI tools which text is a heading, paragraph, list or table. A visible table of contents doesn’t add them.',
    also: item.related?.map(related => related.source?.checkId === 'coverage' ? 'Text that screen readers can’t reach' : 'The missing reading order'),
    change: 'In the source document, use heading, list and table styles, then export with PDF tags turned on (often called an accessible or tagged PDF).' };
  if (path === 'textVisibility' && fixBucket(item) === 'unknown') return { ...card, title: 'The tool couldn’t tell whether hidden text matches the page' };
  // Undecided results are never tasks: say what the tool couldn’t decide instead of telling the person to check it.
  if (fixBucket(item) === 'unknown' && /^Check (that |whether )?/.test(card.title) && !item.members)
    return { ...card, title: card.title.replace(/^Check (that |whether )?/, (match, word) => `The tool couldn’t check ${word ? 'whether ' : ''}`) };
  if (path === 'readingOrder' && item.comparison?.readingSequenceMissing) return { ...card, where: 'Whole document' };
  if (path === 'readingOrder' && item.outcome !== 'requires-review') return { ...card, title: 'Check the reading order',
    summary: 'The tool found no ordering problem, but it cannot confirm the order is right. Check that screen readers will read the page in the order you intend.',
    change: 'Open the reading order on the page and follow the numbers. If they jump around, ask the designer to fix the reading order. Then export again.' };
  const drawingOnly = report.readingOrder?.findings?.length && report.readingOrder.findings.every(finding => finding.detector === 'numbered-step-drawing-order');
  if (path === 'readingOrder' && item.outcome === 'requires-review' && drawingOnly) return { ...card, title: 'Text is drawn out of order',
    summary: 'The numbered steps are in sequence in the tags, but the text is drawn in a different order. Tools that extract text in drawing order may scramble the steps. Review both sequences; this does not confirm the whole reading order.',
    change: 'Ask the designer to re-export from the source document with each column or section in one text frame, or fix the content order in a PDF editor (Acrobat: Content or Reading Order panel). Then export again.' };
  if (path === 'readingOrder' && item.outcome === 'requires-review') return { ...card, title: 'Text may be read in the wrong order',
    summary: 'Screen readers and AI tools may read this content in a different order from the page layout.',
    change: 'Ask the designer to fix the reading order: in the source document, or in Acrobat’s Reading Order or Tags panel. Then export again.' };
  if (item.consistencyGroup === 'review:consistency:decorative') {
    const pages = item.members.map(member => member.comparison.consistency.page);
    return { ...card, where: pages.length === 1 ? `Page ${pages[0]}` : `Pages ${pageList(pages)}` };
  }
  if (item.members && !item.figureGroup && !item.consistencyGroup && fixBucket(item) === 'unknown') return { ...card, title: `Headings the AI could not judge (${item.members.length})`,
    summary: 'The AI could not tell whether these headings describe the text below them. This is not a problem found in your PDF.', change: '' };
  if (item.members && !item.figureGroup && !item.consistencyGroup) return { ...card, title: `Headings that may not match their sections (${item.members.length})`,
    summary: 'The AI found little connection between these headings and the text below them. Read each one and decide.',
    change: 'If a heading doesn’t describe its section, reword it in the source document. If the wrong text follows it, ask the designer to fix the reading order. Then export again.' };
  return card;
}

export function reviewTask(finding) {
  const consistency = consistencyTask(finding);
  if (consistency) return consistency;
  if (finding.figureGroup) {
    const count = finding.members.length;
    const placeholders = finding.members.filter(member => member.comparison?.description?.unusable).length;
    const flagged = finding.members.filter(member => descriptionConcern(member) > 0).length;
    const descriptions = {
      missing: ['Add descriptions for images', `${count} image${count === 1 ? '' : 's'} labelled as meaningful ${count === 1 ? 'has' : 'have'} no useful text description${placeholders ? ` (${placeholders} only ${placeholders === 1 ? 'has' : 'have'} a placeholder such as “${quote(finding.members.find(member => member.comparison.description?.unusable).comparison.figure.alt.split('\n')[0])}”)` : ''}. People and tools that cannot see them may miss important information.`, 'Add useful alt text or equivalent nearby text. Mark an image as decorative only if it conveys no essential information.'],
      described: ['Review image descriptions', `${count} image${count === 1 ? '' : 's'} ${count === 1 ? 'has a saved description' : 'have saved descriptions'}.${flagged ? ` Start with the first ${flagged}: ${flagged === 1 ? 'its description is' : 'their descriptions are'} shared with other images or ${flagged === 1 ? 'doesn’t' : 'don’t'} seem to match ${flagged === 1 ? 'its' : 'their'} picture or caption.` : ''} Review whether each description explains the important information; presence alone does not establish accuracy.`, 'Compare each image with its saved description. For charts, include key values and relationships or a data table.'],
      unlabelled: ['Decide whether unlabelled graphics are content or decoration', `Graphics on ${count} page${count === 1 ? '' : 's'} could not be linked to an image label. Check their intended role.`, 'Label meaningful graphics and add useful descriptions. Mark backgrounds, borders and purely decorative shapes as artifacts.'],
      decorative: ['Decide whether these decorative graphics carry information', `On ${count} page${count === 1 ? '' : 's'}, graphics are marked as decoration and the tool can’t tell from their shape and surroundings whether they carry information.${finding.decorativeFine ? ` It judged ${finding.decorativeFine} other decorative graphic${finding.decorativeFine === 1 ? '' : 's'} to be lines, panels, logos or backgrounds, which are fine as decoration.` : ''}`, 'Look at each one. Keep purely decorative graphics marked as artifacts. If a graphic conveys information, give it an image label and a useful description.'],
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
    'Compare the saved title with the full title on the cover or title page, including the year and edition. Correct the document properties if needed, export again and recheck.',
    'A saved title with the wrong year can lead search or other tools to present the wrong edition. A shortened title or a title page later in the PDF may need your judgement.');
  if (path === 'authorConsistency') return task('Check the author names',
    finding.outcome === 'match' ? 'The saved author names agree with a likely author line on the first page. This does not verify authorship.'
      : finding.outcome === 'suspected-mismatch' ? 'Saved author names differ from a likely author line, or the PDF has conflicting saved author lists.' : 'The tool could not confirm whether the saved author names agree with the names on the page.',
    'Compare the saved names with the publication’s authors. Check initials and distinguish authors from editors and publishers. Correct the saved author information if needed, export again and recheck.',
    'Saved author information helps tools attribute the document. Differences in spelling or initials can need human judgement.');
  if (path === 'readingOrder' && finding.comparison?.readingSequenceMissing) return task('Add a machine-readable reading order',
    'No machine-readable reading sequence was recovered. Screen readers and other tools may not know which text to read first.',
    'In the original document, use heading styles and export with PDF tags enabled. For an existing PDF, use a PDF accessibility editor to add or repair its reading order. Export an updated PDF and recheck it.',
    'A page can look well organised while the reading sequence used by screen readers and other software is missing.');
  if (path === 'readingOrder') return task('Check the reading order',
    finding.outcome === 'requires-review' ? 'The tool found numbering or heading positions that may indicate text is read out of order. A deliberate numbering restart or layout choice could also explain this.' : 'The tool has not established the reading order of the whole document. No warning from this check would prove that the order is correct.',
    'Compare the extracted sequence with how the PDF should be read, especially across columns and numbered steps. If no sequence is available, check or add structure labels with a PDF accessibility editor. Correct the order there or in the source document, then export again and recheck.',
    'Screen readers and other tools can follow a different order from the one suggested by the page layout. Connected structure labels alone do not guarantee a sensible sequence.');
  if (path === 'hiddenInstructions') return task('Remove hidden instructions for AI tools',
    finding.summary,
    'Ask whoever produced the PDF why this text is there. If it is not meant to be in the document, delete it from the source document, including document properties and image descriptions, then export again and recheck.',
    'AI tools read text that people cannot see. Hidden instructions can steer AI summaries, reviews, search results or decisions about the document. This basic check matches common instruction patterns and can miss reworded or encoded text.');
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
  const travel = travelTask(finding);
  if (travel) return travel;
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

const listed = values => values.length <= 2 ? values.join(' and ') : `${values.slice(0, -1).join(', ')} and ${values.at(-1)}`;
const PUBLICATION_DETAILS = { publisher: 'who published it', rights: 'how it may be reused (its licence)', date: 'when it was published', identifier: 'an identifier such as a DOI or ISBN' };
/** Plain copy for links, bookmarks, publication details and figure data. Success and unassessed results keep the default. */
function travelTask(finding) {
  const path = finding.source?.path, c = finding.comparison || {};
  const task = (title, summary, detailAction, why) => ({ title, summary, action: detailAction.split(/(?<=\.) /)[0], detailAction, why });
  if (path === 'crossReferences' && finding.category === 'advisory-concern') {
    const refs = c.references || [], first = refs[0];
    const pages = [...new Set(refs.map(ref => ref.page))];
    return task(refs.length === 1 ? `“${quote(first.text)}” isn’t a link` : `${refs.length} cross-references aren’t links`,
      refs.length === 1 ? `The text on page ${first.page} mentions “${quote(first.text)}”, but there’s no link to it. Readers cannot follow a link to it, and tools may miss the connection to the evidence it names.`
        : `The text mentions ${listed(refs.slice(0, 3).map(ref => `“${quote(ref.text)}”`))}${refs.length > 3 ? ` and ${refs.length - 3} more` : ''} on page${pages.length === 1 ? '' : 's'} ${pages.slice(0, 5).join(', ')}, without links. Readers cannot follow links to them, and tools may miss the connections to the evidence they name.`,
      'In the source document, turn each mention into a link to the figure, table, map or section it names, for example with Word’s Cross-reference or InDesign’s Hyperlinks panel, then export again. If a mention refers to another publication, a link to that publication helps too.',
      'Links let people jump straight to what a sentence refers to, and let tools connect a mention with the content it names. This check looks for words such as “Figure 1”, “Map 2” or “see page 4”. It can’t tell whether a mention refers to this PDF or another publication.');
  }
  if (path === 'detachedValues') {
    const values = c.values || [], first = values[0];
    return task(values.length === 1 ? `“${quote(first.value)}” is drawn apart from its label` : `${values.length} numbers are drawn apart from their labels`,
      `The tags keep ${values.length === 1 ? `“${quote(first.value)}” next to “${quote(first.label)}”` : 'these numbers next to their labels'}, so screen readers read them together. But the PDF draws them separately, so AI and text-extraction tools that follow the drawing order may get the number without what it measures.`,
      'Ask the designer to keep each number and its label in one text frame, or fix the content order in a PDF editor (Acrobat: Content or Reading Order panel), then export again.',
      'Many tools read a PDF in the order its text is drawn, not the order of its tags. A headline number separated from its label loses its meaning. This check looks only at short values next to a tagged sentence.');
  }
  if (path === 'outline' && finding.category === 'opportunity') return task('Add bookmarks for the headings',
    c.headings >= 2 ? `This PDF has ${c.headings} headings but no bookmarks. Bookmarks give readers a clickable outline to jump between sections.`
      : `This ${c.pages}-page PDF has no bookmarks. Bookmarks give readers a clickable outline to jump between sections.`,
    'When saving as PDF from Word, tick “Create bookmarks using: Headings”. In InDesign, tick “Bookmarks” in the PDF export settings. Then export again.',
    'Bookmarks help people navigate a long report. They are an opportunity for easier reuse, not proof that an AI tool will understand its structure.');
  if (path === 'links' && finding.category === 'opportunity') {
    const count = c.count || 0;
    return task('Tag your links so screen readers announce them',
      `This PDF has ${count} link${count === 1 ? '' : 's'}, but ${c.linksTagged === 'some' ? 'not all of them are' : count === 1 ? 'it isn’t' : 'they aren’t'} in the PDF’s tags. People using screen readers may hear the words without knowing they can follow them, and some tools may miss where they lead.`,
      'Export again from the source document with tags turned on; Word and InDesign tag links automatically when they are real hyperlinks. In an existing PDF, use the Tags panel in Acrobat to add a Link tag for each link.',
      'A link only helps people who know it is there. Tagging it lets screen readers announce it and lets tools connect the words to their destination. This tool doesn’t check where links lead.');
  }
  if (path === 'machineMetadata' && finding.category === 'advisory-concern') {
    const missing = (c.missingPublication || []).map(field => PUBLICATION_DETAILS[field]).filter(Boolean);
    return task('Add publishing details',
      `The PDF’s saved properties don’t say ${listed(missing)}. Catalogues, search engines and AI tools read these to tell who issued the report and which edition it is; without them they have to guess from the pages, and may cite an old edition as current.`,
      'In the source document’s properties or your publishing system, set the publisher and the publication date (and, if you have them, the licence and an identifier such as a DOI). Then export again.',
      'PDF/UA does not require these details, but metadata systems and AI tools depend on them to identify, date and cite a report. This tool checks that they are saved, not that they are correct.');
  }
  if (path === 'machineMetadata' && finding.category === 'opportunity') {
    const missing = (c.missingPublication || []).map(field => PUBLICATION_DETAILS[field]).filter(Boolean);
    return task(missing.length ? 'Add publishing details' : 'Attach a description for reuse',
      missing.length ? `The PDF’s saved properties don’t say ${listed(missing)}${c.structuredData ? '' : ', and no description for reuse is attached'}. These details can help people and tools identify, cite and reuse the report.`
        : 'The publishing details are saved, but no description in a standard format, such as schema.org JSON-LD, is attached. A publishing system that supports it can reuse that information.',
      'Add the publisher, licence, publication date and identifier in the source document’s properties or your publishing system, then export again. Your web or publishing team can also attach a schema.org description (a JSON-LD file).',
      'Clear publishing details help distinguish reports and editions. An attached description does not guarantee search visibility or correct AI use. This tool checks for declarations, not whether their contents are correct.');
  }
  if (path === 'figureData' && finding.category === 'opportunity') {
    const pages = [...new Set(c.figures || [])], count = (c.figures || []).length;
    return task(`Share the data behind charts (${count})`,
      `${count === 1 ? `The image labelled as a figure on page ${pages[0]} has` : `${count} images labelled as figures, on page${pages.length === 1 ? '' : 's'} ${pages.join(', ')}, have`} no data table nearby and no data file attached. If ${count === 1 ? 'it is a chart' : 'they are charts'}, a table or data file makes exact values easier for people and research tools to reuse.`,
      'For charts, add the values as a table near the chart, or attach the data as a CSV file when you export. Photos and illustrations don’t need this.',
      'A description explains the chart’s main finding; a data table or file lets people and software inspect and reuse its values. This check doesn’t confirm that a nearby table holds the chart’s values.');
  }
  return null;
}

/** A drawing-operation count does not establish the number of distinct images. */
export function reviewLimitEvidence(value) {
  return /non-artifact graphic painting operations/.test(value)
    ? 'This PDF contains graphic content. Check that meaningful images and charts have a useful text description or nearby text that conveys the same information.'
    : value;
}


/** Always true of this tool, whatever the PDF: listed with the other limits. */
export const STANDING_LIMITS = ["Writing: the tool compares titles, dates, figures and the contents list, but doesn’t judge whether the text is accurate, clear or well argued."];

export function reviewLimitText(item) {
  if (item.source?.checkId === "supported-content") return "Images and charts: the tool checks that they are labelled and described, and spots ones hidden as decoration, but it doesn’t judge whether a description is accurate or what a chart shows.";
  if (item.source?.path === "semantic") return item.outcome === "error" ? "AI text comparisons: the AI check did not finish." : "AI text comparisons: not run for this PDF.";
  const skipped = /^semantic:(keywords|sections):unassessed$/.exec(item.id);
  if (skipped) return `${String(item.summary || "").match(/\d+/)?.[0] || "Some"} ${skipped[1] === "keywords" ? "keywords" : "headings"} were not compared by the AI. It only compares a limited number in each PDF.`;
  return `${item.title}: ${item.summary || "not checked"}`;
}

/** A grouped consistency member in a few plain words (detail lists and the PDF hand-off). */
export function consistencyMemberText(item) {
  if (item.kind === 'decorative') return `Page ${item.page}: ${item.captions[0]?.text || item.source?.text || 'graphic marked as decoration'}`;
  if (item.kind === 'contents-conflict') return `“${quote(item.entry.text)}”: page ${item.entry.printed} in one contents list, page ${item.other.printed} in another`;
  if (item.kind === 'contents-page') return `“${quote(item.entry.text)}”: listed as page ${item.entry.printed}${item.foundPage ? `, heading found on PDF page ${item.foundPage}` : ''}`;
  if (item.kind === 'contents-wording') return `“${quote(item.entry.text)}”: no matching heading on PDF page ${item.expected}`;
  return item.label || item.kind;
}
const contentsWhy = 'People use the contents to find sections, and so do AI tools that read the document. An out-of-date contents list sends them to the wrong place.';
function contentsLine(item, finding) {
  const entry = `“${quote(item.entry.text)}”`;
  if (item.kind === 'contents-conflict') return `The contents on page ${item.entry.contentsPage} give ${entry} as page ${item.entry.printed}, but the contents on page ${item.other.contentsPage} say page ${item.other.printed}.`;
  if (item.kind === 'contents-page') return item.foundPage ? `The contents list ${entry} on page ${item.entry.printed}, but that heading is on PDF page ${item.foundPage}, not ${item.expected}.` : `The contents list ${entry} on page ${item.entry.printed}, which is past the end of the document.`;
  const ai = finding?.comparison?.ai;
  return ai?.status === 'semantically-related' ? `The contents list ${entry}, but the heading on PDF page ${item.expected} is worded differently: “${quote(ai.evidence?.[0]?.text)}”.`
    : ai?.status === 'suspected-mismatch' ? `The contents list ${entry} on PDF page ${item.expected}, but no heading there seems related (checked by AI).`
      : `The contents list ${entry} on PDF page ${item.expected}; the tool could not find that heading there.`;
}
const KIND_WORDS = { punctuation: 'punctuation differs', order: 'words are in a different order', spelling: 'spelling differs', shortened: 'one leaves words out',
  reworded: 'worded differently', year: 'the year differs', substitution: 'one word is different', different: 'the wording is different' };
const ROLES = { saved: 'saved title', cover: 'cover', running: 'page header' };
const languageName = tag => { try { return new Intl.DisplayNames(['en'], { type: 'language' }).of(tag) || tag; } catch { return tag; } };
const pageList = pages => pages.length <= 6 ? listed(pages.map(String)) : `${pages.slice(0, 5).join(', ')} and ${pages.length - 5} more`;
/** One consistency pair as a line of plain text, for lists and the PDF hand-off. */
export function consistencyLine(finding) {
  const item = finding.comparison?.consistency;
  if (!item?.left) return finding.title;
  const kind = finding.comparison?.ai ? (finding.severity === 'minor' ? 'worded differently (the AI found them closely related)' : 'worded differently') : KIND_WORDS[item.kind] || item.kind;
  return `${ROLES[item.left.role]} “${quote(item.left.text)}” · ${ROLES[item.right.role]} “${quote(item.right.text)}”: ${kind}`;
}
/** Plain-language task for a consistency advisory: what disagrees, and the single change to make. */
function consistencyTask(finding) {
  const path = finding.source?.path || '';
  if (!path.startsWith('consistency.') && !path.startsWith('review.consistency')) return null;
  const task = (title, summary, detailAction, why) => ({ title, summary, action: detailAction.split(/(?<=\.) /)[0], detailAction, why });
  const sameTitle = 'People, catalogues and AI tools use the title to identify and cite a report. When it is written differently in different places, they cannot tell which version is right.';
  if (finding.consistencyGroup === 'review:consistency:minor-names') return task(`Tidy small differences in the title (${finding.members.length})`,
    'The title is written in slightly different ways. These are small differences, not errors, but the title should read the same everywhere.',
    'Pick one form of the title. Use it for the saved title in the document properties, on the cover and in page headers and footers, then export again.', sameTitle);
  if (finding.consistencyGroup === 'review:consistency:decorative') {
    const pages = finding.members.map(member => member.comparison.consistency.page);
    const others = (finding.decorativeContext || []).filter(page => !pages.includes(page)).length;
    return task(`Maps or charts marked as decoration (${pages.length} ${pages.length === 1 ? 'page' : 'pages'})`,
      `On ${pages.length === 1 ? 'page' : 'pages'} ${pageList(pages)}, a large graphic next to a caption or source line is marked as decoration. Screen readers and AI tools skip decoration, so the information in these maps or charts is lost to them.${others ? ` Graphics on ${plural(others, 'other page')} are also marked as decoration; most are probably backgrounds and borders, so start with the pages listed here.` : ''}`,
      'Give each map or chart an image label (a Figure tag) with a short description of what it shows, or state its key finding in nearby text. Keep only purely decorative graphics marked as decoration. Export again and recheck.',
      'Marking a graphic as decoration tells assistive technology and AI tools to ignore it. That is right for backgrounds and borders, but not for a map or chart that carries information.');
  }
  if (finding.consistencyGroup === 'review:consistency:contents') {
    const lines = finding.members.slice(0, 2).map(member => contentsLine(member.comparison.consistency, member)).join(' ');
    return task(`Contents don’t match the pages (${finding.members.length})`, `${lines}${finding.members.length > 2 ? ` ${finding.members.length - 2} more entries are listed below.` : ''}`,
      'Update the table of contents in the source document so its entries and page numbers match the headings (in Word: right-click the table, Update Field, Update entire table). Then export again.', contentsWhy);
  }
  if (finding.consistencyGroup === 'review:consistency:contents-unresolved') return task(`Contents entries the tool couldn’t match (${finding.members.length})`,
    'The tool could not find these contents entries as headings on the pages they point to, and could not tell whether the headings are just worded differently.',
    'Compare each entry with the heading on its page.', contentsWhy);
  const item = finding.comparison?.consistency;
  if (!item) return null;
  if (/^contents-/.test(item.kind)) return task(finding.category === 'uncertain' ? 'A contents entry the tool couldn’t match' : 'The contents don’t match the page',
    contentsLine(item, finding), 'Update the table of contents in the source document so it matches the headings, then export again.', contentsWhy);
  if (item.kind === 'same-fact') {
    const [value] = item.values, unit = value.unit === '%' ? '%' : ` ${value.unit}`;
    return task(`The same figure is given differently: ${value.a}${unit} and ${value.b}${unit}`,
      `Page ${item.a.page} says “${quote(item.a.text)}” and page ${item.b.page} says “${quote(item.b.text)}”. ${item.method === 'identical-wording' ? 'The sentences are worded the same apart from the number' : 'The AI found these sentences describe the same thing'}, but they give different numbers.`,
      'Check which figure is right in the source data. Make both places use it, or say clearly why they differ (for example, a different year or scope). Then export again.',
      `Readers and AI tools may quote either number. ${item.method === 'identical-wording' ? '' : 'The AI compares meaning and can be wrong: the sentences may describe different things, so check before changing anything.'}`.trim());
  }
  if (item.left) {
    const left = `the ${ROLES[item.left.role]} “${quote(item.left.text)}”`, right = `the ${ROLES[item.right.role]} “${quote(item.right.text)}”`;
    const ai = finding.comparison?.ai;
    if (finding.category === 'uncertain') return task('Check whether these titles name the same document',
      `Compare ${left} with ${right}. The tool could not tell whether they name the same document.`,
      'If they name the same document, use one form of the title everywhere. If one belongs to another document, correct it in the source, then export again.', sameTitle);
    if (item.kind === 'year') return task('The year in the title doesn’t match',
      `${left[0].toUpperCase()}${left.slice(1)}, but ${right}. One of them may be out of date.`,
      'Decide which year is correct. Update the saved title in the document properties and the cover, headers or footers in the source, then export again.', sameTitle);
    if (item.kind === 'substitution') return task('The title changes one word',
      `${left[0].toUpperCase()}${left.slice(1)}, but ${right}. When only one word changes, part of the document may have been copied from another report.`,
      'Check which wording is correct. Update the other one in the source document, then export again.', sameTitle);
    if (ai && finding.severity === 'concern') return task('This may name a different document',
      `${left[0].toUpperCase()}${left.slice(1)}, but ${right}. The AI found little connection between them, so one may have been left over from another document.`,
      'Check which title is correct. Update the other one in the source document, then export again.', `${sameTitle} The AI compares meaning; it can be wrong, so check before changing anything.`);
    return task('Tidy a small difference in the title', `${left[0].toUpperCase()}${left.slice(1)}, and ${right}: ${ai ? 'they are worded differently' : KIND_WORDS[item.kind]}.`,
      'Pick one form of the title and use it everywhere, then export again.', sameTitle);
  }
  const value = item.value ? `“${quote(item.value)}”` : '';
  switch (item.kind) {
    case 'heading-split': {
      const first = item.pairs[0];
      return task(`Headings split across two tags (${item.total})`,
        `${item.total === 1 ? 'A heading is' : `${item.total} headings are`} tagged as two separate headings, for example “${quote(first.a)}” and “${quote(first.b)}” on page ${first.page}. Read straight through, they sound fine, but in a list of headings each shows as two half-titles.`,
        'In the source document, put each heading in a single heading paragraph (use a line break, not a new paragraph, to wrap it). Then export again.',
        'A small tidy-up. Screen reader users who jump between headings, generated outlines and bookmarks, and AI tools that split a document at its headings all see two half-titles instead of one.');
    }
    case 'same-image': return task('The same picture has different descriptions',
      `The picture on page ${item.a.page} and the one on page ${item.b.page} look the same, but one is described as “${quote(item.a.alt)}” and the other as “${quote(item.b.alt)}”.`,
      'If it is the same picture, give it the same description in both places (or describe what differs). Then export again.',
      'People who can’t see the picture rely on its description. Two descriptions for one picture suggest at least one is out of date or wrong.');
    case 'heading-label': return task(`Chart or diagram labels tagged as headings (${item.total})`,
      `On ${item.pages.length === 1 ? 'page' : 'pages'} ${pageList(item.pages.map(page => page.page))}, small labels such as ${listed(item.pages[0].texts.slice(0, 3).map(text => `“${quote(text)}”`))} are tagged as headings.`,
      'Tag these labels as part of their chart or diagram (or as normal text), not as headings. Then export again.',
      'The heading list is how many people find their way around a document. Labels from charts crowd it with entries that lead nowhere.');
    case 'draft': return task(`Still marked “${item.label}”`,
      `${item.pages[0] === 1 ? 'The first page says' : `Page headers on ${pageList(item.pages)} say`} “${quote(item.text || item.label)}”. If this is the published version, the label is out of date.`,
      'Remove the draft label from the cover, headers and footers in the source document, then export again.',
      'A draft label tells readers, catalogues and AI tools that the content may not be final or may change.');
    case 'leftovers': return task('Leftover placeholder text',
      `Found ${listed([...new Set(item.evidence.map(entry => entry.label))])} on page ${pageList([...new Set(item.evidence.map(entry => entry.page))])}: “${quote(item.evidence[0].text)}”.`,
      'Replace or remove the placeholder in the source document. For broken cross-references, update the fields (in Word: select all, then F9) before exporting again.',
      'Placeholder text reads as part of the report to people, screen readers and AI tools.');
    case 'stale': return task('Figures older than the date on the first page',
      `The first page gives figures “${item.promised}”, but a sentence on page ${item.evidence[0].page} uses an earlier date: “${quote(item.evidence[0].text.replace(/[.\s]+$/, ''))}”.${item.evidence.length > 1 ? ` ${item.evidence.length - 1} more statement${item.evidence.length === 2 ? '' : 's'} use an earlier date.` : ''}`,
      'Check whether these figures were updated. Update them, or say clearly which date they refer to, then export again.',
      'Readers and AI tools take the date on the first page as the date of all the figures. Older figures may be repeated as current.');
    case 'language': return task(`Language set to ${languageName(item.declared)}, but the text looks ${item.detected.name}`,
      `The PDF says its language is “${item.declared}”, but most of its text appears to be ${item.detected.name}. Screen readers will pronounce it with the wrong rules, and search and AI tools may misread it.`,
      `Set the document language to ${item.detected.name} in the source document’s properties (or a PDF editor), then export again.`,
      'The language setting tells screen readers how to pronounce words and tells search and AI tools how to read the text.');
    case 'title-language': return task('Saved title is in a different language from the document',
      `The saved title is ${value}, but the text is in ${item.detected.name}. The title may have been left over from a template or another document.`,
      'Set the saved title in the document properties to the title shown on the cover, then export again.', sameTitle);
    case 'title': return task(`Saved title looks like a placeholder: ${value}`,
      'The title saved in the document properties is a number, file name or template default, not the publication title.',
      'Set the saved title in the document properties to the full publication title, then export again.', sameTitle);
    case 'keywords': return task('Saved keywords contain internal codes',
      `The saved keywords include ${listed(item.terms.map(term => `“${quote(term)}”`))}. These are codes from the authoring tool, not topics.`,
      'Replace the keywords in the document properties with a few topics the report covers, separated by commas. Then export again.',
      'Catalogues, search engines and AI tools read keywords as the topics of a document.');
    case 'subject-link': return task('Description is only a link', `The saved description is ${value}. A link does not tell people or tools what the report is about.`,
      'Write a one- or two-sentence summary in the description (Subject) field of the document properties. Keep the link elsewhere, then export again.',
      'Search results, catalogues and AI tools often show the saved description as the summary of a report.');
    case 'decorative': return task(`A ${/map/i.test(item.captions[0]?.text || '') ? 'map' : 'chart or figure'} is marked as decoration`,
      `On page ${item.page}, ${item.reason || 'a large graphic'}${item.captions[0] ? ` (“${quote(item.captions[0].text)}”)` : ''} is marked as decoration. Screen readers and AI tools skip decoration, so its information is lost to them.`,
      'Give the map or chart an image label (a Figure tag) with a short description of what it shows, or state its key finding in nearby text. Export again and recheck.',
      'Marking a graphic as decoration tells assistive technology and AI tools to ignore it.');
    default: return null;
  }
}
