/**
 * Contents lists against the pages they point to. Rules find the printed-to-PDF page offset, entries whose heading is on a
 * different page, and contents lists that disagree with each other. Entries whose heading cannot be found word-for-word
 * are left for optional AI to compare with the headings on the expected page.
 */
export const CONTENTS_LIMITS = Object.freeze({ scanPages: 12, minEntries: 4, maxEntries: 80, headingsPerPage: 8, maxUnresolved: 24 });

const fold = text => String(text || '').normalize('NFKC').toLocaleLowerCase().replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const ENTRY = /^(.*?\p{L}.*?)[\s.·…_‧⋯-]*?\s(\d{1,3})$/u;
// Leading numbering ("2.1", "Chapter 3:", "A.") is not part of the heading wording.
const stripNumber = text => text.replace(/^(?:(?:chapter|part|section|annex|appendix)\s+)?(?:\d+(?:\.\d+)*[.):]?|[IVX]+[.):]|[A-Z][.)])\s+/i, '').trim();

/** Text lines on a page, top to bottom, from extracted fragments sharing a baseline. */
const lineCache = new WeakMap();
export function pageLines(page) {
  if (lineCache.has(page)) return lineCache.get(page);
  // Fragments are bucketed by rounded baseline; neighbouring buckets catch baselines that straddle a boundary.
  const lines = [], buckets = new Map();
  for (const block of page.blocks || []) {
    if (!block.text?.trim()) continue;
    const key = Math.round(block.y / 2.5);
    const line = [key, key - 1, key + 1].map(k => buckets.get(k)).find(item => item && Math.abs(item.y - block.y) < 2.5);
    if (line) { line.parts.push(block); line.height = Math.max(line.height, block.height || 0); }
    else { const created = { y: block.y, height: block.height || 0, parts: [block] }; lines.push(created); buckets.set(key, created); }
  }
  const result = lines.sort((a, b) => b.y - a.y).map(line => {
    const parts = line.parts.sort((a, b) => (a.transform?.[4] ?? 0) - (b.transform?.[4] ?? 0));
    return { text: parts.map(part => part.text).join(' ').replace(/\s+/g, ' ').trim(), y: line.y, height: line.height, blockIds: parts.map(part => part.id) };
  });
  lineCache.set(page, result);
  return result;
}

const LIST_HEADING = /^(list of|table of|contents|figures|tables|boxes|maps|annex(es)?|abbreviations)\b/i;
const CAPTION_ENTRY = /^(figure|fig\.|table|box|map|chart|graph|photo|infographic)\s*\d/i;
function contentsEntries(pages, total, limits) {
  const entries = [];
  for (const page of pages) {
    const lines = pageLines(page).map(line => ({ line, match: line.text.match(ENTRY) }));
    const found = [];
    lines.forEach(({ line, match }, i) => {
      if (!match || Number(match[2]) > total + 50) return;
      let text = match[1].replace(/[\s.·…_‧⋯-]+$/u, '').trim();
      // An entry that wraps: the line above has no page number, and the line above that was itself an entry.
      if (i >= 2 && !lines[i - 1].match && lines[i - 2].match && lines[i - 1].line.text.length < 120 && !LIST_HEADING.test(lines[i - 1].line.text)) text = `${lines[i - 1].line.text} ${text}`;
      text = stripNumber(text);
      if (text.split(/\s+/).length >= 2) found.push({ line, text, printed: Number(match[2]) });
    });
    if (found.length < limits.minEntries) continue;
    // A real contents list counts upwards; columns merged into one line do not.
    const rising = found.filter((entry, i) => i === 0 || entry.printed >= found[i - 1].printed).length;
    if (rising < found.length * 0.8) continue;
    for (const entry of found) if (entries.length < limits.maxEntries)
      entries.push({ contentsPage: page.number, text: entry.text, printed: entry.printed, blockIds: entry.line.blockIds });
  }
  return entries;
}

// A heading matches when its words equal the entry's; a body sentence that merely starts with them does not.
// Both sides are already folded (see prepared()).
const matches = (a, b) => Boolean(a && b && (a === b || (a.startsWith(b) && a.length <= b.length * 1.25)));
const prepared = text => fold(stripNumber(text));
/** Single lines and runs of up to three consecutive lines, so headings that wrap still match. */
const windows = lines => lines.flatMap((line, i) => [1, 2, 3].map(size => lines.slice(i, i + size)).filter(run => run.length)
  .map(run => run.map(item => item.text).join(' ')));

