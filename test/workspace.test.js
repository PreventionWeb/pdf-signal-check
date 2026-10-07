import { describe, it, expect } from 'vitest';
import { findingGroups, profileReceipt, profileReasons, reviewSummary, reviewTask, reviewLimitEvidence } from '../src/review/workspace.js';

describe('results presentation preserves independent outcomes', () => {
  it('separates missing evidence, tool scope and AI coverage from detected defects', () => {
    const findings = [
      { id: 'defect', category: 'required-defect', source: { checkId: 'language' } },
      { id: 'concern', category: 'advisory-concern', source: { path: 'authorConsistency' } },
      { id: 'review', category: 'required-indeterminate', source: { checkId: 'structure' } },
      { id: 'scope', category: 'unassessed', source: { checkId: 'supported-content' } },
      { id: 'ai', category: 'unassessed', source: { path: 'semantic.sectionCoverage' } },
      { id: 'figure', category: 'success', source: { path: 'figureAlternatives.items[0]' } },
    ];
    const before = structuredClone(findings), groups = findingGroups(findings);
    expect(groups.problems.map(f => f.id)).toEqual(['defect', 'concern']);
    expect(groups.uncertainty.map(f => f.id)).toEqual(['review']);
    expect(groups.limits.map(f => f.id)).toEqual(['scope']);
    expect(groups.coverage.map(f => f.id)).toEqual(['ai']);
    expect(groups.success.map(f => f.id)).toEqual(['figure']);
    expect(Object.values(groups).flat()).toHaveLength(findings.length);
    expect(findings).toEqual(before);
  });
  it('keeps a scope-limited profile unestablished despite zero detected defects', () => {
    const report = { accepted: false, checks: [{ id: 'supported-content', label: 'Content scope', status: 'indeterminate', summary: 'Meaningful graphics need separate analysis.' }] };
    expect(profileReceipt(report)).toBe('Required text checks not established');
    expect(profileReasons(report)).toEqual(['Content scope: Meaningful graphics need separate analysis.']);
    expect(profileReceipt({ ...report, checks: [{ id: 'language', status: 'fail' }] })).toBe('Required text defects found');
    expect(profileReceipt({ accepted: true, checks: [] })).toBe('Required text checks passed');
  });
  it('keeps partial and incomplete results explicit even when no problems were detected', () => {
    const groups = findingGroups([
      { id: 'order', category: 'uncertain', source: { path: 'readingOrder' } },
      { id: 'scope', category: 'unassessed', source: { checkId: 'supported-content' } },
    ]);
    const report = { accepted: false, analysisComplete: true, checks: [{ status: 'indeterminate' }] };
    const before = structuredClone(report);
    const summary = reviewSummary(report, groups);
    expect(summary.tasks.map(item => item.id)).toEqual(['order']);
    expect(summary.scope).toContain('partial result');
    expect(summary.scope).toContain('has not met all');
    expect(reviewSummary({ ...report, analysisComplete: false }, groups).headline).toBe('The check could not finish');
    expect(report).toEqual(before);
  });
  it('prioritizes detected concerns before manual review and keeps acceptance separate', () => {
    const groups = findingGroups([
      { id: 'review', category: 'uncertain', source: { path: 'readingOrder' } },
      { id: 'title', category: 'advisory-concern', source: { path: 'metadataConsistency' } },
    ]);
    const report = { accepted: true, analysisComplete: true, checks: [{ status: 'pass' }] };
    const summary = reviewSummary(report, groups);
    expect(summary.tasks.map(item => item.id)).toEqual(['title', 'review']);
    expect(summary.headline).not.toContain('No problems auto-detected');
    expect(summary.scope).toContain('met this tool');
    expect(report.accepted).toBe(true);
  });
  it('explains graphics-only scope without hiding other incomplete checks', () => {
    const groups = findingGroups([]);
    const graphics = { id: 'supported-content', status: 'indeterminate', evidence: ['2 non-artifact graphic painting operations need semantic inspection.'] };
    const report = { accepted: false, analysisComplete: true, checks: [graphics] };
    expect(reviewSummary(report, groups).scope).toContain('cannot judge image or chart meaning');
    expect(reviewSummary({ ...report, checks: [graphics, { id: 'completion', status: 'indeterminate' }] }, groups).scope).toContain('partial result');
    expect(reviewSummary({ ...report, checks: [{ ...graphics, evidence: [...graphics.evidence, 'Form XObjects are unsupported.'] }] }, groups).scope).toContain('partial result');
  });
});

