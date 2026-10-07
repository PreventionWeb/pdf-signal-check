import { textQuad, multiply, rectPoints } from '../geometry.js';
/** Inspect extracted text and drawing operators against raw page-scoped tag links. */
export function inspectPage(text, operators, tree, pageNumber, structure, OPS) {
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
  const graphicRegions = [], matrices = []; let matrix = [1,0,0,1,0,0], formDepth = 0;
  const usedKeys = new Set(), opStack = [];
  const graphics = new Set(['paintImageXObject', 'paintInlineImageXObject', 'paintImageMaskXObject',
    'paintImageXObjectRepeat', 'paintImageMaskXObjectRepeat', 'paintImageMaskXObjectGroup', 'paintSolidColorImageMask',
    'shadingFill', 'stroke', 'closeStroke', 'fill', 'eoFill', 'fillStroke', 'eoFillStroke',
    'closeFillStroke', 'closeEOFillStroke'].map(n => OPS[n]));
  for (let i = 0; i < operators.fnArray.length; i++) {
    const fn = operators.fnArray[i], args = operators.argsArray[i];
    if (fn === OPS.save) { matrices.push([...matrix]); renderModes.push(renderMode); }
    if (fn === OPS.restore) { matrix = matrices.pop() || [1,0,0,1,0,0]; renderMode = renderModes.pop() ?? 0; }
    if (fn === OPS.setTextRenderingMode) renderMode = args[0];
    if (fn === OPS.transform) matrix = multiply(matrix, args);
    if (fn === OPS.paintFormXObjectBegin) { matrices.push([...matrix]); renderModes.push(renderMode); formDepth++; if (args[0]) matrix = multiply(matrix,args[0]); }
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
      if (!artifact && (graphics.has(fn) || (fn === OPS.constructPath && graphics.has(args[0])))) {
        nonArtifactGraphics++;
        let box = null;
        if (!formDepth && fn === OPS.constructPath && args[2]?.length === 4) box = args[2];
        if (!formDepth && [OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject].includes(fn)) box = [0,0,1,1];
        graphicRegions.push({ key: !formDepth && owner ? `${pageNumber}:${owner.mcid}` : null, quad: box ? rectPoints(box,matrix) : null, label: box ? 'Non-artifact graphic; bounding region (clipping not resolved)' : 'Non-artifact graphic; no trustworthy region recovered' });
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
    contentErrors: [...new Set(contentErrors)], invisibleKeys: [...invisibleKeys], invisibleTextOperations,
    nonArtifactGraphics, graphics: graphicRegions, dangling, emptyContent, blocks, logicalBlocks, candidates, structure: enrichedTree };
}
