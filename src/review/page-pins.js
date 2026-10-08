import { targetQuads } from '../evidence/geometry.js';

const targetsOf = item => item.members ? item.members.flatMap(member => member.targets || []) : item.targets || [];

/**
 * Presentation only: place numbered fix-list entries on pages, one pin per entry per page at the union of its
 * located regions. Entries without a trustworthy location are returned separately rather than given invented pins.
 */
export function pagePins(entries, report) {
  const pages = new Map(), unlocated = [];
  for (const entry of entries) {
    const byPage = new Map();
    for (const target of targetsOf(entry.item)) {
      const quads = targetQuads(report, target);
      if (!quads.length) continue;
      byPage.set(target.page, [...(byPage.get(target.page) || []), ...quads]);
    }
    if (!byPage.size) { unlocated.push(entry); continue; }
    for (const [page, quads] of byPage) pages.set(page, [...(pages.get(page) || []), { ...entry, quads }]);
  }
  return {
    pages: [...pages].sort(([a], [b]) => a - b).map(([page, pins]) => ({ page, pins: pins.sort((a, b) => a.number - b.number) })),
    unlocated,
  };
}
