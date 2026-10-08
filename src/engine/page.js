import { textQuad, multiply, rectPoints } from '../geometry.js';
const mergeQuads = (a, b) => { const xs = [...a, ...b].map(p => p[0]), ys = [...a, ...b].map(p => p[1]);
  return [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)], [Math.min(...xs), Math.max(...ys)]]; };
/** Inspect extracted text and drawing operators against raw page-scoped tag links. */
export function inspectPage(text, operators, tree, pageNumber, structure, OPS, view = null) {
  const stack = [], blocks = [], byKey = new Map();
  let untaggedCharacters = 0, characters = 0, suspicious = 0;
  const bad = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffd\ue000-\uf8ff\u{f0000}-\u{ffffd}\u{100000}-\u{10fffd}]/gu;
  for (const item of text.items) {
    if (item.type === 'beginMarkedContent' || item.type === 'beginMarkedContentProps') stack.push(item);
    else if (item.type === 'endMarkedContent') stack.pop();
    else if (typeof item.str === 'string' && item.str.trim()) {
      if (stack.some(s => s.tag === 'Artifact')) continue;
      const owner = [...stack].reverse().find(s => s.id);
      const mcid = owner?.id?.match(/_mc(\d+)$/)?.[1];
      const key = mcid == null ? null : `${pageNumber}:${Number(mcid)}`;
      characters += item.str.length;
      suspicious += (item.str.match(bad) || []).length;
      if (!structure.refs.has(key)) untaggedCharacters += item.str.length;
      const block = { id: blocks.length, connected: structure.refs.has(key), suspicious: (item.str.match(bad) || []).length > 0, transform: item.transform ? [...item.transform] : null, width: item.width, fontAscent: text.styles?.[item.fontName]?.ascent ?? null, quad: textQuad(item, text.styles?.[item.fontName]), text: item.str, key, page: pageNumber, role: structure.refs.get(key)?.role || null,
        height: Math.abs(item.height || item.transform?.[3] || 0), y: item.transform?.[5] || 0 };
      blocks.push(block);
      if (key) byKey.set(key, `${byKey.get(key) || ''}${item.str}${item.hasEOL ? '\n' : ' '}`);
    }
  }
  let nonArtifactGraphics = 0, invalidGlyphs = 0;
  const contentErrors = [], mcidOccurrences = new Set(), invisibleKeys = new Set();
  let invisibleTextOperations = 0, renderMode = 0; const renderModes = [];
  // Text state for hidden-text screening: what readers cannot see but extraction (and AI tools) still reads.
  let fontSize = 12, fill = '#000000', leading = 0, textMatrix = [1,0,0,1,0,0], lineMatrix = [1,0,0,1,0,0];
  const textStates = [], hiddenText = [];
  let hiddenCharacters = 0;
  const HIDDEN_CHARACTER_LIMIT = 50_000, HIDDEN_RUN_LIMIT = 300;
  const translate = (m, tx, ty) => [m[0], m[1], m[2], m[3], m[0]*tx + m[2]*ty + m[4], m[1]*tx + m[3]*ty + m[5]];
  const nearWhite = hex => /^#[0-9a-f]{6}$/i.test(hex) && [1, 3, 5].every(i => parseInt(hex.slice(i, i + 2), 16) >= 0xf0);
  const graphicRegions = [], decorativeGraphics = [], matrices = []; let matrix = [1,0,0,1,0,0], formDepth = 0, formXObjectInvocations = 0;
  const usedKeys = new Set(), opStack = [];
  const pageTextKeys = new Set(), reusedTextKeys = new Set();
  const graphics = new Set(['paintImageXObject', 'paintInlineImageXObject', 'paintImageMaskXObject',
    'paintImageXObjectRepeat', 'paintImageMaskXObjectRepeat', 'paintImageMaskXObjectGroup', 'paintSolidColorImageMask',
    'shadingFill', 'stroke', 'closeStroke', 'fill', 'eoFill', 'fillStroke', 'eoFillStroke',
    'closeFillStroke', 'closeEOFillStroke'].map(n => OPS[n]));
  for (let i = 0; i < operators.fnArray.length; i++) {
    const fn = operators.fnArray[i], args = operators.argsArray[i];
    if (fn === OPS.save) { matrices.push([...matrix]); renderModes.push(renderMode); textStates.push({ fontSize, fill, leading }); }
    if (fn === OPS.restore) { matrix = matrices.pop() || [1,0,0,1,0,0]; renderMode = renderModes.pop() ?? 0; ({ fontSize, fill, leading } = textStates.pop() || { fontSize, fill, leading }); }
    if (fn === OPS.beginText) { textMatrix = [1,0,0,1,0,0]; lineMatrix = [1,0,0,1,0,0]; }
    if (fn === OPS.setFont && Number.isFinite(args[1])) fontSize = args[1];
    if (fn === OPS.setFillRGBColor && typeof args[0] === 'string') fill = args[0];
    if (fn === OPS.setLeading) leading = args[0];
    if (fn === OPS.setTextMatrix) { const m = Array.from(args[0] || args); textMatrix = m; lineMatrix = m; }
    if (fn === OPS.moveText || fn === OPS.setLeadingMoveText) { if (fn === OPS.setLeadingMoveText) leading = -args[1]; lineMatrix = translate(lineMatrix, args[0], args[1]); textMatrix = lineMatrix; }
    if (fn === OPS.nextLine) { lineMatrix = translate(lineMatrix, 0, -leading); textMatrix = lineMatrix; }
    if (fn === OPS.setTextRenderingMode) renderMode = args[0];
    if (fn === OPS.transform) matrix = multiply(matrix, args);
    if (fn === OPS.paintFormXObjectBegin) { formXObjectInvocations++; matrices.push([...matrix]); renderModes.push(renderMode); formDepth++; if (args[0]) matrix = multiply(matrix,args[0]); }
    if (fn === OPS.paintFormXObjectEnd) { matrix = matrices.pop() || [1,0,0,1,0,0]; renderMode = renderModes.pop() ?? 0; formDepth--; }
    if (fn === OPS.beginMarkedContent || fn === OPS.beginMarkedContentProps) {
      if (!formDepth && fn === OPS.beginMarkedContentProps && args[1] != null) {
        const mcid = args[1];
        if (!Number.isInteger(mcid) || mcid < 0) contentErrors.push(`Page ${pageNumber}: marked-content identifier is invalid.`);
        else if (mcidOccurrences.has(mcid)) contentErrors.push(`Page ${pageNumber}: MCID ${mcid} occurs in multiple marked-content sequences.`);
        else mcidOccurrences.add(mcid);
      }
      opStack.push({ tag: typeof args[0] === 'string' ? args[0] : args[0]?.name, mcid: fn === OPS.beginMarkedContentProps ? args[1] : null });
    } else if (fn === OPS.endMarkedContent) {
      if (!opStack.length && !formDepth) contentErrors.push(`Page ${pageNumber}: unmatched marked-content closing boundary.`);
      opStack.pop();
    }
    else {
      const artifact = opStack.some(s => s.tag === 'Artifact');
      const owner = [...opStack].reverse().find(s => Number.isInteger(s.mcid));
      const observedContent = graphics.has(fn) || (fn === OPS.constructPath && graphics.has(args[0])) ||
        (fn === OPS.showText && args[0].some(g => typeof g === 'object' && !!g.unicode));
      if (owner && observedContent) usedKeys.add(`${pageNumber}:${owner.mcid}`);
      if (owner && fn === OPS.showText) (formDepth ? reusedTextKeys : pageTextKeys).add(`${pageNumber}:${owner.mcid}`);
      if (graphics.has(fn) || (fn === OPS.constructPath && graphics.has(args[0]))) {
        if (!artifact) nonArtifactGraphics++;
        let box = null;
        if (!formDepth && fn === OPS.constructPath && args[2]?.length === 4) box = args[2];
        if (!formDepth && [OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject].includes(fn)) box = [0,0,1,1];
        const region = { key: !formDepth && owner ? `${pageNumber}:${owner.mcid}` : null, quad: box ? rectPoints(box,matrix) : null, label: box ? 'Graphic; bounding region (clipping not resolved)' : 'Graphic; no trustworthy region recovered' };
        if (artifact) { if (decorativeGraphics.length < 16) decorativeGraphics.push(region); }
        else graphicRegions.push(region);
      }
      if (fn === OPS.showText) {
        const glyphs = args[0] || [];
        const content = glyphs.map(g => typeof g === 'number' ? (g < -200 ? ' ' : '') : g?.unicode || '').join('');
        const combined = multiply(matrix, textMatrix);
        const size = Math.abs(fontSize) * Math.sqrt(Math.abs(combined[0]*combined[3] - combined[1]*combined[2]));
        const advance = glyphs.reduce((sum, g) => sum + (typeof g === 'number' ? -g / 1000 : (g?.width || 0) / 1000), 0) * fontSize;
        const [x, y] = [combined[4], combined[5]];
        const reasons = [];
        if (renderMode === 3 || renderMode === 7) reasons.push('invisible');
        if (size > 0 && size < 1) reasons.push('tiny');
        if (nearWhite(fill) && renderMode !== 3 && renderMode !== 7) reasons.push('white');
        if (view && (x < view[0] - 2 || x > view[2] + 2 || y < view[1] - 2 || y > view[3] + 2)) reasons.push('offpage');
        if (reasons.length && content.trim() && !formDepth && hiddenCharacters < HIDDEN_CHARACTER_LIMIT) {
          const previous = hiddenText.at(-1);
          const quad = rectPoints([0, 0, Math.max(advance, 1), Math.max(Math.abs(fontSize), 1)], combined);
          if (previous && previous.reasons.join() === reasons.join() && previous.lastIndex === i - 1) { previous.text += content; previous.quad = mergeQuads(previous.quad, quad); previous.lastIndex = i; }
          else if (hiddenText.length < HIDDEN_RUN_LIMIT) hiddenText.push({ reasons, text: content, size: Math.round(size * 100) / 100, fill, quad, lastIndex: i });
          hiddenCharacters += content.length;
        }
        textMatrix = translate(textMatrix, advance, 0);
      }
      if (!artifact && fn === OPS.showText) {
        if (renderMode === 3 || renderMode === 7) { invisibleTextOperations++; if (owner) invisibleKeys.add(`${pageNumber}:${owner.mcid}`); }
        for (const glyph of args[0]) {
          if (typeof glyph === 'object' && (!glyph.unicode || (glyph.unicode.match(bad) || []).length)) invalidGlyphs++;
        }
      }
    }
  }
  if (opStack.length) contentErrors.push(`Page ${pageNumber}: ${opStack.length} marked-content sequence(s) lack a closing boundary.`);
  // A numeric MCID may occur in several streams. Never use a mixed-scope key
  // to locate text, even if some matching text also occurs directly on the page.
  for (const block of blocks) block.locationSafe = formXObjectInvocations === 0 ||
    (pageTextKeys.has(block.key) && !reusedTextKeys.has(block.key));
  const dangling = [...structure.refs.keys()].filter(k => k.startsWith(`${pageNumber}:`) && !usedKeys.has(k));
  const emptyContent = dangling.filter(k => mcidOccurrences.has(Number(k.split(':')[1])));
  const candidateNodes = structure.nodes.filter(n => n.page === pageNumber && /^H[1-6]?$/.test(n.role));
  const collectText = n => [...n.contentKeys.map(k => byKey.get(k) || ''), ...n.children.map(collectText)].join(' ').replace(/\s+/g, ' ').trim();
  const keysFor = n => [...n.contentKeys, ...n.children.flatMap(keysFor)];
  const candidates = candidateNodes.map(n => ({ keys: keysFor(n), text: collectText(n), page: pageNumber, source: `tagged ${n.role}`, node: n.ref }))
    .filter(c => c.text && c.text.length <= 350);
  if (pageNumber === 1) {
    // Group cover fragments by baseline before ranking font size and position.
    const lines = [];
    for (const block of blocks) {
      const line = lines.find(l => Math.abs(l.y - block.y) < 3);
      if (line) { line.blockIds.push(block.id); line.text += ` ${block.text}`; line.height = Math.max(line.height, block.height); }
      else lines.push({ ...block, blockIds: [block.id] });
    }
    for (const line of lines.sort((a, b) => b.height - a.height || b.y - a.y).slice(0, 4)) {
      if (line.text.length <= 350) candidates.push({ height: line.height, maxHeight: Math.max(...lines.map(l=>l.height)), blockIds: line.blockIds, text: line.text.trim(), page: 1, source: 'cover text candidate', node: null });
    }
  }
  const logicalBlocks = [];
  function enrich(node, inheritedRole = null, depth = 0) {
    if (!node) return null;
    if (depth > 100) throw new Error('Page structure traversal limit reached.');
    if (node.type === 'content') {
      const mcid = node.id?.match(/_mc(\d+)$/)?.[1];
      const key = mcid == null ? null : `${pageNumber}:${Number(mcid)}`;
      const leaf = { ...node, key, text: (byKey.get(key) || '').trim() };
      if (leaf.text) logicalBlocks.push({ key, role: inheritedRole, text: leaf.text,
        node: structure.refs.get(key)?.owner || null });
      return leaf;
    }
    return { ...node, children: (node.children || []).map(child => enrich(child, node.role || inheritedRole, depth + 1)) };
  }
  const enrichedTree = enrich(tree);
  return { number: pageNumber, characters, untaggedCharacters, suspicious: suspicious + invalidGlyphs,
    formXObjectInvocations,
    evidenceGeometryScoped: true,
    contentErrors: [...new Set(contentErrors)], invisibleKeys: [...invisibleKeys], invisibleTextOperations,
    hiddenText: hiddenText.map(({ lastIndex, ...run }) => ({ ...run, text: run.text.replace(/\s+/g, ' ').trim() })),
    nonArtifactGraphics, graphics: graphicRegions, decorativeGraphics, dangling, emptyContent, blocks, logicalBlocks, candidates, structure: enrichedTree };
}
