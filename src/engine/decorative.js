/**
 * A plain judgement on each graphic marked as decoration, from its shape, size, repetition and surroundings:
 * 'decoration' (probably fine), 'content' (probably carries information) or 'unclear'. Rules only; no pixels are analysed.
 */
const CAPTION = /^\s*(figure|fig\.|map|chart|graph|diagram|infographic)\s*\d+(?:\.\d+)*\s*(?:[.:–—-]|$)/i;
const centre = quad => quad ? [(quad[0][0] + quad[2][0]) / 2, (quad[0][1] + quad[2][1]) / 2] : null;
const inside = (point, box) => point && point[0] >= box[0] && point[0] <= box[2] && point[1] >= box[1] && point[1] <= box[3];

export function judgeDecorative(report) {
  const pages = report.pages || [];
  // The same box on many pages is a running element: a logo, header band or footer rule.
  const signature = item => `${item.images ? 'i' : 'p'}:${item.box.map(value => Math.round(value / 6)).join(',')}`;
  const repeats = new Map();
  for (const page of pages) for (const sig of new Set((page.decorativeItems || []).map(signature))) repeats.set(sig, (repeats.get(sig) || 0) + 1);
  const items = [];
  for (const page of pages) {
    const [x0 = 0, y0 = 0, x1 = 612, y1 = 792] = page.view || [];
    const pageArea = Math.abs((x1 - x0) * (y1 - y0)) || 1;
    const captioned = (page.blocks || []).some(block => CAPTION.test(block.text) && block.text.length <= 240);
    for (const item of page.decorativeItems || []) {
      const [bx0, by0, bx1, by1] = item.box;
      const width = Math.abs(bx1 - bx0), height = Math.abs(by1 - by0), share = width * height / pageArea;
      const thin = Math.min(width, height), long = Math.max(width, height);
      const repeated = repeats.get(signature(item)) || 0;
      const within = (page.blocks || []).filter(block => block.text?.trim() && inside(centre(block.quad), item.box));
      const prose = within.filter(block => (block.text.match(/\p{L}/gu) || []).length >= 25).length;
      // Extracted text comes in line fragments; the amount of text inside says "text box" more reliably than sentence counts.
      const letters = within.reduce((sum, block) => sum + (block.text.match(/\p{L}/gu) || []).length, 0);
      const numbers = within.filter(block => /\d/.test(block.text) && block.text.trim().length <= 16).length;
      const tableCells = within.some(block => /^(TD|TH|Table|TR)$/.test(block.role || ''));
      const verdict = (kind, reason) => ({ kind, reason });
      // Order matters: shape and repetition first, then a caption (which outweighs size), then text behind or inside.
      const judgement =
        thin <= 4 || (long / Math.max(thin, 0.1) >= 30 && thin <= 12) ? verdict('decoration', 'a thin line or rule')
        : repeated >= 3 && repeated >= pages.length * 0.3 ? verdict('decoration', `repeats on ${repeated} pages, like a logo, header or footer band`)
        : share < 0.004 ? verdict('decoration', 'a small ornament or icon')
        // A very dense drawing beside a caption is a chart or illustration even when a table sits inside it.
        : captioned && !item.images && item.paths >= 100 && share >= 0.08 ? verdict('content', 'a dense drawing beside a figure or map caption, like a chart or illustration')
        : tableCells ? verdict('decoration', 'borders or shading around table cells')
        // A text box is a few simple shapes behind prose; maps and diagrams also hold some text but are images or many shapes.
        : (prose >= 2 || letters >= 400) && !item.images && (item.paths <= 8 || !captioned || letters >= 400) ? verdict('decoration', 'a panel or box behind text')
        : captioned && share >= 0.08 && (item.images || item.paths >= 5) ? verdict('content', item.images ? 'a large picture beside a figure or map caption' : 'many shapes beside a figure or map caption, like a chart or map')
        : share >= 0.6 ? verdict('decoration', 'a background behind the page')
        // A picture with plenty of text drawn on top of it is a background for that text.
        : item.images && letters >= 400 ? verdict('decoration', 'a picture behind text, like a background')
        : !item.images && item.paths <= 4 ? verdict('decoration', 'a simple shape such as a box or panel')
        // Numbers among many shapes could be a chart or a table's shading: the rules can't tell which.
        : !item.images && item.paths >= 10 && numbers >= 2 && share >= 0.03 ? verdict('unclear', 'many shapes with numbers: could be a chart, or shading in a table')
        : item.images && share >= 0.08 ? verdict('unclear', 'a large picture with no caption')
        : verdict('unclear', 'a graphic the rules can’t place');
      items.push({ page: page.number, ...judgement, box: item.box, share: Math.round(share * 1000) / 1000, paths: item.paths, images: item.images, letters,
        quad: [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]] });
    }
  }
  const count = kind => items.filter(item => item.kind === kind).length;
  return { method: 'decorative-rules-v1', items, decoration: count('decoration'), content: count('content'), unclear: count('unclear') };
}
