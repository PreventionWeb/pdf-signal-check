/**
 * Image description triage. Rules flag descriptions that cannot be useful (authoring-tool placeholders, generic words,
 * file names, the same text on many images); a description with a caption is paired with it for optional AI comparison.
 * Nothing here judges whether a description is accurate, and nothing is suggested in its place.
 */
export const DESCRIPTION_LIMITS = Object.freeze({ contextCharacters: 400, duplicateMin: 3 });

const GENERIC = /^(an? |the )?(image|picture|photo(graph)?|graphic|chart|graph|figure|diagram|map|logo|icon|illustration|img|infographic|table|placeholder)\s*\d*[.:]?$/i;
const FILE = /\.(png|jpe?g|gif|svg|tiff?|bmp|emf|wmf|ai|eps|psd|webp)$|^(img|dsc|image|screenshot|screen shot|picture)[\s_-]?\d+/i;
// Placeholders written by authoring tools (Microsoft Office's automatic alt text, empty brackets).
const AUTO = /description automatically generated|alt text was not generated|^\[[^\]]*\]$|^(no|none|null|undefined|alt|alt text|n\/a)$/i;
const CAPTION = /^\s*(figure|fig\.|map|chart|graph|diagram|infographic|table|box|photo|image)\s*\d+(?:\.\d+)*\s*(?:[.:–—-]|$)/i;
const fold = text => String(text || '').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const centre = quads => {
  const points = (quads || []).flat().filter(point => Array.isArray(point));
  return points.length ? points.reduce((sum, [, y]) => sum + y, 0) / points.length : null;
};
const blockY = block => block.quad ? (block.quad[0][1] + block.quad[2][1]) / 2 : block.y;

/**
 * The figure's caption: the nearest caption on its page, or the only one when the figure's position is unknown.
 * Nearby body text is not used: an accurate photo description rarely shares words with the text beside it.
 */
function context(figure, page, limits) {
  const blocks = (page?.blocks || []).filter(block => block.text?.trim());
  const y = centre(figure.quads);
  const captions = blocks.filter(block => CAPTION.test(block.text));
  if (!captions.length || (y == null && captions.length > 1)) return null;
  const caption = [...captions].sort((a, b) => (y == null ? 0 : Math.abs(blockY(a) - y) - Math.abs(blockY(b) - y)))[0];
  return { text: caption.text.trim().slice(0, limits.contextCharacters), page: page.number, blockIds: [caption.id], caption: caption.text.trim() };
}

export function inspectFigureDescriptions(report, limits = DESCRIPTION_LIMITS) {
  const figures = (report.figureAlternatives?.items || []).filter(item => item.tagged && item.alt?.trim());
  const counts = new Map();
  for (const figure of figures) counts.set(fold(figure.alt), (counts.get(fold(figure.alt)) || 0) + 1);
  const pages = new Map((report.pages || []).map(page => [page.number, page]));
  const items = figures.map(figure => {
    const alt = figure.alt.trim(), flags = [];
    const letters = (alt.match(/\p{L}/gu) || []).length;
    if (AUTO.test(alt)) flags.push('auto-generated');
    else if (GENERIC.test(alt) || letters < 4) flags.push('generic');
    if (FILE.test(alt)) flags.push('file-name');
    // The same description on several images (logos excepted, which are often repeated on purpose).
    if (counts.get(fold(alt)) >= limits.duplicateMin && !/\blogo\b/i.test(alt)) flags.push('duplicate');
    return { id: figure.id, page: figure.page, alt, flags, duplicates: counts.get(fold(alt)), context: context(figure, pages.get(figure.page), limits) };
  });
  return { method: 'description-rules-v1', described: figures.length, flagged: items.filter(item => item.flags.length).length, items };
}
