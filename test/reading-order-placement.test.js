import { expect, it } from 'vitest';
import { readingOrderPlacement } from '../src/evidence/reading-order-placement.js';
const quad = [[0, 0], [20, 0], [20, 10], [0, 10]];
const fixture = () => ({ pages: [{ number: 1, logicalBlocks: [{ key: 'a', text: 'First' }, { key: 'b', text: 'Second' }, { key: 'c', text: 'Third' }], blocks: [{ key: 'a', quad }, { key: 'a', quad }, { key: 'c', quad }] }] });
it('counts located sequence entries rather than rectangles, retaining original sequence numbers and bounded omissions', () => {
  const report = fixture();
  expect(readingOrderPlacement(report, 1)).toMatchObject({ recovered: 3, located: 2, unlocated: 1 });
  expect(readingOrderPlacement(report, 1).regions.map(item => item.number)).toEqual([1, 1, 3]);
  expect(readingOrderPlacement(report, 1, { limit: 2 })).toMatchObject({ recovered: 3, located: 1, unlocated: 2 });
  expect(report.pages[0].logicalBlocks).toHaveLength(3);
});
it('distinguishes missing sequence from recovered text without valid matching geometry', () => {
  const report = fixture(); report.pages[0].blocks = [{ key: 'not-a-match', quad }, { key: 'a', quad: [[NaN, 0], ...quad.slice(1)] }];
  expect(readingOrderPlacement(report, 1)).toMatchObject({ recovered: 3, located: 0, unlocated: 3, regions: [] });
  report.pages[0].logicalBlocks = [];
  expect(readingOrderPlacement(report, 1)).toMatchObject({ recovered: 0, located: 0, unlocated: 0 });
});
it('preserves unsafe Form-XObject scope without discarding recovered text', () => {
  const report = fixture(); report.limitations = ['Form XObjects']; report.checks = [{ evidence: ['Form XObjects'] }];
  expect(readingOrderPlacement(report, 1)).toMatchObject({ unsafe: true, recovered: 3, located: 0, unlocated: 3, regions: [] });
});
