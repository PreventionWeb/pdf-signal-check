/**
 * Lighthouse-style scores: weighted checks per category, each passed (1), partly passed (0–1) or failed (0).
 * Checks the tool could not decide are left out and counted separately, so uncertainty never moves a score.
 * Presentation only: scores summarise this tool's own checks and are not a certification of the PDF.
 */
const SCORE_BANDS = [[90, 'good'], [50, 'average'], [0, 'poor']];
export const scoreBand = score => SCORE_BANDS.find(([floor]) => score >= floor)[1];

const check = (report, id) => (report.checks || []).find(item => item.id === id);
/** Required profile check: pass 1, fail 0, anything else not decided. */
const required = (report, id) => {
  const status = check(report, id)?.status;
  return status === 'pass' ? 1 : status === 'fail' ? 0 : null;
};
const items = (report, predicate) => (report.consistency?.items || []).filter(predicate);
/** No concern from these consistency items scores 1, only minor ones 0.8, any concern 0. */
const consistencyScore = (report, kinds) => {
  const found = items(report, item => kinds.includes(item.kind) && item.severity !== 'unresolved');
  return found.some(item => item.severity === 'concern') ? 0 : found.length ? 0.8 : 1;
};

function people(report) {
  const figures = (report.figureAlternatives?.items || []).filter(item => item.tagged);
  const unusable = new Set((report.figureDescriptions?.items || []).filter(item => item.flags.some(flag => ['auto-generated', 'generic', 'file-name'].includes(flag))).map(item => item.id));
  const described = figures.filter(item => item.alt && !unusable.has(item.id)).length;
  const sequence = (report.pages || []).some(page => page.logicalBlocks?.some(block => block.text?.trim()));
  return [
    { id: 'tags', label: 'Tags connect the content', weight: 10, score: required(report, 'structure') },
    { id: 'coverage', label: 'All text is tagged', weight: 6, score: required(report, 'coverage') },
    { id: 'text', label: 'Text can be read correctly', weight: 8, score: required(report, 'text') },
    { id: 'language', label: 'Document language is set', weight: 6, score: required(report, 'language') },
    { id: 'images', label: 'Images have useful descriptions', weight: 8, score: figures.length ? described / figures.length : null },
    { id: 'order', label: 'A reading order exists, with no detected problems', weight: 6,
      score: !report.analysisComplete ? null : !sequence ? 0 : report.readingOrder?.status === 'requires-review' ? 0.5 : 1 },
  ];
}

function aiAndSearch(report) {
  const metadata = report.metadata || {};
  const keywordCodes = items(report, item => item.kind === 'keywords').length > 0;
  const missing = report.machineMetadata?.missingPublication;
  return [
    { id: 'title', label: 'A title is saved', weight: 8, score: required(report, 'title') },
    { id: 'title-match', label: 'Saved title matches the cover', weight: 6,
      score: report.metadataConsistency?.status === 'match' ? 1 : report.metadataConsistency?.status === 'suspected-mismatch' ? 0 : null },
    { id: 'publishing', label: 'Publisher and date are saved', weight: 6,
      score: Array.isArray(missing) ? ['publisher', 'date'].filter(field => !missing.includes(field)).length / 2 : null },
    { id: 'description', label: 'A description is saved', weight: 3, score: report.analysisComplete ? (String(metadata.subject || '').trim() ? 1 : 0) : null },
    { id: 'keywords', label: 'Keywords are saved and meaningful', weight: 2, score: report.analysisComplete ? (!String(metadata.keywords || '').trim() || keywordCodes ? 0 : 1) : null },
    { id: 'hidden', label: 'No hidden instructions for AI', weight: 8,
      score: report.hiddenInstructions?.status === 'requires-review' ? 0 : report.hiddenInstructions?.status && report.hiddenInstructions.status !== 'not-assessed' ? 1 : null },
    { id: 'values', label: 'Values sit with their labels', weight: 3,
      score: report.detachedValues?.status === 'requires-review' ? 0 : report.detachedValues?.status && report.detachedValues.status !== 'not-assessed' ? 1 : null },
  ];
}

