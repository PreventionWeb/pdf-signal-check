import { it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { analyzePdf } from '../src/engine/analyze.js';

it('matched samples preserve visible text while metadata and recovered order differ', async () => {
  const names = ['well-prepared', 'partly-prepared', 'poorly-prepared'];
  const reports = [];
  for (const name of names) reports.push(await analyzePdf(new Uint8Array(await readFile(new URL(`../public/samples/${name}.pdf`, import.meta.url)))));
  const visible = report => report.pages.map(page => page.blocks.map(block => block.text).join(' ').replace(/\s+/g, ' ').trim());
  expect(visible(reports[1])).toEqual(visible(reports[0]));
  expect(visible(reports[2])).toEqual(visible(reports[0]));
  expect(reports[0].metadata.author).toBe('Maya Chen; Leo Martin');
  expect(reports[1].metadata.author).not.toBe(reports[0].metadata.author);
  expect(reports[0].readingOrder.findings).toHaveLength(0);
  expect(reports[1].readingOrder.findings.some(f => f.detector === 'numbered-step-sequence')).toBe(true);
  expect(reports[2].metadata.language).toBeNull();
  expect(reports[2].pages.every(page => page.logicalBlocks.length === 0)).toBe(true);
  expect(reports[2].checks.find(c => c.id === 'structure').status).toBe('fail');
  expect(reports[0].figureAlternatives.items).toEqual(expect.arrayContaining([expect.objectContaining({tagged:true,status:'present',alt:expect.stringContaining('2.8')})]));
  expect(reports[1].figureAlternatives.items).toEqual(expect.arrayContaining([expect.objectContaining({tagged:true,status:'requires-review',alt:null})]));
  expect(reports[2].figureAlternatives.items).toEqual(expect.arrayContaining([expect.objectContaining({tagged:false,status:'uncertain',alt:null})]));
  expect(reports.every(report=>report.figureAlternatives.meaningAssessed===false)).toBe(true);
  // The figure is meaningful: correct tags alone must not waive profile limits.
  expect(reports[0].checks.find(c => c.id === 'supported-content').status).toBe('indeterminate');
});
