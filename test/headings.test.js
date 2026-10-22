import { describe, expect, it } from 'vitest';
import { inspectHeadings } from '../src/engine/headings.js';

const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const page = (logical, blocks) => ({ number: 1, logicalBlocks: logical, blocks });

describe('heading tagging faults', () => {
  it('flags one heading split across two heading tags, not one heading wrapped inside a single tag', () => {
    const blocks = [{ id: 0, key: '1:0', quad: rect(50, 700, 300, 720) }, { id: 1, key: '1:1', quad: rect(50, 676, 260, 696) }, { id: 2, key: '1:2', quad: rect(50, 600, 500, 610) }];
    const split = page([{ key: '1:0', role: 'H1', text: 'Harmful information', node: 'a' }, { key: '1:1', role: 'H1', text: 'in disasters', node: 'b' },
      { key: '1:2', role: 'P', text: 'Body text that follows the heading on this page.', node: 'c' }], blocks);
    expect(inspectHeadings({ pages: [split] })[0]).toMatchObject({ kind: 'heading-split', total: 1, pairs: [{ a: 'Harmful information', b: 'in disasters' }] });
    const wrapped = page(split.logicalBlocks.map(block => block.node === 'b' ? { ...block, node: 'a' } : block), blocks);
    expect(inspectHeadings({ pages: [wrapped] })).toEqual([]);
  });
  it('does not join two finished headings', () => {
    const blocks = [{ id: 0, key: '1:0', quad: rect(50, 700, 300, 720) }, { id: 1, key: '1:1', quad: rect(50, 676, 260, 696) }];
    const two = page([{ key: '1:0', role: 'H2', text: 'Executive summary', node: 'a' }, { key: '1:1', role: 'H2', text: 'Key findings', node: 'b' }], blocks);
    expect(inspectHeadings({ pages: [two] })).toEqual([]);
  });
});
