import {it, expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {analyzePdf} from '../src/engine/analyze.js';
import {orderComparisonData} from '../src/review/order-comparison.js';

it('illustrates actual numbered detector evidence without treating filename as ground truth', async () => {
  const report = await analyzePdf(new Uint8Array(await readFile(new URL('../public/calibration/17-flawed-reading-order.pdf', import.meta.url))));
  report.fileName = 'correct-order.pdf';
  const data = orderComparisonData(report);
  expect(data.available).toBe(true);
  expect(data.page).toBe(2);
  expect(data.tagged.map(entry => entry.step)).toEqual([3, 4, 1, 2]);
  expect(data.drawing.map(entry => entry.step)).toEqual([1, 2, 3, 4]);
  expect(data.anomalies.map(item => item.text)).toEqual(['Tag-tree order jumps backwards: 4 → 1.']);
  expect(new Set(data.tagged.map(entry => entry.key))).toEqual(new Set(data.drawing.map(entry => entry.key)));
});

it('does not invent a backward jump for the correctly ordered real PDF control', async () => {
  const report = await analyzePdf(new Uint8Array(await readFile(new URL('../public/calibration/16-correct-reading-order.pdf', import.meta.url))));
  report.fileName = 'flawed-order.pdf';
  expect(report.readingOrder.findings).toEqual([]);
  expect(orderComparisonData(report)).toMatchObject({available: false});
});

const quad = y => [[0,y],[100,y],[100,y+10],[0,y+10]];
const fixture = (count = 4, numbered = true) => {
  const blocks = Array.from({length: count}, (_, i) => ({key: `1:${i}`, role: 'H2', text: numbered ? `${i+1}. Heading ${i+1}` : `Heading ${i+1}`, quad: quad(500-i*50)}));
  const logicalBlocks = [...blocks.slice(2), ...blocks.slice(0,2)].map(({quad, ...block}) => block);
  return {pages: [{number: 1, blocks, logicalBlocks}], readingOrder: {findings: [{page: 1, detector: numbered ? 'numbered-step-sequence' : 'single-alignment-heading-geometry', evidence: logicalBlocks}]}};
};

it('abstains when matched text, location, or unique key occurrence is missing', () => {
  for (const change of [
    report => { report.pages[0].blocks[0].text = 'Another heading'; },
    report => { report.pages[0].blocks[0].quad = null; },
    report => { report.pages[0].logicalBlocks.push(report.pages[0].logicalBlocks[0]); },
    report => { report.pages[0].blocks.push(report.pages[0].blocks[0]); },
  ]) {
    const report = fixture(); change(report);
    expect(orderComparisonData(report).available).toBe(false);
  }
});

it('shows unnumbered spatial headings without inventing step numbers', () => {
  const data = orderComparisonData(fixture(4, false));
  expect(data.available).toBe(true);
  expect(data.numbered).toBe(false);
  expect(data.tagged.every(entry => entry.step === null)).toBe(true);
  expect(data.anomalies[0].text).toBe('Tag-tree order moves upward between these headings.');
});

it('bounds illustration around the actual anomaly and records omissions', () => {
  const data = orderComparisonData(fixture(20));
  expect(data.available).toBe(true);
  expect(data.tagged).toHaveLength(8);
  expect(data.omittedItems).toBe(12);
  expect(data.anomalies).toHaveLength(1);
  expect(data.anomalies[0].text).toBe('Tag-tree order jumps backwards: 20 → 1.');
  expect(new Set(data.tagged.map(entry => entry.key))).toEqual(new Set(data.drawing.map(entry => entry.key)));
});

it('keeps unknown and unlocated findings uncertain rather than fabricating a comparison', () => {
  expect(orderComparisonData({})).toMatchObject({available: false});
  const report = fixture(); report.readingOrder.findings[0].page = 2;
  expect(orderComparisonData(report).available).toBe(false);
});
