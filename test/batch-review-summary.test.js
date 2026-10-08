import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { analyzePdf } from '../src/engine/analyze.js';
import { createSequentialQueue } from '../src/batch/queue.js';
import { captureSnapshot, fixSheet } from '../src/export/snapshot.js';
import { normalizeFindings } from '../src/review/findings.js';
import { reviewGroups, reviewSummary } from '../src/review/workspace.js';

it.each(['partly-prepared', 'graphics-and-decoration', 'well-prepared'])('keeps batch, review and export action counts consistent for %s', async name => {
  const report = await analyzePdf(new Uint8Array(await readFile(new URL(`../public/samples/${name}.pdf`, import.meta.url))));
  const before = structuredClone(report);
  const normalized = normalizeFindings(report);
  const overview = reviewSummary(report, reviewGroups(normalized.findings));
  const sheet = fixSheet(captureSnapshot({ report }));
  const queue = createSequentialQueue({ analyze: async () => structuredClone(report) });
  const [id] = queue.enqueue([{ name: `${name}.pdf`, size: 123 }]);
  await queue.start({ useAI: false });
  const summary = queue.snapshot().items[0].summary;
  expect(summary.presentationCounts).toEqual({ version: 2, ...overview.counts });
  expect(summary.presentationCounts.fix).toBe(sheet.fix.length);
  expect(summary.presentationCounts.check).toBe(sheet.check.length);
  expect(summary.presentationCounts.unknown).toBe(sheet.unknown.length);
  expect(summary.presentationCounts.couldntCheck).toBe(sheet.unknown.length + sheet.limits.length);
  expect(summary.findingCounts).toEqual(normalized.counts);
  expect(summary.accepted).toBe(before.accepted);
  queue.releaseDetails([id], { consent: true });
  expect(queue.snapshot().items[0].summary).toEqual(summary);
  expect(report).toEqual(before);
});

it('counts multiple heading comparisons as one task while retaining member outcomes', async () => {
  const report = { analysisComplete: true, accepted: true, file: { name: 'headings.pdf', pages: 1 }, pages: [], checks: [], metadata: {},
    semantic: { inferencePerformed: true, requestedChecks: ['sections'], sections: { status: 'suspected-mismatch' },
      sectionItems: ['Background', 'Methods', 'Results'].map((text, index) => ({ heading: { text, page: 1, keys: [String(index)] },
        status: index === 2 ? 'uncertain' : 'suspected-mismatch', method: 'embedding-screening', inferencePerformed: true })) } };
  const normalized = normalizeFindings(report), groups = reviewGroups(normalized.findings);
  const queue = createSequentialQueue({ analyze: async () => structuredClone(report) });
  const [id] = queue.enqueue([{ name: 'headings.pdf', size: 123 }]);
  await queue.start({ useAI: false });
  const counts = queue.snapshot().items[0].summary.presentationCounts;
  expect(counts.check).toBe(1);
  expect(counts.unknown).toBe(1);
  expect(groups.problems[0].members).toHaveLength(2);
  expect(queue.getReport(id).semantic.sectionItems).toEqual(report.semantic.sectionItems);
});
