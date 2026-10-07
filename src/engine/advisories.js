import { normalizeTitle } from './titles.js';
const uncertain = reason => ({ status: 'uncertain', reason, evidence: [] });
const splitNames = value => value.split(/\s*;\s*|\s+and\s+/i).map(s => s.trim()).filter(Boolean);
const sameNames = (a,b) => a.length === b.length && a.map(normalizeTitle).sort().join('\u0000') === b.map(normalizeTitle).sort().join('\u0000');
const usableNames = names => names.length > 0 && names.length <= 20 && names.every(n => n.length >= 3 && n.length <= 150 && !/\b(?:et\s+al|others)\b|[,\/]/i.test(n));
const located = (b, page) => ({ ...b, page, keys: b.key ? [b.key] : b.keys, blockIds: b.id != null ? [b.id] : b.blockIds });

export function compareAuthors(metadata, pages) {
  const info = typeof metadata.author === 'string' ? splitNames(metadata.author) : [];
  const xmp = metadata.xmpAuthors || [];
  const metadataAuthors = { info, xmp };
  const first = pages.find(p => p.number === 1);
  const blocks = first?.logicalBlocks.length ? first.logicalBlocks : first?.blocks || [];
  const evidence = blocks.filter(b => /^\s*(?:authors?|written by|by)\s*:\s*\S/i.test(b.text || '') || /^\s*by\s+[A-Z][\p{L}\p{M}.' -]+$/u.test(b.text || ''))
    .slice(0, 5).map(b => located(b, 1));
  const groups = evidence.map(b => splitNames(b.text.replace(/^\s*(?:authors?|written by|by)\s*:\s*|^\s*by\s+/i,'')));
  const base = { ...uncertain('No unambiguous, explicitly labeled first-page byline and comparable author metadata.'), metadataAuthors, evidence };
  if (usableNames(info) && usableNames(xmp) && !sameNames(info,xmp)) return { ...base, status: 'suspected-mismatch', reason: 'Info Author and XMP creator list identify different authors. Inspect both sources.' };
  const preferred = xmp.length ? xmp : info;
  if (!usableNames(preferred) || groups.length !== 1 || !usableNames(groups[0])) return base;
  // Matching initials establish string agreement, but cannot establish unambiguous name identity.
  const initials = names => names.some(n => /(?:\b[A-Z]\.|\b[A-Z]\b)/i.test(n));
  if (initials(preferred) || initials(groups[0])) return { ...base, reason: 'Initialed or abbreviated author names require manual identity review, even when their strings agree.' };
  if (sameNames(preferred, groups[0])) return { ...base, status: 'match', reason: 'Author metadata and the explicit byline candidate contain the same normalized names. Byline candidacy is heuristic; this does not authenticate authorship.' };
  const overlap = preferred.some(n => groups[0].some(v => normalizeTitle(n) === normalizeTitle(v)));
  if (overlap) return { ...base, reason: 'Partially overlapping author names require manual identity review.' };
  return { ...base, status: 'suspected-mismatch', reason: 'Author metadata differs from the explicitly labeled first-page byline candidate. Inspect names and publisher/editor roles.' };
}

export function inspectReadingOrder(pages) {
  const findings = [];
  for (const page of pages) {
    const steps = (page.logicalBlocks || []).filter(b => /^(?:H[1-6]?|Lbl)$/.test(b.role || ''))
      .map(b => ({ ...located(b,page.number), step: Number(b.text.match(/^\s*(\d{1,3})[.)]\s+\S/)?.[1]) }))
      .filter(b => Number.isInteger(b.step) && b.step > 0);
    const tagOrderBroken = steps.length >= 3 && steps.some((b,i) => i > 0 && b.step <= steps[i-1].step);
    if (tagOrderBroken) findings.push({ page: page.number, detector:'numbered-step-sequence',
      reason: 'Numbered heading/list-label steps repeat or decrease in tag-tree order. This may indicate reordered procedures or a legitimate numbering restart.', evidence: steps });
    // Tags in order, drawing out of order: screen readers follow the tags, but tools that extract text in the
    // order it is drawn (common in AI pipelines) read the steps out of sequence.
    if (!tagOrderBroken && steps.length >= 3) {
      const drawn = steps.map(step => ({ step, position: (page.blocks || []).findIndex(block => block.key && step.keys?.includes(block.key)) }));
      const allDrawn = drawn.every(item => item.position >= 0);
      const drawnSteps = [...drawn].sort((a, b) => a.position - b.position).map(item => item.step.step);
      if (allDrawn && drawnSteps.some((step, i) => i > 0 && step < drawnSteps[i - 1])) findings.push({ page: page.number, detector: 'numbered-step-drawing-order',
        reason: `Numbered steps are tagged in order but drawn in the order ${drawnSteps.join(', ')}. Tools that extract text in drawing order may read them out of sequence.`, evidence: steps });
    }
    // A very narrow top-down clue: at least three short headings share one left
    // alignment, have recoverable geometry, and no heading belongs to another column.
    const headings=(page.logicalBlocks || []).filter(b=>/^H[1-6]?$/.test(b.role || '') && b.text.length<=200).map(b=>{
      const physical=(page.blocks || []).filter(p=>p.key===b.key && p.quad?.length===4);
      if(!physical.length)return null;
      return {...located(b,page.number),x:Math.min(...physical.flatMap(p=>p.quad.map(pt=>pt[0]))),y:Math.max(...physical.flatMap(p=>p.quad.map(pt=>pt[1])))};
    }).filter(Boolean);
    const bodyLefts=(page.blocks || []).filter(b=>b.quad?.length===4).map(b=>Math.min(...b.quad.map(pt=>pt[0])));
    const simpleAlignment=bodyLefts.length>0 && Math.max(...bodyLefts)-Math.min(...bodyLefts)<=40;
    if(!(page.rotation || 0) && simpleAlignment && headings.length>=3 && Math.max(...headings.map(h=>h.x))-Math.min(...headings.map(h=>h.x))<=12 &&
      headings.some((h,i)=>i>0 && h.y>headings[i-1].y+30)) {
      findings.push({page:page.number,detector:'single-alignment-heading-geometry',reason:'The tagged short-heading sequence moves substantially upward on a page whose recovered headings share one left alignment. Inspect the intended order; layout, rotation or deliberate references can make this legitimate.',evidence:headings});
    }

  }
  return findings.length ? { status: 'requires-review', reason: 'A bounded numbered-step or heading-position detector found an order clue; inspect the located sequence. Global reading-order correctness is not established.', findings, evidence: findings.flatMap(f => f.evidence) } :
    { ...uncertain('No numbered-step anomaly was detected. Columns, prose, tables, and overall reading order have not been verified.'), findings: [] };
}

export function inspectTextVisibility(pages) {
  const affected = pages.filter(p => p.invisibleTextOperations > 0);
  const evidence = affected.flatMap(p => p.blocks.filter(b => p.invisibleKeys.includes(b.key)).map(b => located(b,p.number)));
  return affected.length ? { status: 'requires-review', reason: `${affected.reduce((n,p)=>n+p.invisibleTextOperations,0)} non-artifact text operations use invisible or clipping-only rendering. Extracted text may differ from visible content; invisible accessibility/OCR text can be legitimate. White-on-white, clipping, occlusion, and off-page text are not fully assessed.`, pages: affected.map(p=>p.number), evidence } :
    uncertain('No invisible text rendering modes were detected. Color, clipping, occlusion, and off-page visibility have not been fully assessed.');
}