it('explains uncertain keyword meaning without claiming the words are missing or changing its outcome', () => {
  const finding = { title: 'Keyword: flood risk', method: 'embedding-screening', outcome: 'uncertain', source: { path: 'semantic.keywordItems[0]' }, comparison: { query: 'flood risk' } };
  const before = structuredClone(finding);
  const task = reviewTask(finding);
  expect(task.summary).toContain('not a confirmed error');
  expect(task.why).toContain('rather than searching for the exact words');
  expect(task.why).toContain('topic covered later');
  expect(finding).toEqual(before);
  expect(reviewTask({ ...finding, method: 'unsupported-language' }).summary).toBeUndefined();
  expect(reviewTask({ ...finding, category: 'unassessed' }).summary).toBeUndefined();
});

it('distinguishes missing structure labels, broken connections and incomplete checks', () => {
  const finding = { category: 'required-defect', outcome: 'fail', source: { checkId: 'structure' }, summary: 'No structure tree found.' };
  const before = structuredClone(finding);
  const missing = reviewTask(finding);
  expect(missing.summary).toContain('no tag tree');
  expect(missing.summary).toContain('visible table of contents does not supply');
  expect(missing.detailAction).toContain('Export with PDF tags enabled');
  const broken = reviewTask({ ...finding, summary: 'Tag links are missing or inconsistent.' });
  expect(broken.summary).toContain('has structure labels');
  expect(broken.summary).not.toContain('no tag tree');
  const incomplete = reviewTask({ ...finding, category: 'required-indeterminate', outcome: 'indeterminate' });
  expect(incomplete.summary).toContain('could not confirm');
  expect(incomplete.summary).not.toContain('no tag tree');
  expect(finding).toEqual(before);
});

it('does not turn unavailable AI checks into inferred mismatches', () => {
  const base = { title: 'Subject screening', summary: 'Unsupported language.', outcome: 'uncertain', category: 'unassessed', method: 'unsupported-language', source: { path: 'semantic.subject' } };
  expect(reviewTask(base).summary).toBeUndefined();
  expect(reviewTask({ ...base, method: 'embedding-screening' }).summary).toBeUndefined();
  const completed = reviewTask({ ...base, category: 'uncertain', method: 'embedding-screening' });
  expect(completed.summary).toContain('not a confirmed error');
  expect(completed.why).toContain('topics covered later');
});

it('distinguishes missing figure descriptions from uncertain graphic purpose', () => {
  const base = { source: { path: 'figureAlternatives.items[0]' }, category: 'uncertain' };
  const unknown = reviewTask({ ...base, comparison: { figure: { tagged: false } } });
  expect(unknown.summary).toContain('may be decoration');
  expect(unknown.summary).not.toContain('without a saved text description');
  const missing = reviewTask({ ...base, comparison: { figure: { tagged: true, alt: '' } } });
  expect(missing.summary).toContain('without a saved text description');
  const present = reviewTask({ ...base, category: 'success', comparison: { figure: { tagged: true, alt: 'A chart', status: 'present' } } });
  expect(present.summary).toContain('accuracy and completeness have not been checked');
});

it('does not claim absent text is untagged and keeps review instructions compact in the inbox', () => {
  const task = reviewTask({ source: { checkId: 'coverage' }, category: 'required-defect', outcome: 'fail', summary: 'No relevant text to account for.' });
  expect(task.summary).toContain('could not extract text');
  expect(task.summary).not.toContain('Some extracted text');
  expect(task.action.length).toBeLessThan(task.detailAction.length);
});

it('explains graphics scope without treating drawing operations as an image count', () => {
  const text = reviewLimitEvidence('4 non-artifact graphic painting operations need semantic inspection.');
  expect(text).toContain('graphic content');
  expect(text).not.toContain('4');
  expect(reviewLimitEvidence('Attachment inventory was incomplete.')).toBe('Attachment inventory was incomplete.');
});

it('groups heading reviews once while preserving every member outcome and source finding', async () => {
  const { groupHeadingFindings } = await import('../src/review/workspace.js');
  const members = [
    { id: 'h1', category: 'advisory-concern', outcome: 'suspected-mismatch', source: { path: 'semantic.sectionItems[0]' } },
    { id: 'h2', category: 'uncertain', outcome: 'uncertain', source: { path: 'semantic.sectionItems[1]' } },
  ];
  const original = findingGroups(members);
  const grouped = groupHeadingFindings(original);
  expect(grouped.problems).toHaveLength(1);
  expect(grouped.uncertainty).toEqual([]);
  expect(grouped.problems[0].members).toEqual(members);
  expect(original.problems[0]).toBe(members[0]);
  expect(original.uncertainty[0]).toBe(members[1]);
  expect(reviewTask(grouped.problems[0]).title).toBe('Check that headings describe their sections');
});

