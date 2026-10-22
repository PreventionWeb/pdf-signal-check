const extent = quad => {
  const xs = quad.map(([x]) => x), ys = quad.map(([, y]) => y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
};
/**
 * A thin line that sits within a line of text and runs along it: a link underline or strikethrough. These are part of the
 * text's styling, not graphics anyone needs to label, so they are left out of "unlabelled graphics" (a common false flag).
 */
export function isTextDecoration(graphic, blocks, limits = { maxThickness: 2.5, slack: 4, cover: 0.8 }) {
  if (!graphic.quad) return false;
  const line = extent(graphic.quad), width = line.maxX - line.minX;
  if (line.maxY - line.minY > limits.maxThickness || width < 4) return false;
  let covered = 0;
  for (const block of blocks || []) {
    if (!block.quad || !String(block.text || '').trim()) continue;
    const text = extent(block.quad);
    if (line.minY < text.minY - limits.slack || line.maxY > text.maxY + limits.slack) continue;
    covered += Math.max(0, Math.min(line.maxX, text.maxX) - Math.max(line.minX, text.minX));
  }
  return covered >= width * limits.cover;
}

/**
 * A background for text: a drawn shape with sentence-length text inside it, or a picture with a lot of text drawn over it
 * (the same 400-letter bar the decoration judgement uses for pictures behind text).
 */
export function isTextPanel(graphic, blocks, limits = { minLetters: 120, minImageLetters: 400, minAverage: 20 }) {
  if (!graphic.quad || !['path', 'image'].includes(graphic.kind)) return false;
  const box = extent(graphic.quad);
  const inside = (blocks || []).filter(block => block.quad && String(block.text || '').trim() && (() => {
    const text = extent(block.quad);
    return text.minX >= box.minX - 1 && text.maxX <= box.maxX + 1 && text.minY >= box.minY - 1 && text.maxY <= box.maxY + 1;
  })());
  const letters = inside.reduce((sum, block) => sum + (block.text.match(/\p{L}/gu) || []).length, 0);
  return inside.length > 0 && letters >= (graphic.kind === 'image' ? limits.minImageLetters : limits.minLetters) && letters / inside.length >= limits.minAverage;
}

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
      if (item) { if (graphic.quad && item.quads.length < 64) item.quads.push(graphic.quad); }
      else if (!isTextDecoration(graphic, page.blocks)) unknown.push(graphic);
    }
    // Hairline rules (header and footer lines, dividers) and drawn panels behind sentences of text (boxes, bands) are page
    // styling; a chart or diagram has other shapes, or only short labels inside it. Pictures need far more text over them to count as a background.
    unknown.splice(0, unknown.length, ...unknown.filter(graphic => !isTextPanel(graphic, page.blocks)));
    const thin = graphic => { if (!graphic.quad) return false; const box = extent(graphic.quad), w = box.maxX - box.minX, h = box.maxY - box.minY; return Math.min(w, h) <= 2.5 && Math.max(w, h) >= 20; };
    if (unknown.length && !unknown.every(thin)) items.push({ id: `${page.number}:unclassified`, page: page.number, node: null,
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
