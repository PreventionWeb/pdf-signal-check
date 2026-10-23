import { expect, it } from 'vitest';
import { layoutPinMarkers } from '../src/review/page-pin-layout.js';
const layout = (ys, height = 800) => layoutPinMarkers(ys.map((_, i) => ({ number: i + 1 })), ys.map(y => ({ x: .2, y })), height);
function separated(markers, height) {
  markers.forEach((marker, i) => {
    expect(marker.y).toBeGreaterThanOrEqual(22);
    expect(marker.y).toBeLessThanOrEqual(height - 22);
    if (i) expect(marker.y - markers[i - 1].y).toBeGreaterThanOrEqual(44);
  });
}
it('separates nearby pins at page edges without moving source anchors', () => {
  for (const ys of [[0, .001, .002], [.99, .999, 1], [.4, .401, .402]]) {
    const result = layout(ys);
    separated(result, 800);
    expect(result.flatMap(group => group.items.map(item => item.box.y))).toEqual(ys);
    expect(result).toHaveLength(3);
  }
});
it('groups dense runs while preserving every issue and its source box', () => {
  const result = layout([.1, .101, .102, .103, .8]);
  expect(result.map(group => group.items.length)).toEqual([4, 1]);
  expect(result.flatMap(group => group.items.map(item => item.pin.number))).toEqual([1, 2, 3, 4, 5]);
  separated(result, 800);
});
it('bounds marker capacity on short pages and recalculates spacing when resized', () => {
  const ys = [0, .2, .4, .6, .8, 1];
  const compact = layout([0, .01, .9, 1], 100);
  separated(compact, 100);
  expect(compact).toHaveLength(2);
  expect(compact.flatMap(group => group.items)).toHaveLength(4);
  expect(layout(ys, 1000)).toHaveLength(6);
});
it('ignores unavailable boxes and invalid render sizes', () => {
  expect(layoutPinMarkers([{ number: 1 }], [], 800)).toEqual([]);
  expect(layout([.5], NaN)).toEqual([]);
  expect(layoutPinMarkers([{ number: 1 }], [{ y: NaN }], 800)).toEqual([]);
});
