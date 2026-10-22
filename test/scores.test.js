import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { analyzePdf } from '../src/engine/analyze.js';
import { pdfScores, scoreBand } from '../src/review/scores.js';

const load = async name => analyzePdf(new Uint8Array(await readFile(new URL(`../public/samples/${name}.pdf`, import.meta.url))), { fileName: `${name}.pdf` });

it('ranks the public samples from well prepared to poorly prepared', async () => {
  const [good, partly, poor] = await Promise.all(['well-prepared', 'partly-prepared', 'poorly-prepared'].map(load));
  const [g, p, b] = [good, partly, poor].map(report => pdfScores(report).overall);
  expect(g).toBeGreaterThan(p);
  expect(p).toBeGreaterThan(b);
  expect(scoreBand(g)).toBe('good');
  expect(scoreBand(b)).toBe('poor');
});
it('leaves undecided checks out instead of counting them for or against', async () => {
  const report = await load('well-prepared');
  const scores = pdfScores(report);
  const undecided = { ...report, metadataConsistency: { ...report.metadataConsistency, status: 'uncertain' } };
  const ai = pdfScores(undecided).categories.find(category => category.id === 'ai');
  expect(ai.audits.find(audit => audit.id === 'title-match').score).toBeNull();
  expect(ai.decided).toBe(scores.categories.find(category => category.id === 'ai').decided - 1);
  expect(pdfScores({ ...report, analysisComplete: false })).toBeNull();
});
it('keeps the travel-further bonus out of the overall score', async () => {
  const report = await load('well-prepared');
  const scores = pdfScores(report);
  const mean = Math.round(scores.categories.reduce((sum, category) => sum + category.score, 0) / scores.categories.length);
  expect(scores.overall).toBe(mean);
});
