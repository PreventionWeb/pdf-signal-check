/**
 * Bounded "travel further" advisories: links, cross-references, bookmarks, machine-readable descriptions and the
 * data behind figures. These are opportunities and review clues, never profile predicates: nothing here changes
 * `report.accepted`. Inputs are data the engine already holds (PDF.js annotations and outline, the structure
 * inventory, recovered page text and the attachment inventory). No link is followed and no attachment is opened.
 */
import { XMP_PROPERTY_FIELDS } from './metadata.js';

export const TRAVEL_LIMITS = { maxAnnotationsPerPage: 500, maxLinks: 2000, maxUrlLength: 512, maxCrossReferences: 200,
  maxOutlineItems: 1000, maxOutlineDepth: 16, maxOutlineTitles: 100, maxTitleLength: 200, maxTables: 100, maxDetachedValues: 20 };

const clip = (value, length) => typeof value === 'string' ? value.slice(0, length) : null;
const LINK = 2; // PDF.js AnnotationType.LINK

/** Summarize one page's PDF.js annotation data. URLs are recorded as text; nothing is fetched. */
export function summarizeAnnotations(annotations, pageNumber, limits = TRAVEL_LIMITS) {
  const links = [], subtypes = {};
  const list = Array.isArray(annotations) ? annotations : [];
  for (const annotation of list.slice(0, limits.maxAnnotationsPerPage)) {
    const subtype = typeof annotation?.subtype === 'string' ? annotation.subtype : 'Unknown';
    subtypes[subtype] = (subtypes[subtype] || 0) + 1;
    if (annotation?.annotationType !== LINK && subtype !== 'Link') continue;
    const url = clip(annotation.url || annotation.unsafeUrl, limits.maxUrlLength);
    const target = url ? 'uri' : annotation.dest != null ? 'goto' : annotation.action ? 'named' : annotation.attachment ? 'attachment' : 'none';
    const rect = Array.isArray(annotation.rect) && annotation.rect.length === 4 && annotation.rect.every(Number.isFinite) ? [...annotation.rect] : null;
    links.push({ page: pageNumber, target, url, namedAction: clip(annotation.action, 64), rect,
      contents: clip(annotation.contentsObj?.str, 256) || null });
  }
  return { page: pageNumber, links, subtypes, truncated: list.length > limits.maxAnnotationsPerPage };
}

/** Link inventory plus whether the tag tree has Link elements (screen readers announce tagged links). */
export function inspectLinks(pageAnnotations, structure, limits = TRAVEL_LIMITS) {
  if (!pageAnnotations) return { status: 'not-assessed', reason: 'Annotations were not read.', links: [], count: 0 };
  const all = pageAnnotations.flatMap(page => page.links);
  const links = all.slice(0, limits.maxLinks);
  const byTarget = links.reduce((counts, link) => ({ ...counts, [link.target]: (counts[link.target] || 0) + 1 }), {});
  const taggedLinkElements = (structure?.nodes || []).filter(node => node.role === 'Link').length;
  const truncated = all.length > links.length || pageAnnotations.some(page => page.truncated);
  return { status: links.length ? 'present' : 'none', count: all.length, byTarget, taggedLinkElements,
    linksTagged: links.length ? taggedLinkElements >= links.length ? 'all' : taggedLinkElements ? 'some' : 'none' : null,
    links, truncated,
    reason: !links.length ? 'No link annotations were found.'
      : `${all.length} link${all.length === 1 ? '' : 's'} found${taggedLinkElements ? `; the tag tree has ${taggedLinkElements} Link element${taggedLinkElements === 1 ? '' : 's'}` : '; the tag tree has no Link elements, so screen readers may not announce them as links'}. Link targets were not followed or checked.` };
}