it('explains the saved subject using its actual value without promoting uncertainty to an error', () => {
  const task = reviewTask({ source: { path: 'semantic.subject' }, method: 'embedding-screening', category: 'uncertain', outcome: 'uncertain', comparison: { metadata: { subject: 'Coastal water quality observations' } } });
  expect(task.summary).toContain('“Coastal water quality observations”');
  expect(task.summary).toContain('document properties');
  expect(task.summary).toContain('not a confirmed error');
  expect(task.title).toBe('Check the PDF’s saved description');
});

it('orders review tasks by critical defects, advisory warnings and unresolved manual checks without changing outcomes', async () => {
  const { reviewPriority } = await import('../src/review/workspace.js');
  const findings = [
    { id: 'manual', category: 'required-indeterminate', outcome: 'uncertain' },
    { id: 'warning', category: 'advisory-concern', outcome: 'suspected-mismatch' },
    { id: 'critical', category: 'required-defect', outcome: 'fail' },
  ];
  const before = structuredClone(findings);
  const tasks = reviewSummary({ analysisComplete: true, checks: [{ status: 'fail' }] }, findingGroups(findings)).tasks;
  expect(tasks.map(item => item.id)).toEqual(['critical', 'warning', 'manual']);
  expect(tasks.map(item => reviewPriority(item).label)).toEqual(['Critical', 'Warning', 'Needs manual check']);
  expect(findings).toEqual(before);
  expect(reviewPriority({ members: [findings[0], findings[1]], category: 'uncertain' }).key).toBe('warning');
});


it('prioritizes an unrecovered reading sequence as critical without changing engine outcomes', async () => {
  const { normalizeFindings } = await import('../src/review/findings.js');
  const { reviewPriority } = await import('../src/review/workspace.js');
  const report = { analysisComplete: true, checks: [], pages: [{ number: 1, logicalBlocks: [] }], readingOrder: { status: 'uncertain', reason: 'Not established.', evidence: [] } };
  const before = structuredClone(report);
  const missing = normalizeFindings(report).findings.find(f => f.source.path === 'readingOrder');
  expect(reviewPriority(missing).key).toBe('critical');
  expect(reviewPriority(missing).noticeVariant).toBe('negative');
  expect(missing.outcome).toBe('uncertain');
  expect(report).toEqual(before);
  const recovered = normalizeFindings({ ...report, pages: [{ number: 1, logicalBlocks: [{ text: 'Recovered text' }] }] }).findings.find(f => f.source.path === 'readingOrder');
  expect(reviewPriority(recovered).key).toBe('manual');
  const incomplete = normalizeFindings({ ...report, analysisComplete: false }).findings.find(f => f.source.path === 'readingOrder');
  expect(reviewPriority(incomplete).key).toBe('manual');
});

it('reports the critical issue count separately from the required-check percentage', () => {
  const report = { analysisComplete: true, checks: [{ status: 'pass' }, { status: 'fail' }] };
  const findings = Array.from({ length: 3 }, (_, i) => ({ id: `critical-${i}`, category: 'required-defect', outcome: 'fail' }));
  const summary = reviewSummary(report, findingGroups([...findings, { id: 'manual', category: 'uncertain' }]));
  expect(summary.criticalCount).toBe(3);
  expect(reviewSummary(report, findingGroups([])).criticalCount).toBe(0);
});

it('distinguishes figure entries on the same page without changing their identity or descriptions', async () => {
  const { normalizeFindings } = await import('../src/review/findings.js');
  const report = { checks: [], pages: [], figureAlternatives: { items: [
    { id: 'a', page: 1, alt: 'Coastal water chart', tagged: true, status: 'uncertain' },
    { id: 'b', page: 1, alt: null, tagged: true, status: 'requires-review' },
    { id: 'c', page: 2, alt: null, tagged: true, status: 'requires-review' },
  ] } };
  const findings = normalizeFindings(report).findings.filter(f => f.comparison.figure);
  expect(findings.map(f => f.comparison.figureNumber)).toEqual([2, 1, 1]);
  expect(findings.find(f => f.id === 'figure:a').comparison.figure.alt).toBe('Coastal water chart');
  expect(new Set(findings.map(f => reviewTask(f).title)).size).toBe(3);
});
