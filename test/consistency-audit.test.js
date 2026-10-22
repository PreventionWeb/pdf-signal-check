import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { pdfScores } from '../src/review/scores.js';
import { normalizeFindings } from '../src/review/findings.js';
import { reviewTask } from '../src/review/workspace.js';
import { findingProvenance } from '../src/review/provenance.js';
import { ConsistencyDetail } from '../src/review/ConsistencyDetail.jsx';

const pair = { a: { page: 1, text: 'The programme reached 30 countries.', blockIds: ['a'], context: 'Regional programme: 2022.\nOnly participating countries.' }, b: { page: 2, text: 'The programme covered 40 countries.', blockIds: ['b'] }, values: [{ a: 30, b: 40, unit: 'countries' }], similarity: 0.98, inferencePerformed: true, method: 'embedding-screening' };
const base = () => ({ analysisComplete: true, accepted: true, checks: [], consistency: { items: [] } });
const facts = report => pdfScores(report).categories.find(c => c.id === 'consistency').audits.find(a => a.id === 'facts');
it('gives no positive numerical credit for unrelated AI, missing, partial or full empty flag-only coverage', () => {
  const report = { ...base(), consistency: { items: [{ kind: 'draft', severity: 'concern' }] } }, before = pdfScores(report);
  for (const factCoverage of [undefined, { candidates: 8, compared: 0 }, { candidates: 8, compared: 3 }, { candidates: 8, compared: 8 }]) {
    const next = { ...report, semantic: { inferencePerformed: true, subject: { inferencePerformed: true }, factPairs: [], factCoverage } };
    expect(facts(next).score).toBeNull();
    expect(pdfScores(next)).toEqual(before);
  }
});
it('retains completed numerical warnings as zero-credit review signals, independently of acceptance', () => {
  const report = base();
  expect(facts({ ...report, semantic: { inferencePerformed: true, factPairs: [pair] } }).score).toBe(0);
  expect(facts({ ...report, semantic: { inferencePerformed: false, factPairs: [pair] } }).score).toBeNull();
  expect(facts({ ...report, semantic: { inferencePerformed: true, factPairs: [{ ...pair, inferencePerformed: false }] } }).score).toBeNull();
  expect(facts({ ...report, consistency: { items: [{ kind: 'same-fact' }] } }).score).toBe(0);
  expect(report.accepted).toBe(true);
});
it('keeps exact source context in detail without adding context targets or modifying saved evidence', () => {
  const report = { ...base(), semantic: { inferencePerformed: true, model: { id: 'synthetic' }, factPairs: [pair] } }, saved = structuredClone(report);
  const finding = normalizeFindings(report).findings.find(f => f.comparison?.consistency?.kind === 'same-fact');
  const html = renderToStaticMarkup(React.createElement(ConsistencyDetail, { finding, report, onInspect() {} }));
  expect(html).toContain(pair.a.context);
  expect(html).toContain('Context in the PDF:');
  expect(html.match(/Show on page/g)).toHaveLength(2);
  expect(finding.targets.map(t => t.blockIds)).toEqual([['a'], ['b']]);
  expect(finding.targets.every(t => !t.quads)).toBe(true);
  expect(report).toEqual(saved);
  const task = reviewTask(finding);
  expect(task.summary).toContain('potentially related statements');
  expect(task.detailAction).toMatch(/^Compare the population, measure, time period and scope/);
  expect(findingProvenance(finding, report).detail).toContain('does not establish the same claim');
  const without = { ...finding, comparison: { consistency: { ...finding.comparison.consistency, a: { ...pair.a, context: undefined } } } };
  expect(renderToStaticMarkup(React.createElement(ConsistencyDetail, { finding: without }))).not.toContain('Context in the PDF:');
});
it('normalizes both rule and AI numerical evidence with unlocated context and conditional guidance for export', () => {
  const both = { ...pair, b: { ...pair.b, context: 'Global programme: 2023.\nAll eligible countries.  Original spacing.' } };
  for (const ai of [false, true]) {
    const report = ai ? { ...base(), semantic: { inferencePerformed: true, factPairs: [both] } }
      : { ...base(), consistency: { items: [{ ...both, id: 'rule-fact', kind: 'same-fact', severity: 'concern' }] } };
    const saved = structuredClone(report);
    const finding = normalizeFindings(report).findings.find(f => f.comparison?.consistency?.kind === 'same-fact');
    expect(finding.evidence.slice(0, 2)).toEqual([pair.a, pair.b].map(({ page, blockIds, text }) => ({ page, blockIds, text })));
    expect(finding.evidence.slice(2, 4)).toEqual([both.a, both.b].map(sentence => `Context in the PDF (statement on page ${sentence.page}): ${sentence.context}`));
    expect(finding.evidence.slice(2, 4).every(evidence => typeof evidence === 'string')).toBe(true);
    expect(finding.targets).toEqual([pair.a, pair.b].map(({ page, blockIds, text }) => ({ page, keys: [], blockIds, node: null, text })));
    expect(finding.whatToInspect).toMatch(/^Compare the population, measure, time period and scope/);
    expect(finding.whatToInspect).toContain('If they make the same claim');
    expect(finding.whyItMatters).toContain('does not establish the same claim or a factual error');
    expect(finding.whatToInspect).not.toContain('Decide which is correct');
    expect(report).toEqual(saved);
  }
  const noContext = { ...pair, a: { ...pair.a, context: undefined } };
  const finding = normalizeFindings({ ...base(), semantic: { inferencePerformed: true, factPairs: [noContext] } }).findings.find(f => f.comparison?.consistency?.kind === 'same-fact');
  expect(finding.evidence.filter(evidence => typeof evidence === 'string')).toEqual(['AI similarity: 0.98']);
});
it('presents image cosine as candidate evidence without identity or probability claims', () => {
  const report = { ...base(), imageScreening: { inferencePerformed: true, model: { label: 'Synthetic CLIP' }, duplicates: [{ a: { id: 'a', page: 1, alt: 'Coastal flooding' }, b: { id: 'b', page: 2, alt: 'A different coast' }, similarity: 0.999 }] } };
  const finding = normalizeFindings(report).findings.find(f => f.comparison?.consistency?.kind === 'same-image');
  expect(finding.title).toContain('candidates');
  expect(finding.evidence.join(' ')).not.toMatch(/%|% alike/);
  expect(finding.evidence.join(' ')).toContain('cosine similarity');
  expect(reviewTask(finding).detailAction).toMatch(/^Compare both pictures and how each is used first/);
  expect(findingProvenance(finding, report).detail).toContain('does not establish picture identity');
  expect(finding.whatToInspect).toMatch(/^Compare both pictures and how each is used first/);
  expect(finding.whatToInspect).toContain('If a description is inaccurate for that use');
  expect(finding.whatToInspect).not.toContain('Decide which is correct');
  expect(finding.whyItMatters).toContain('identical pictures can legitimately need different descriptions');
  expect(finding.whyItMatters).toContain('does not establish picture identity');
});
