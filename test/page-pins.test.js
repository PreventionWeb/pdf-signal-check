import { expect, it } from 'vitest';
import { pagePins } from '../src/review/page-pins.js';

const quad = (x, y) => [[x, y], [x + 10, y], [x + 10, y + 10], [x, y + 10]];
const report = { checks: [], pages: [{ number: 1, blocks: [] }, { number: 2, blocks: [] }] };

it('places one pin per entry per page and never invents a location', () => {
  const entries = [
    { number: 1, item: { targets: [{ page: 1, quads: [quad(0, 0)] }, { page: 1, quads: [quad(50, 50)] }, { page: 2, quads: [quad(5, 5)] }] } },
    { number: 2, item: { members: [{ targets: [{ page: 2, quads: [quad(20, 20)] }] }] } },
    { number: 3, item: { targets: [] } },
    { number: 4, item: { targets: [{ page: 1 }] } },
  ];
  const { pages, unlocated } = pagePins(entries, report);
  expect(pages.map(page => [page.page, page.pins.map(pin => pin.number)])).toEqual([[1, [1]], [2, [1, 2]]]);
  expect(pages[0].pins[0].quads).toHaveLength(2);
  expect(unlocated.map(entry => entry.number)).toEqual([3, 4]);
});
