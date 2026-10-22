import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createPdfReport } from '../src/export/report.js';
import { pdfScores } from '../src/review/scores.js';
import { normalizeFindings } from '../src/review/findings.js';
import { reviewTask } from '../src/review/workspace.js';
import { findingProvenance } from '../src/review/provenance.js';
import { ConsistencyDetail } from '../src/review/ConsistencyDetail.jsx';
import { Checks } from '../src/app/Checks.jsx';
import { captureSnapshot, fixSheet } from '../src/export/snapshot.js';
import { reviewGroups, reviewSummary } from '../src/review/workspace.js';

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
it('penalizes only deterministic numerical warnings, independently of AI receipts and acceptance', () => {
  const report = base();
  expect(facts({ ...report, semantic: { inferencePerformed: true, factPairs: [pair] } }).score).toBeNull();
  expect(facts({ ...report, semantic: { inferencePerformed: false, factPairs: [pair] } }).score).toBeNull();
  expect(facts({ ...report, semantic: { inferencePerformed: true, factPairs: [{ ...pair, inferencePerformed: false }] } }).score).toBeNull();
  expect(facts({ ...report, consistency: { items: [{ kind: 'same-fact' }] } }).score).toBe(0);
  expect(report.accepted).toBe(true);
});
it('excludes experimental AI candidates from normalized findings, tasks, headlines, scores and concise exports while retaining exact receipts', () => {
  const original = { ...base(), file: { name: 'synthetic.pdf' }, metadata: { language: 'en' }, pages: [], semantic: { inferencePerformed: true, model: { id: 'minilm' }, factPairs: [] } };
  const report = { ...original, semantic: { inferencePerformed: true, model: { id: 'minilm' }, factPairs: [structuredClone(pair)] } };
  const saved = structuredClone(report);
  const before = normalizeFindings(original), normalized = normalizeFindings(report);
  expect(normalized.findings.some(f => f.comparison?.consistency?.kind === 'same-fact')).toBe(false);
  const summary = data => reviewSummary(data, reviewGroups(normalizeFindings(data).findings));
  expect(summary(report).headline).toEqual(summary(original).headline);
  expect(summary(report).buckets.check).toEqual(summary(original).buckets.check);
  expect(normalized.counts).toEqual(before.counts);
  expect(pdfScores(report)).toEqual(pdfScores(original));
  const snapshot = captureSnapshot({ report });
  expect(fixSheet(snapshot)).toEqual(fixSheet(captureSnapshot({ report: original })));
  expect(snapshot.report.semantic.factPairs).toEqual([pair]);
  const html = renderToStaticMarkup(React.createElement(Checks, { state: { report, selectedModel: null, checks: [] }, controller: {}, showStatus: false }));
  for (const text of [pair.a.text, pair.b.text, pair.a.context, '0.98', 'Original statement on page 1', 'Original statement on page 2', 'Experimental numerical evidence']) expect(html).toContain(text);
  expect(html).toContain('not a confidence probability');
  expect(html).toContain('do not affect scores');
  expect(report).toEqual(saved);
  report.semantic.factPairs[0].a.text = 'Later changed';
  expect(snapshot.report.semantic.factPairs[0].a.text).toBe(saved.semantic.factPairs[0].a.text);
});
it('keeps deterministic numerical warnings in Check with exact original context and conditional guidance', () => {
  const both = { ...pair, b: { ...pair.b, context: 'Global programme: 2023.\nAll eligible countries.  Original spacing.' } };
  const report = { ...base(), file: { name: 'rule.pdf' }, consistency: { items: [{ ...both, id: 'rule-fact', kind: 'same-fact', severity: 'concern', method: 'identical-wording', inferencePerformed: false }] } };
  const saved = structuredClone(report);
  const finding = normalizeFindings(report).findings.find(f => f.comparison?.consistency?.kind === 'same-fact');
  expect(finding.method).toBe('consistency-rules');
  expect(finding.evidence.slice(0, 2)).toEqual([pair.a, pair.b].map(({ page, blockIds, text }) => ({ page, blockIds, text })));
  expect(finding.evidence.slice(2)).toEqual([both.a, both.b].map(sentence => `Context in the PDF (statement on page ${sentence.page}): ${sentence.context}`));
  expect(finding.targets).toEqual([pair.a, pair.b].map(({ page, blockIds, text }) => ({ page, keys: [], blockIds, node: null, text })));
  expect(finding.whatToInspect).toMatch(/^Compare the population, measure, time period and scope/);
  const html = renderToStaticMarkup(React.createElement(ConsistencyDetail, { finding, report, onInspect() {} }));
  expect(html).toContain(pair.a.context);
  expect(html.match(/Show on page/g)).toHaveLength(2);
  expect(fixSheet(captureSnapshot({ report })).check).toHaveLength(1);
  expect(facts(report).score).toBe(0);
  expect(report).toEqual(saved);
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

it('writes exact experimental receipts only in the full PDF appendix and keeps rule warnings in both PDFs', async () => {
  vi.stubGlobal('FontFace', class { async load() {} });
  vi.stubGlobal('document', { fonts: { add() {}, delete() {} } });
  const longContext = 'Original retained source context. '.repeat(30) + 'EXACT END OF CONTEXT';
  const candidate = { ...pair, a: { ...pair.a, context: longContext }, similarity: 0.98123456789 };
  const report = { ...base(), file: { name: 'synthetic.pdf', pages: 2 }, metadata: {}, pages: [], analyzedAt: '2026-10-23',
    consistency: { items: [{ ...pair, id: 'rule-fact', kind: 'same-fact', severity: 'concern', method: 'identical-wording', inferencePerformed: false, a: { ...pair.a, context: 'Rule source context.', text: 'RULE ORIGINAL 30 countries.' }, b: { ...pair.b, text: 'RULE ORIGINAL 40 countries.' } }] },
    semantic: { inferencePerformed: true, factPairs: [candidate] } };
  const snapshot = captureSnapshot({ report });
  const fontBytes = new Uint8Array(await readFile(new URL('../public/fonts/NotoSans-Regular.ttf', import.meta.url)));
  try {
    for (const includeTechnical of [false, true]) {
      const blob = await createPdfReport(snapshot, { includeTechnical, fontBytes });
      const task = getDocument({ data: new Uint8Array(await blob.arrayBuffer()), useSystemFonts: true });
      const pdf = await task.promise;
      const pages = [];
      try {
        for (let n = 1; n <= pdf.numPages; n++) pages.push((await (await pdf.getPage(n)).getTextContent()).items.map(item => item.str).join(' '));
      } finally { await task.destroy(); }
      const text = pages.join(' ').replace(/\s+/g, ' ');
      expect(text).toContain('30 countries');
      expect(text).toContain('40 countries');
      if (includeTechnical) {
        for (const exact of [candidate.a.text, candidate.b.text, longContext, '0.98123456789', 'Experimental numerical evidence', 'Original statement on page 1', 'Original statement on page 2']) expect(text).toContain(exact.replace(/\s+/g, ' '));
        expect(text.indexOf('Experimental numerical evidence')).toBeGreaterThan(text.indexOf('Technical appendix'));
        expect(text).toContain('RULE ORIGINAL');
      } else {
        expect(text).not.toContain(candidate.a.text);
        expect(text).not.toContain(candidate.b.text);
        expect(text).not.toContain('Experimental numerical');
        expect(text).not.toContain('0.98123456789');
      }
    }
    expect(snapshot.report.semantic.factPairs).toEqual([candidate]);
  } finally { vi.unstubAllGlobals(); }
});