// Internal references people write in reports. The keyword may be capitalized or not; a single-letter identifier must
// be a capital (so "maps a route" is not a reference). Roman numerals cover "Annex IV".
const KEYWORD = String.raw`(?:[Ff]ig(?:ure)?s?\.?|[Tt]ables?|[Mm]aps?|[Aa]nnex(?:es)?|[Aa]ppendix|[Aa]ppendices|[Ss]ections?|[Cc]hapters?|[Bb]ox(?:es)?|[Cc]harts?)`;
const IDENTIFIER = String.raw`(?:\d{1,3}(?:\.\d{1,3}){0,3}|[IVX]{1,5}|[A-Z](?:\.\d{1,3})?)`;
const REFERENCE = new RegExp(String.raw`(?<![\p{L}\p{N}])(?:${KEYWORD}\s+${IDENTIFIER}|(?:[Ss]ee|[Oo]n)\s+pages?\s+\d{1,4})(?![\p{L}\p{N}])`, 'gu');
const CAPTION_START = /^[\s\p{P}]*$/u;

const bounds = quad => {
  const xs = quad.map(p => p[0]), ys = quad.map(p => p[1]);
  return { left: Math.min(...xs), right: Math.max(...xs), bottom: Math.min(...ys), top: Math.max(...ys) };
};
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** Proportional estimate of where characters [start, end) sit in a text block; character widths are not measured. */
const subQuad = (quad, start, end, length) => {
  const t0 = start / length, t1 = end / length;
  return [lerp(quad[0], quad[1], t0), lerp(quad[0], quad[1], t1), lerp(quad[3], quad[2], t1), lerp(quad[3], quad[2], t0)];
};
const overlaps = (box, rect) => {
  const [x1, y1, x2, y2] = [Math.min(rect[0], rect[2]), Math.min(rect[1], rect[3]), Math.max(rect[0], rect[2]), Math.max(rect[1], rect[3])];
  const width = Math.min(box.right, x2) - Math.max(box.left, x1), height = Math.min(box.top, y2) - Math.max(box.bottom, y1);
  // The match position is estimated, so accept a substantial horizontal overlap rather than full containment.
  return height > 0 && width >= 0.4 * Math.min(box.right - box.left, x2 - x1);
};

/**
 * Text that names another part of the document ("Figure 1", "Map 2", "Annex B", "see page 4") and whether a Link
 * annotation covers it. Captions and headings that begin with the label are labels, not references.
 */
export function inspectCrossReferences(pages, pageAnnotations, limits = TRAVEL_LIMITS) {
  if (!pageAnnotations) return { status: 'not-assessed', reason: 'Annotations were not read.', references: [], unlinked: 0, linked: 0 };
  const references = [];
  let found = 0;
  for (const page of pages) {
    const links = (pageAnnotations.find(entry => entry.page === page.number)?.links || []).filter(link => link.rect);
    for (const block of page.blocks || []) {
      if (/^(?:H[1-6]?|Caption|Lbl)$/.test(block.role || '')) continue;
      const text = block.text || '';
      for (const match of text.matchAll(REFERENCE)) {
        const before = text.slice(0, match.index), after = text.slice(match.index + match[0].length);
        if (CAPTION_START.test(before) && /^\s*[.:–—-]/.test(after)) continue;
        found++;
        if (references.length >= limits.maxCrossReferences) continue;
        // Reused Form XObject text has no trustworthy position; keep the whole block rather than an estimate.
        const located = block.quad?.length === 4 && block.locationSafe !== false && !page.formXObjectInvocations;
        const quad = located ? subQuad(block.quad, match.index, match.index + match[0].length, Math.max(text.length, 1)) : null;
        const linked = quad ? links.some(link => overlaps(bounds(quad), link.rect)) : null;
        references.push({ page: page.number, text: match[0], context: text.trim().slice(0, 240), blockId: block.id, key: block.key,
          quad, linked, linkTarget: linked ? links.find(link => overlaps(bounds(quad), link.rect)).target : null });
      }
    }
  }
  const unlinked = references.filter(reference => reference.linked !== true).length;
  const linked = references.length - unlinked;
  return { status: !references.length ? 'none' : unlinked ? 'requires-review' : 'present', found, linked, unlinked,
    truncated: found > references.length, references,
    method: 'Pattern match on recovered text items (Figure, Table, Map, Annex, Appendix, Section, Chapter, Box, Chart and “see/on page”), with the match position estimated proportionally within its text item and compared with Link annotation rectangles.',
    reason: !references.length ? 'No cross-reference wording such as “Figure 1”, “Map 2” or “see page 4” was found in the recovered text.'
      : unlinked ? `${unlinked} of ${references.length} cross-reference${references.length === 1 ? '' : 's'} ${unlinked === 1 ? 'has' : 'have'} no link over ${unlinked === 1 ? 'it' : 'them'}. Some may refer to other publications, which this check cannot tell apart.`
        : `${references.length === 1 ? 'The cross-reference has a link over it' : `All ${references.length} cross-references have a link over them`}. Link targets were not checked.` };
}

