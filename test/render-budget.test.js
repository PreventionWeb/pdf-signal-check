import { afterEach, expect, it, vi } from 'vitest';
import { EvidenceCropService } from '../src/evidence/crops.js';
import { PreviewSession } from '../src/evidence/preview-session.js';
import { boundedRenderScale, RENDER_BUDGET } from '../src/evidence/render-budget.js';

afterEach(() => vi.unstubAllGlobals());

function renderer(width, height, rotated = false) {
  const allocations = [];
  const canvas = () => ({ width: 0, height: 0, getContext() { return { canvas: this, drawImage() {} }; }, toBlob(done) { done(new Blob(['image'])); } });
  vi.stubGlobal('document', { createElement: canvas });
  vi.stubGlobal('devicePixelRatio', 2);
  const page = {
    getViewport: ({ scale }) => ({ width: width * scale, height: height * scale,
      transform: rotated ? [0, scale, scale, 0, 0, 0] : [scale, 0, 0, -scale, 0, height * scale] }),
    render({ canvasContext, viewport }) {
      allocations.push({ width: canvasContext.canvas.width, height: canvasContext.canvas.height, viewport });
      return { promise: Promise.resolve() };
    },
    cleanup() {},
  };
  return { allocations, canvas, doc: { numPages: 1, getPage: async () => page } };
}

it.each([
  ['tall', 450, 14_400, false],
  ['wide and rotated', 14_400, 450, true],
  ['large UserUnit', 144_000, 144_000, false],
])('bounds every evidence renderer for a %s page and keeps page-pin geometry aligned', async (_, width, height, rotated) => {
  const { allocations, canvas, doc } = renderer(width, height, rotated);
  const service = new EvidenceCropService({}, { checks: [], pages: [] });
  service.doc = doc;
  const quad = [[10, 20], [30, 20], [30, 40], [10, 40]];
  const pinned = await service.renderPage(1, [[quad]]);
  const viewport = allocations[0].viewport, s = viewport.transform[rotated ? 1 : 0];
  expect(pinned.boxes[0].x * pinned.width).toBeCloseTo((rotated ? 20 : 10) * s);
  expect(pinned.boxes[0].y * pinned.height).toBeCloseTo(rotated ? 10 * s : viewport.height - 40 * s);
  await service.crop({ page: 1, contextPage: true });

  const preview = Object.assign(Object.create(PreviewSession.prototype), {
    doc, epoch: 0, pageNumber: 1, zoom: { value: '2' }, scroller: { clientWidth: 1200 },
    canvas: canvas(), sheet: { style: {} }, svg: { setAttribute() {} }, counter: {}, previous: {}, next: {},
    message: {}, selectionMessage: null, mode: { value: 'none' }, draw() {},
  });
  await preview.render();
  expect(allocations).toHaveLength(3);
  for (const allocation of allocations) {
    expect(allocation.width).toBeGreaterThan(0);
    expect(allocation.height).toBeGreaterThan(0);
    expect(Math.max(allocation.width, allocation.height)).toBeLessThanOrEqual(RENDER_BUDGET.maxSide);
    expect(allocation.width * allocation.height).toBeLessThanOrEqual(RENDER_BUDGET.maxPixels);
  }
  await service.destroy();
});

it.each([[0, 100], [NaN, 100], [100, Infinity], [-10, 100]])('rejects invalid page dimensions before canvas allocation (%s × %s)', (width, height) => {
  expect(() => boundedRenderScale(width, height, 1)).toThrow(/invalid dimensions/);
});
