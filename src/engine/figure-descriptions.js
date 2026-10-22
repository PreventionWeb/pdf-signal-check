/**
 * Image description triage. Rules flag descriptions that cannot be useful (authoring-tool placeholders, generic words,
 * file names, the same text on many images); a description with a caption is paired with it for optional AI comparison.
 * Nothing here judges whether a description is accurate, and nothing is suggested in its place.
 */
export const DESCRIPTION_LIMITS = Object.freeze({ contextCharacters: 400, duplicateMin: 3, captionMaxGap: 72, captionOverlap: 0.5, captionAmbiguityGap: 12 });

const GENERIC = /^(an? |the )?(image|picture|photo(graph)?|graphic|chart|graph|figure|diagram|map|logo|icon|illustration|img|infographic|table|placeholder)\s*\d*[.:]?$/i;
const FILE = /\.(png|jpe?g|gif|svg|tiff?|bmp|emf|wmf|ai|eps|psd|webp)$|^(img|dsc|image|screenshot|screen shot|picture)[\s_-]?\d+/i;
// Placeholders written by authoring tools (Microsoft Office's automatic alt text, empty brackets).
const AUTO = /description automatically generated|alt text was not generated|^\[[^\]]*\]$|^(no|none|null|undefined|alt|alt text|n\/a)$/i;
const CAPTION = /^\s*(figure|fig\.|map|chart|graph|diagram|infographic|table|box|photo|image)\s*\d+(?:\.\d+)*\s*(?:[.:–—-]|$)/i;
const fold = text => String(text || '').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const bounds = quads => {
  if (!Array.isArray(quads) || !quads.length || quads.some(q => !Array.isArray(q) || q.length !== 4 || q.some(p => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite)))) return null;
  const points = quads.flat(), xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const box = { left: Math.min(...xs), right: Math.max(...xs), bottom: Math.min(...ys), top: Math.max(...ys) };
  return box.right > box.left && box.top > box.bottom ? box : null;
};
const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) / Math.min(a.right - a.left, b.right - b.left);
const gap = (a, b) => a.top <= b.bottom ? b.bottom - a.top : b.top <= a.bottom ? a.bottom - b.top : null;

/** Spatial clues establish a bounded, mutually unique association, never caption identity. */
function captionContexts(figures, page, limits) {
  const result = new Map();
  const unsafe = !page || (page.rotation || 0) % 360 !== 0 ||
    (!page.evidenceGeometryScoped && page.formXObjectInvocations > 0);
  const boxes = new Map(figures.map(figure => [figure.id, !unsafe && figure.status !== 'uncertain' ? bounds(figure.quads) : null]));
  const captions = (page?.blocks || []).filter(block => CAPTION.test(block.text || '') &&
    block.locationSafe !== false && (!page.evidenceGeometryScoped || block.locationSafe === true))
    .map(block => ({ block, box: bounds(block.quad ? [block.quad] : []) })).filter(c => c.box);
  const pageHeight = page?.view ? Math.abs(page.view[3] - page.view[1]) : null;
  const maxGap = Math.min(limits.captionMaxGap, pageHeight > 0 ? pageHeight * 0.08 : limits.captionMaxGap);
  const options = new Map(figures.map(figure => {
    const box = boxes.get(figure.id);
    return [figure.id, box ? captions.map(c => ({ ...c, distance: gap(box, c.box) }))
      .filter(c => c.distance !== null && c.distance <= maxGap && overlap(box, c.box) >= limits.captionOverlap)
      .sort((a, b) => a.distance - b.distance) : []];
  }));
  const owners = new Map();
  for (const candidates of options.values()) for (const candidate of candidates) owners.set(candidate.block, (owners.get(candidate.block) || 0) + 1);
  for (const figure of figures) {
    const candidates = options.get(figure.id), best = candidates[0];
    let context = null, contextStatus = !boxes.get(figure.id) ? 'no-safe-figure-geometry' : !best ? 'no-nearby-caption' : 'paired';
    if (best) {
      if (candidates[1] && candidates[1].distance - best.distance <= limits.captionAmbiguityGap) contextStatus = 'ambiguous-caption';
      // A caption near two figures is not safe evidence for either description.
      else if (owners.get(best.block) > 1) contextStatus = 'shared-caption';
      else {
        // Join only bounded neighbouring lines with the same recovered marked-content identity.
        const height = best.box.top - best.box.bottom;
        const lines = [best.block, ...(best.block.key ? (page.blocks || []).filter(block => block !== best.block && block.key === best.block.key &&
          block.locationSafe !== false && (!page.evidenceGeometryScoped || block.locationSafe === true) && !CAPTION.test(block.text || '') && (() => {
            const box = bounds(block.quad ? [block.quad] : []);
            return box && overlap(best.box, box) >= limits.captionOverlap && box.top <= best.box.top &&
              best.box.bottom - box.top <= height * 3 && Math.abs((box.top - box.bottom) - height) <= height * 0.3;
          })()).sort((a, b) => bounds([b.quad]).top - bounds([a.quad]).top).slice(0, 3) : [])];
        const text = lines.map(block => block.text.trim()).join(' ').slice(0, limits.contextCharacters);
        context = { text, page: page.number, blockIds: lines.map(block => block.id), caption: text, method: 'bounded-spatial-caption-v2' };
      }
    }
    result.set(figure.id, { context, contextStatus });
  }
  return result;
}

export function inspectFigureDescriptions(report, limits = DESCRIPTION_LIMITS) {
  limits = { ...DESCRIPTION_LIMITS, ...limits };
  const figures = (report.figureAlternatives?.items || []).filter(item => item.tagged && item.alt?.trim());
  const counts = new Map();
  for (const figure of figures) counts.set(fold(figure.alt), (counts.get(fold(figure.alt)) || 0) + 1);
  const pages = new Map((report.pages || []).map(page => [page.number, page]));
  const contexts = new Map();
  for (const [number, page] of pages) {
    const pageFigures = (report.figureAlternatives?.items || []).filter(f => f.tagged && f.page === number);
    for (const [id, context] of captionContexts(pageFigures, page, limits)) contexts.set(id, context);
  }
  const items = figures.map(figure => {
    const alt = figure.alt.trim(), flags = [];
    const letters = (alt.match(/\p{L}/gu) || []).length;
    if (AUTO.test(alt)) flags.push('auto-generated');
    else if (GENERIC.test(alt) || letters < 4) flags.push('generic');
    if (FILE.test(alt)) flags.push('file-name');
    // The same description on several images (logos excepted, which are often repeated on purpose).
    if (counts.get(fold(alt)) >= limits.duplicateMin && !/\blogo\b/i.test(alt)) flags.push('duplicate');
    return { id: figure.id, page: figure.page, alt, flags, duplicates: counts.get(fold(alt)), ...(contexts.get(figure.id) || { context: null, contextStatus: 'no-safe-figure-geometry' }) };
  });
  return { method: 'description-rules-v2', described: figures.length, flagged: items.filter(item => item.flags.length).length, items };
}
