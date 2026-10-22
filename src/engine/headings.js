/**
 * Heading tagging faults that rules can find without AI (found in every tagged report in the October 2026 corpus spike):
 * one heading split across two heading tags, so a screen reader announces two headings; and chart or diagram labels tagged
 * as headings, so they crowd the heading list people navigate by.
 */
export const HEADING_LIMITS = Object.freeze({ splitGap: 1.8, labelWords: 6, labelSize: 0.85, labelsPerPage: 2, maxReported: 40 });

const CONNECTOR = /(?:\b(?:of|and|in|the|for|to|at|on|with|a|an|by|from|or|its|their|our|into|across)|[&,–—-])$/i;
const extent = quad => {
  const ys = quad.map(([, y]) => y), xs = quad.map(([x]) => x);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
};
const median = values => { const sorted = [...values].sort((a, b) => a - b); return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null; };

/** Tagged elements on a page in reading order: consecutive blocks with the same owner node form one element. */
function elements(page) {
  const byKey = new Map((page.blocks || []).filter(block => block.key).map(block => [block.key, block]));
  const list = [];
  for (const block of page.logicalBlocks || []) {
    const last = list[list.length - 1];
    const physical = byKey.get(block.key);
    if (last && block.node && last.node === block.node) {
      last.text += ` ${block.text}`;
      if (physical) last.blocks.push(physical);
    } else list.push({ node: block.node, role: block.role, text: block.text, blocks: physical ? [physical] : [] });
  }
  for (const element of list) {
    element.text = element.text.replace(/\s+/g, ' ').trim();
    const boxes = element.blocks.filter(block => block.quad).map(block => extent(block.quad));
    element.box = boxes.length ? { minX: Math.min(...boxes.map(b => b.minX)), maxX: Math.max(...boxes.map(b => b.maxX)),
      minY: Math.min(...boxes.map(b => b.minY)), maxY: Math.max(...boxes.map(b => b.maxY)) } : null;
    element.size = median(boxes.map(b => b.maxY - b.minY));
    element.heading = /^H[1-6]?$/.test(element.role || '');
  }
  return list;
}

export function inspectHeadings(report, limits = HEADING_LIMITS) {
  const split = [], labels = [];
  for (const page of report.pages || []) {
    const list = elements(page);
    // One heading in two tags: two headings in a row at the same level, close together, the first visibly unfinished.
    for (let i = 0; i + 1 < list.length; i++) {
      const a = list[i], b = list[i + 1];
      if (!a.heading || !b.heading || a.role !== b.role || !a.box || !b.box || !a.size) continue;
      const gap = Math.min(Math.abs(a.box.minY - b.box.maxY), Math.abs(b.box.minY - a.box.maxY));
      const unfinished = !/[.:!?]$/.test(a.text) && (CONNECTOR.test(a.text) || /^\p{Ll}/u.test(b.text));
      if (gap <= a.size * limits.splitGap && unfinished)
        split.push({ page: page.number, a: a.text, b: b.text, blockIds: [...a.blocks, ...b.blocks].map(block => block.id) });
    }
    // Chart labels as headings: short headings set smaller than the page's body text, more than one on the page.
    const body = median(list.filter(element => !element.heading && element.size && element.text.length >= 20).map(element => element.size));
    if (!body) continue;
    const small = list.filter(element => element.heading && element.size && element.size < body * limits.labelSize
      && element.text.split(/\s+/).length <= limits.labelWords);
    if (small.length >= limits.labelsPerPage) labels.push({ page: page.number, texts: small.map(element => element.text),
      blockIds: small.flatMap(element => element.blocks.map(block => block.id)) });
  }
  const items = [];
  if (split.length) items.push({ id: 'headings:split', kind: 'heading-split', severity: 'minor', pairs: split.slice(0, limits.maxReported), total: split.length });
  if (labels.length) items.push({ id: 'headings:labels', kind: 'heading-label', severity: 'concern', pages: labels.slice(0, limits.maxReported), total: labels.reduce((sum, page) => sum + page.texts.length, 0) });
  return items;
}
