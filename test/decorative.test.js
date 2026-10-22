import { expect, it } from 'vitest';
import { judgeDecorative } from '../src/engine/decorative.js';

// A4-ish page; one decorative item per case, with optional text blocks (quad centres decide what sits inside).
const block = (text, x, y, role = null) => ({ text, role, quad: [[x, y], [x + 40, y], [x + 40, y + 10], [x, y + 10]] });
const judge = (item, blocks = [], extra = {}) => judgeDecorative({ pages: [{ number: 1, view: [0, 0, 600, 800], blocks, decorativeItems: [item], ...extra }] }).items[0];

it('calls thin rules, small ornaments, simple boxes and full-page backgrounds fine as decoration', () => {
  expect(judge({ images: 0, paths: 1, box: [50, 700, 550, 702] })).toMatchObject({ kind: 'decoration', reason: 'a thin line or rule' });
  expect(judge({ images: 1, paths: 0, box: [50, 50, 60, 60] })).toMatchObject({ kind: 'decoration', reason: 'a small ornament or icon' });
  expect(judge({ images: 0, paths: 2, box: [50, 300, 300, 500] })).toMatchObject({ kind: 'decoration', reason: 'a simple shape such as a box or panel' });
  expect(judge({ images: 1, paths: 0, box: [0, 0, 600, 800] })).toMatchObject({ kind: 'decoration', reason: 'a background behind the page' });
});
it('calls a graphic repeated on most pages a running element', () => {
  const pages = [1, 2, 3, 4].map(number => ({ number, view: [0, 0, 600, 800], blocks: [], decorativeItems: [{ images: 1, paths: 0, box: [40, 740, 200, 780] }] }));
  expect(judgeDecorative({ pages }).items.every(item => item.kind === 'decoration' && /repeats on 4 pages/.test(item.reason))).toBe(true);
});
it('calls a large graphic beside a figure or map caption content, even when it covers most of the page', () => {
  const caption = [block('Map 1. Sargassum seaweed spread', 60, 760)];
  expect(judge({ images: 1, paths: 0, box: [40, 100, 560, 650] }, caption).kind).toBe('content');
  expect(judge({ images: 0, paths: 400, box: [40, 100, 560, 500] }, caption).kind).toBe('content');
});
it('calls a box behind text decoration, even on a page with a caption', () => {
  const lines = Array.from({ length: 12 }, (_, i) => block('Wildfires are a growing risk in many regions this decade', 60, 320 + i * 12));
  expect(judge({ images: 0, paths: 13, box: [50, 300, 550, 480] }, [...lines, block('Figure 2.15. Interface area', 60, 200)]))
    .toMatchObject({ kind: 'decoration', reason: 'a panel or box behind text' });
});
it('calls shading around tagged table cells decoration, and stays unsure about numbers among shapes', () => {
  const cells = [block('24', 100, 320, 'TD'), block('53%', 200, 320, 'TD')];
  expect(judge({ images: 0, paths: 12, box: [50, 300, 550, 480] }, cells).reason).toBe('borders or shading around table cells');
  const numbers = [block('24', 100, 320), block('53%', 200, 320)];
  expect(judge({ images: 0, paths: 12, box: [50, 300, 550, 480] }, numbers).kind).toBe('unclear');
});