const normalize = text => String(text || '').normalize('NFKC').toLowerCase().replace(/^[\s\d.)]+/, '').replace(/\s+/g, ' ').trim();

/** Bookmarks (the document outline) against tagged headings. `outline` is PDF.js `getOutline()` output. */
export function inspectOutline(outline, pages, limits = TRAVEL_LIMITS, error = null) {
  const headings = pages.flatMap(page => (page.candidates || []).filter(candidate => /^tagged H/.test(candidate.source || '')).map(candidate => candidate.text));
  if (error) return { status: 'not-assessed', reason: `The bookmarks could not be read: ${String(error).slice(0, 200)}`, count: 0, headings: headings.length };
  let count = 0, depth = 0, truncated = false, withTarget = 0;
  const titles = [];
  const walk = (items, level) => {
    for (const item of items || []) {
      if (count >= limits.maxOutlineItems || level > limits.maxOutlineDepth) { truncated = true; return; }
      count++; depth = Math.max(depth, level);
      if (item?.dest != null || item?.url || item?.action) withTarget++;
      if (titles.length < limits.maxOutlineTitles && typeof item?.title === 'string') titles.push(item.title.slice(0, limits.maxTitleLength));
      walk(item?.items, level + 1);
    }
  };
  walk(Array.isArray(outline) ? outline : [], 1);
  const titleSet = new Set(titles.map(normalize));
  const headingsInOutline = headings.filter(text => titleSet.has(normalize(text))).length;
  const needed = headings.length >= 2 || pages.length >= 5;
  return { status: count ? 'present' : needed ? 'opportunity' : 'not-needed', count, depth, withTarget, titles, truncated,
    headings: headings.length, headingsInOutline,
    reason: count ? `${count} bookmark${count === 1 ? '' : 's'} found${headings.length ? `; ${headingsInOutline} of ${headings.length} tagged headings have a bookmark with the same wording` : ''}.`
      : needed ? `No bookmarks were found, although the PDF has ${headings.length >= 2 ? `${headings.length} tagged headings` : `${pages.length} pages`}.`
        : 'No bookmarks were found. The PDF is short and has fewer than two tagged headings, so bookmarks add little.' };
}

const STRUCTURED_DATA = /(?:^application\/(?:ld\+json|rdf\+xml)$)|\.(?:jsonld|rdf|ttl)$/i;
const DATA_FILE = /(?:^text\/(?:csv|tab-separated-values)$|^application\/(?:json|vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|vnd\.oasis\.opendocument\.spreadsheet|x-netcdf|geo\+json)$)|\.(?:csv|tsv|xlsx?|ods|json|geojson|nc|parquet)$/i;
const fileName = file => file.unicodeFilename || file.filename || '';
const mediaTypes = file => (file.payloads || []).map(payload => payload.mediaType).filter(Boolean);
const describeFile = file => ({ id: file.id, name: fileName(file) || null, relationship: file.relationship || null, mediaTypes: mediaTypes(file),
  scope: (file.associations || []).some(item => item.kind === 'associated-file' && /StructTreeRoot/.test(item.path || '')) ? 'element' : 'document' });
