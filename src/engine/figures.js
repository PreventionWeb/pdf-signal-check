/** Inspect declared Figure tags and /Alt presence, without interpreting pixels or judging description quality. */
export function inspectFigureAlternatives(structure, pages) {
  const byKey = new Map(), items = [], known = new Set();
  for (const node of structure.nodes.filter(node => node.role === 'Figure')) {
    const keys = [], pending = [node];
    while (pending.length) {
      const current = pending.pop();
      keys.push(...current.contentKeys);
      pending.push(...current.children);
    }
    const alt = node.alt?.trim() || null;
    const pageNumbers = [...new Set(keys.map(key => Number(key.split(':')[0])))];
    if (!pageNumbers.length && node.page) pageNumbers.push(node.page);
    for (const pageNumber of pageNumbers) {
      const pageKeys = keys.filter(key => key.startsWith(`${pageNumber}:`));
      const id = `${pageNumber}:${node.ref}`;
      if (known.has(id)) continue;
      known.add(id);
      const item = { id, page: pageNumber, node: node.ref, keys: pageKeys, alt,
        status: !alt ? 'requires-review' : structure.errors.length ? 'uncertain' : 'present',
        tagged: true, quads: [] };
      items.push(item);
      for (const key of pageKeys) {
        // Ambiguous nested Figure ownership cannot establish one description for the painted content.
        if (byKey.has(key)) {
          const previous = byKey.get(key);
          if (previous?.status === 'present') previous.status = 'uncertain';
          if (item.status === 'present') item.status = 'uncertain';
          byKey.set(key, null);
        }
        else byKey.set(key, item);
      }
    }
  }
  for (const page of pages) {
    const unknown = [];
    for (const graphic of page.graphics || []) {
      const item = byKey.get(graphic.key);
      if (item) { if (graphic.quad && item.quads.length < 16) item.quads.push(graphic.quad); }
      else unknown.push(graphic);
    }
    if (unknown.length) items.push({ id: `${page.number}:unclassified`, page: page.number, node: null,
      keys: [...new Set(unknown.map(graphic => graphic.key).filter(Boolean))], alt: null,
      status: 'uncertain', tagged: false, quads: unknown.filter(graphic => graphic.quad).slice(0,16).map(graphic => graphic.quad) });
  }
  const decorativeItems = pages.filter(page => page.decorativeGraphics?.length).map(page => ({
    id: `${page.number}:decorative`, page: page.number, tagged: false, decorative: true,
    alt: null, status: 'uncertain', keys: [],
    quads: page.decorativeGraphics.filter(graphic => graphic.quad).map(graphic => graphic.quad),
  }));
  return { items, decorativeItems, meaningAssessed: false, complete: true };
}
