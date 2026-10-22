import { it, expect } from 'vitest';
import { inspectFigureDescriptions } from '../src/engine/figure-descriptions.js';
const quad = (x, y, w = 250, h = 20) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const figure = (id = 'f', extra = {}) => ({ id, page: 1, tagged: true, status: 'present', alt: 'Flood water on the coast', quads: [quad(10, 30, 250, 260)], ...extra });
const caption = (id, x, y, extra = {}) => ({ id, text: `Figure ${id}. Coastal flooding`, quad: quad(x, y), ...extra });
const inspect = (blocks, figures = [figure()], page = {}) => inspectFigureDescriptions({ pages: [{ number: 1, blocks, ...page }], figureAlternatives: { items: figures } }).items;
it('uses edge distance and horizontal alignment instead of a different column’s closer vertical centre', () => {
  const [item] = inspect([caption(1, 10, 320), caption(2, 330, 150)]);
  expect(item.context).toMatchObject({ blockIds: [1], text: 'Figure 1. Coastal flooding', method: 'bounded-spatial-caption-v2' });
});
it('abstains for distant, overlapping, missing, malformed and unsafe geometry, even with only one caption', () => {
  expect(inspect([caption(1, 10, 500)])[0]).toMatchObject({ context: null, contextStatus: 'no-nearby-caption' });
  expect(inspect([caption(1, 10, 100)])[0].context).toBeNull();
  for (const extra of [{ quads: [] }, { quads: [[[NaN, 2]]] }, { status: 'uncertain' }]) expect(inspect([caption(1, 10, 320)], [figure('f', extra)])[0].context).toBeNull();
  for (const page of [{ rotation: 90 }, { formXObjectInvocations: 1 }]) expect(inspect([caption(1, 10, 320)], [figure()], page)[0].context).toBeNull();
  expect(inspect([caption(1, 10, 320, { locationSafe: false })])[0].context).toBeNull();
});
it('keeps safe direct-page caption geometry on a mixed Form page but rejects unresolved text', () => {
  const page = { formXObjectInvocations: 1, evidenceGeometryScoped: true };
  expect(inspect([caption(1, 10, 320, { locationSafe: true })], [figure()], page)[0].context.blockIds).toEqual([1]);
  expect(inspect([caption(1, 10, 320)], [figure()], page)[0].context).toBeNull();
});
it('abstains when captions compete or a caption could belong to two figures, including one without alt text', () => {
  expect(inspect([caption(1, 10, 320), caption(2, 10, 330)])[0]).toMatchObject({ context: null, contextStatus: 'ambiguous-caption' });
  const [item] = inspect([caption(1, 10, 320)], [figure(), figure('other', { alt: null, quads: [quad(10, 350, 250, 100)] })]);
  expect(item).toMatchObject({ context: null, contextStatus: 'shared-caption' });
});
it('joins bounded following caption lines only with the same marked-content identity', () => {
  const [item] = inspect([caption(1, 10, 320, { key: '1:2' }),
    { id: 3, key: '1:2', text: 'after the winter storms', quad: quad(10, 295) },
    { id: 4, key: '1:3', text: 'Unrelated body text', quad: quad(10, 270) },
    { id: 5, key: '1:2', text: 'Distant text with reused identity', quad: quad(10, 100) }]);
  expect(item.context).toMatchObject({ blockIds: [1, 3], text: 'Figure 1. Coastal flooding after the winter storms' });
});