/** Headings on a page: tagged headings first, then lines set larger than the page's usual text. */
function headings(page, limits) {
  const lines = pageLines(page);
  const heights = lines.map(line => line.height).filter(Boolean).sort((a, b) => a - b);
  const body = heights[Math.floor((heights.length - 1) / 2)] || 0;
  const tagged = (page.logicalBlocks || []).filter(block => /^H[1-6]?$/.test(block.role || '')).map(block => block.text.replace(/\s+/g, ' ').trim());
  const large = [];
  // Large lines close together and of similar size form one wrapped heading, even with another column in between.
  for (const line of lines.filter(item => body && item.height >= body * 1.15 && /\p{L}{3}/u.test(item.text))) {
    const last = large.at(-1);
    if (last && last.y - line.y < line.height * 1.8 && Math.abs(last.height - line.height) < line.height * 0.2) { last.text += ` ${line.text}`; last.y = line.y; }
    else large.push({ text: line.text, y: line.y, height: line.height });
  }
  return [...new Set([...tagged, ...large.map(item => item.text)])].filter(text => text.length >= 4 && text.length <= 200).slice(0, limits.headingsPerPage);
}

export function inspectContents(report, limits = CONTENTS_LIMITS) {
  const pages = report.pages || [];
  const total = pages.length;
  const lists = contentsEntries(pages, total, limits);
  // Contents lists anywhere (chapter openers repeat parts of the main list) must agree with each other.
  const conflicts = [], seen = new Map();
  for (const entry of lists) {
    const key = fold(entry.text), earlier = seen.get(key);
    if (earlier && key.split(' ').length >= 4 && earlier.contentsPage !== entry.contentsPage && earlier.printed !== entry.printed && !conflicts.some(item => item.key === key))
      conflicts.push({ id: `contents:conflict:${key.slice(0, 60)}`, key, kind: 'contents-conflict', severity: 'concern', entry, other: earlier });
    if (!earlier) seen.set(key, entry);
  }
  const strip = items => items.map(({ key, ...item }) => item);
  // Page numbers are checked only against the main list near the front.
  const entries = lists.filter(entry => entry.contentsPage <= limits.scanPages);
  if (entries.length < limits.minEntries) return { status: conflicts.length ? 'requires-review' : 'not-found', entries: [], items: strip(conflicts) };
  const contentsPages = new Set(lists.map(entry => entry.contentsPage));
  const body = pages.filter(page => !contentsPages.has(page.number));
  // Lines are only candidates when they start with the entry's first word, which keeps long documents fast.
  const linesByPage = new Map(body.map(page => [page.number, windows(pageLines(page)).map(prepared)]));
  const headingsByPage = new Map(body.map(page => [page.number, headings(page, limits).map(prepared)]));
  // A heading block may run on into other text after extraction, so a heading that starts with the entry's words counts.
  const where = entry => {
    const wanted = prepared(entry.text);
    return body.filter(page => linesByPage.get(page.number).some(text => matches(text, wanted)) ||
      headingsByPage.get(page.number).some(text => matches(text, wanted) || text.startsWith(wanted))).map(page => page.number);
  };
  // The printed page number usually differs from the PDF page by a fixed offset (covers, roman-numbered front matter).
  const offsets = new Map();
  for (const entry of entries) {
    const found = where(entry);
    entry.found = found;
    if (found.length === 1) offsets.set(found[0] - entry.printed, (offsets.get(found[0] - entry.printed) || 0) + 1);
  }
  const [offset, support] = [...offsets].sort((a, b) => b[1] - a[1])[0] || [null, 0];
  // Too few entries line up with one offset: the list cannot be read reliably, so stay quiet.
  if (offset == null || support < 3 || support < entries.length * 0.4) return { status: conflicts.length ? 'requires-review' : 'unaligned', entries, items: strip(conflicts) };
  const items = strip(conflicts);
  for (const entry of entries) {
    const key = fold(entry.text);
    const expected = entry.printed + offset;
    if (entry.found.includes(expected)) continue;
    if (expected < 1 || expected > total) { items.push({ id: `contents:range:${key.slice(0, 60)}`, kind: 'contents-page', severity: 'concern', entry, expected, foundPage: null }); continue; }
    if (entry.found.length) {
      // Found on another page: the printed number is out of date. Prefer the nearest occurrence.
      const foundPage = [...entry.found].sort((a, b) => Math.abs(a - expected) - Math.abs(b - expected))[0];
      items.push({ id: `contents:page:${key.slice(0, 60)}`, kind: 'contents-page', severity: 'concern', entry, expected, foundPage });
      continue;
    }
    // Figure and table captions are often part of an image; a caption entry without a text match is not judged.
    if (CAPTION_ENTRY.test(entry.text)) continue;
    const page = pages.find(item => item.number === expected);
    if (items.filter(item => item.severity === 'unresolved').length < limits.maxUnresolved)
      items.push({ id: `contents:wording:${key.slice(0, 60)}`, kind: 'contents-wording', severity: 'unresolved', entry, expected, headings: headings(page, limits) });
  }
  return { status: items.length ? 'requires-review' : 'consistent', offset, support, entries: entries.length, items };
}
