import { it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { analyzePdf } from '../src/engine/analyze.js';

it('matched samples preserve visible text while metadata and recovered order differ', async () => {
  const names = ['well-prepared', 'partly-prepared', 'poorly-prepared'];
  const reports = [];
  for (const name of names) reports.push(await analyzePdf(new Uint8Array(await readFile(new URL(`../public/samples/${name}.pdf`, import.meta.url)))));
  const visible = report => report.pages.map(page => page.blocks.map(block => block.text).join(' ').replace(/\s+/g, ' ').trim());
  expect(visible(reports[1])).toEqual(visible(reports[0]));
  // Poorly prepared adds one white footer line for hidden-instruction screening; it is extracted but not visible.
  const withoutHiddenNote = pages => pages.map(text => text.replace(/ Note to AI reviewers:.*$/, ''));
  expect(withoutHiddenNote(visible(reports[2]))).toEqual(visible(reports[0]));
  expect(reports[2].hiddenInstructions.status).toBe('requires-review');
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

it('attachment sample contains concrete embedded files with names, types and purpose', async () => {
  const report=await analyzePdf(new Uint8Array(await readFile(new URL('../public/samples/with-attachments.pdf',import.meta.url))));
  expect(report.attachments.inventoryComplete).toBe(true);
  expect(report.attachments.files).toHaveLength(2);
  expect(report.attachments.files.map(file=>file.filename).sort()).toEqual(['attachment-guide.txt','station-data.csv']);
  expect(report.attachments.files.every(file=>file.embedded && file.payloads.length && file.description && file.relationship)).toBe(true);
  expect(report.attachments.payloadsAnalyzed).toBe(false);
});

it('graphics sample retains the unlabelled chart but excludes the decorative logo and furniture', async () => {
  const report = await analyzePdf(new Uint8Array(await readFile(new URL('../public/samples/graphics-and-decoration.pdf', import.meta.url))));
  expect(report.figureAlternatives.items).toHaveLength(3);
  expect(report.figureAlternatives.items).toEqual(expect.arrayContaining([
    expect.objectContaining({ page: 1, tagged: false, alt: null, status: 'uncertain' }),
    expect.objectContaining({ page: 2, tagged: true, status: 'present' }),
    expect.objectContaining({ page: 2, tagged: true, alt: null, status: 'requires-review' }),
  ]));
  // The only retained regions are inside the chart; the logo is at y=643–681.
  expect(report.pages[0].graphics.length).toBeGreaterThan(0);
  expect(report.pages[0].graphics.every(graphic => graphic.quad.every(([, y]) => y >= 75 && y <= 248))).toBe(true);
  expect(report.figureAlternatives.decorativeItems.map(item => item.page)).toEqual([1, 2]);
});