const isStructuredData = file => [fileName(file), ...mediaTypes(file)].some(value => STRUCTURED_DATA.test(value));
const isDataFile = file => !isStructuredData(file) && (file.relationship === 'Data' || [fileName(file), ...mediaTypes(file)].some(value => DATA_FILE.test(value)));

/** Saved publication details and attached machine-readable descriptions (for example schema.org JSON-LD). */
export function inspectMachineMetadata(metadata, attachments) {
  if (!metadata || metadata.xmpError) return { status: 'not-assessed', reason: metadata?.xmpError ? `The XMP metadata could not be read: ${metadata.xmpError}` : 'Metadata was not read.', present: [], missing: [], structuredData: [] };
  const properties = metadata.xmpProperties || {};
  const has = { title: !!(metadata.infoTitle?.trim() || metadata.xmpTitles?.length), creator: !!(metadata.author?.trim() || metadata.xmpAuthors?.length),
    description: !!(metadata.subject?.trim() || properties.description?.length), keywords: !!(metadata.keywords?.trim() || properties.subject?.length),
    language: !!(metadata.language || properties.language?.length) };
  for (const field of ['publisher', 'rights', 'date', 'identifier']) has[field] = !!properties[field]?.length;
  const present = Object.keys(has).filter(field => has[field]), missing = Object.keys(has).filter(field => !has[field]);
  const publication = ['publisher', 'rights', 'date', 'identifier'];
  const missingPublication = publication.filter(field => !has[field]);
  const files = attachments?.files || [];
  const structuredData = files.filter(isStructuredData).map(describeFile);
  const complete = !missingPublication.length && structuredData.length > 0;
  return { status: complete ? 'present' : 'opportunity', present, missing, missingPublication, structuredData,
    xmpPropertiesRecorded: XMP_PROPERTY_FIELDS.filter(field => properties[field]?.length),
    attachmentInventoryComplete: attachments?.inventoryComplete === true,
    reason: complete ? 'Publisher, rights, date and identifier are saved, and a machine-readable description is attached. Values were not verified.'
      : `${missingPublication.length ? `Not saved: ${missingPublication.join(', ')}. ` : ''}${structuredData.length ? '' : 'No machine-readable description file (such as schema.org JSON-LD) is attached.'}`.trim() };
}

/** For each tagged figure, a tagged Table on the same or an adjacent page, or an attached data file. */
export function inspectFigureData(figureAlternatives, structure, attachments, limits = TRAVEL_LIMITS) {
  const figures = (figureAlternatives?.items || []).filter(item => item.tagged && !item.decorative);
  const tables = [];
  for (const node of (structure?.nodes || []).filter(node => node.role === 'Table')) {
    if (tables.length >= limits.maxTables) break;
    const keys = [], pending = [node], roles = new Set();
    for (let visits = 0; pending.length && visits < 5000; visits++) {
      const current = pending.pop(); keys.push(...current.contentKeys); roles.add(current.role); pending.push(...current.children);
    }
    const tablePages = [...new Set(keys.map(key => Number(key.split(':')[0])))];
    if (!tablePages.length && node.page) tablePages.push(node.page);
    tables.push({ node: node.ref, pages: tablePages, headerCells: roles.has('TH'), keys: keys.slice(0, 64) });
  }
  const dataFiles = (attachments?.files || []).filter(isDataFile).map(describeFile);
  const items = figures.map(figure => {
    const nearby = tables.filter(table => table.pages.some(page => Math.abs(page - figure.page) <= 1)).map(table => table.node);
    return { id: figure.id, page: figure.page, node: figure.node, keys: figure.keys, quads: figure.quads, hasAlt: !!figure.alt,
      tablesNearby: nearby, dataFiles: dataFiles.length, hasEquivalent: nearby.length > 0 || dataFiles.length > 0 };
  });
  const without = items.filter(item => !item.hasEquivalent);
  return { status: !items.length ? 'not-applicable' : without.length ? 'opportunity' : 'present', items, tables, dataFiles,
    reason: !items.length ? 'No tagged figures were found.'
      : without.length ? `${without.length} of ${items.length} tagged figure${items.length === 1 ? '' : 's'} ${without.length === 1 ? 'has' : 'have'} no tagged table on the same or a neighbouring page and no attached data file.`
        : `Every tagged figure has a tagged table nearby or an attached data file. Whether they hold the same values was not checked.`,
    limits: 'Only declared Figure tags are considered. A nearby table or an attached data file is not proof that it holds the figure’s values; photos and illustrations need no data.' };
}

