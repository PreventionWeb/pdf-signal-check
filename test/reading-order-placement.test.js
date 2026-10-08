import { expect, it } from 'vitest';
import { readingOrderPlacement } from '../src/evidence/reading-order-placement.js';
import { targetQuads } from '../src/evidence/geometry.js';
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
it('limits scope restrictions to affected pages for new reports, including direct crop targets', () => {
  const report = fixture(); report.limitations = ['Form XObjects']; report.checks = [{ evidence: ['Form XObjects'] }];
  report.pages[0].formXObjectInvocations = 0;
  report.pages.push({ ...structuredClone(report.pages[0]), number: 2, formXObjectInvocations: 1 });
  expect(readingOrderPlacement(report, 1)).toMatchObject({ unsafe: false, located: 2 });
  expect(readingOrderPlacement(report, 2)).toMatchObject({ unsafe: true, located: 0, recovered: 3 });
  expect(targetQuads(report, { page: 1, quads: [quad] })).toEqual([quad]);
  expect(targetQuads(report, { page: 2, quads: [quad] })).toEqual([]);
});
it('shows safe entries on mixed pages with one label per entry and original numbering gaps', () => {
  const report=fixture(); const page=report.pages[0];
  page.evidenceGeometryScoped=true; page.formXObjectInvocations=1;
  page.blocks.forEach(block=>{block.locationSafe=block.key==='a';});
  const result=readingOrderPlacement(report,1);
  expect(result).toMatchObject({unsafe:false,located:1,unlocated:2});
  expect(result.regions.map(r=>r.label)).toEqual([true,false]);
  expect(result.regions.map(r=>r.number)).toEqual([1,1]);
  expect(targetQuads(report,{page:1,keys:['c']})).toEqual([]);
});