function consistency(report) {
  if (!report.consistency?.items) return [];
  const language = report.metadata?.language;
  const contents = items(report, item => /^contents-/.test(item.kind));
  const ai = report.semantic?.inferencePerformed === true;
  return [
    { id: 'names', label: 'The title reads the same everywhere', weight: 6, score: consistencyScore(report, ['punctuation', 'order', 'spelling', 'shortened', 'reworded', 'different', 'year', 'substitution']) },
    { id: 'dates', label: 'No out-of-date figures, draft labels or placeholders', weight: 6, score: consistencyScore(report, ['stale', 'draft', 'leftovers']) },
    { id: 'language-match', label: 'Declared language matches the text', weight: 5, score: language ? consistencyScore(report, ['language', 'title-language']) : null },
    { id: 'placeholders', label: 'Saved details are not placeholders', weight: 4, score: consistencyScore(report, ['title', 'keywords', 'subject-link']) },
    { id: 'decoration', label: 'No maps or charts hidden as decoration', weight: 6, score: consistencyScore(report, ['decorative']) },
    { id: 'contents', label: 'Contents match the pages', weight: 4, score: contents.length ? consistencyScore(report, ['contents-page', 'contents-conflict', 'contents-wording']) : null },
    { id: 'facts', label: 'Figures are given the same way throughout', weight: 3,
      score: ai ? ((report.semantic.factPairs || []).length || items(report, item => item.kind === 'same-fact').length ? 0 : 1) : (items(report, item => item.kind === 'same-fact').length ? 0 : null) },
  ];
}

function travel(report) {
  const missing = report.machineMetadata?.missingPublication;
  const status = field => report[field]?.status;
  return [
    { id: 'bookmarks', label: 'Bookmarks for navigation', weight: 3, score: status('outline') === 'present' || status('outline') === 'not-needed' ? 1 : status('outline') === 'opportunity' ? 0 : null },
    { id: 'links', label: 'Links are tagged', weight: 2, score: status('links') === 'present' ? (report.links.linksTagged === 'all' ? 1 : 0) : null },
    { id: 'licence', label: 'Licence and identifier are saved', weight: 2, score: Array.isArray(missing) ? ['rights', 'identifier'].filter(field => !missing.includes(field)).length / 2 : null },
    { id: 'data', label: 'Charts have a data table or file', weight: 2, score: status('figureData') === 'present' ? 1 : status('figureData') === 'opportunity' ? 0 : null },
    { id: 'references', label: 'Cross-references are links', weight: 1, score: status('crossReferences') === 'present' ? 1 : status('crossReferences') === 'requires-review' ? 0 : null },
    { id: 'description-file', label: 'A description for reuse is attached', weight: 1, score: report.machineMetadata?.structuredData ? (report.machineMetadata.structuredData.length ? 1 : 0) : null },
  ];
}

const summarise = (id, label, audits) => {
  const decided = audits.filter(audit => audit.score != null);
  const weight = decided.reduce((sum, audit) => sum + audit.weight, 0);
  const score = weight ? Math.round(100 * decided.reduce((sum, audit) => sum + audit.weight * audit.score, 0) / weight) : null;
  return { id, label, score, band: score == null ? null : scoreBand(score), audits, decided: decided.length, total: audits.length };
};

/** Category scores, the overall score (People, AI and search, Consistency) and a separate bonus for travelling further. */
export function pdfScores(report) {
  if (!report?.analysisComplete) return null;
  const categories = [summarise('people', 'People', people(report)), summarise('ai', 'AI and search', aiAndSearch(report)), summarise('consistency', 'Consistency', consistency(report))];
  const scored = categories.filter(category => category.score != null);
  const overall = scored.length ? Math.round(scored.reduce((sum, category) => sum + category.score, 0) / scored.length) : null;
  return { overall, band: overall == null ? null : scoreBand(overall), categories, bonus: summarise('travel', 'Travels further', travel(report)),
    decided: categories.reduce((sum, category) => sum + category.decided, 0), total: categories.reduce((sum, category) => sum + category.total, 0) };
}