// A short value with a sign, unit, decimal, percentage or currency: "+0.7 m", "12%", "$3.4 bn". Bare integers are skipped.
const VALUE = /^(?=.*(?:^[+\-−±]|[.,]\d|%|‰|[$€£¥]|\d\s?[A-Za-zµ°]))[+\-−±]?\s?[$€£¥]?\d{1,3}(?:[,\s]?\d{3})*(?:[.,]\d+)?\s?(?:%|‰|[A-Za-zµ°]{1,3}\.?|million|billion|bn)?$/u;

/**
 * A short value whose tag-order label is drawn away from it. Screen readers follow the tags; tools that read text in
 * drawing order can separate the number from what it measures. Narrow: one value and its adjacent tagged sentence.
 */
export function inspectDetachedValues(pages, limits = TRAVEL_LIMITS) {
  const findings = [];
  for (const page of pages) {
    const logical = (page.logicalBlocks || []).filter(block => block.key);
    if (logical.length < 2) continue;
    const drawn = [];
    for (const block of page.blocks || []) if (block.key && drawn.at(-1) !== block.key && !drawn.includes(block.key)) drawn.push(block.key);
    logical.forEach((block, index) => {
      const text = block.text.trim();
      if (findings.length >= limits.maxDetachedValues || text.length > 24 || !VALUE.test(text) || /^(?:H[1-6]?|Lbl|TD|TH)$/.test(block.role || '')) return;
      const label = [logical[index + 1], logical[index - 1]].find(other => other && /\p{L}{3,}/u.test(other.text) && other.text.trim().split(/\s+/).length >= 3);
      if (!label) return;
      const at = drawn.indexOf(block.key), labelAt = drawn.indexOf(label.key);
      if (at < 0 || labelAt < 0 || Math.abs(at - labelAt) < 2) return;
      const idsFor = key => (page.blocks || []).filter(item => item.key === key).map(item => item.id).slice(0, 16);
      findings.push({ page: page.number, value: text, label: label.text.trim().slice(0, 160), key: block.key, labelKey: label.key,
        blockIds: idsFor(block.key), labelBlockIds: idsFor(label.key),
        drawnApartBy: Math.abs(at - labelAt) - 1 });
    });
  }
  return findings.length
    ? { status: 'requires-review', findings, reason: `${findings.length} short value${findings.length === 1 ? ' is' : 's are'} tagged next to a label but drawn apart from it. Tools that read text in drawing order may separate the number from what it measures.` }
    : { status: 'none', findings, reason: 'No short value was found drawn apart from its tagged label. Untagged text, tables and charts are not assessed by this check.' };
}

/** Planned: whether a linked reference ("Map 2") lands on the thing it names. See docs/PROFILE.md, Planned checks. */
export function inspectReferenceTargets() {
  return { status: 'not-assessed', reason: 'Not implemented yet: checking that a linked cross-reference leads to the figure, table, map or section it names.' };
}
