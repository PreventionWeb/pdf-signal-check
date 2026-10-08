import { PDFArray, PDFDict, PDFName, PDFNumber, PDFRef, PDFRawStream, decodePDFRawStream } from 'pdf-lib';

const roles = new Set('Document Part Art Sect Div BlockQuote Caption TOC TOCI Index NonStruct Private P H H1 H2 H3 H4 H5 H6 L LI Lbl LBody Table TR TH TD THead TBody TFoot Span Quote Note Reference BibEntry Code Link Annot Ruby RB RT RP Warichu WT WP Figure Formula Form'.split(' '));
const name = o => o instanceof PDFName ? o.decodeText() : null;
const ref = o => o instanceof PDFRef ? o.toString() : null;

/** Independently validate raw links before trusting PDF.js's recovered page tree. */
export function inspectStructure(doc) {
  const ctx = doc.context;
  const resolve = o => o instanceof PDFRef ? ctx.lookup(o) : o;
  const get = (o, key) => o instanceof PDFDict ? resolve(o.get(PDFName.of(key))) : null;
  const entries = o => o instanceof PDFArray ? o.asArray() : o == null ? [] : [o];
  const errors = [], unsupported = [], nodes = [], refs = new Map();
  const pages = doc.getPages(), pageMap = new Map(pages.map((p, i) => [p.ref.toString(), i + 1]));
  const rootRef = doc.catalog.get(PDFName.of('StructTreeRoot'));
  const root = resolve(rootRef);
  const roleMap = get(root, 'RoleMap');
  if (!(root instanceof PDFDict)) return { present: false, nodes, refs, errors, unsupported };
  const marked = get(get(doc.catalog, 'MarkInfo'), 'Marked');
  if (marked?.toString() !== 'true') errors.push('The catalog does not declare marked content.');
  if (get(get(doc.catalog, 'MarkInfo'), 'Suspects')?.toString() === 'true') unsupported.push('The producer marks the tags as suspect.');
  const parentEntries = new Map(), seenNums = new Set();
  let visits = 0;
  function numberTree(value, depth = 0) {
    if (++visits > 50000 || depth > 100) throw new Error('Parent tree traversal limit reached.');
    const d = resolve(value);
    if (!(d instanceof PDFDict) || seenNums.has(d)) { errors.push('Invalid or cyclic parent number tree.'); return; }
    seenNums.add(d);
    const nums = get(d, 'Nums');
    if (nums instanceof PDFArray) {
      if (nums.size() % 2) errors.push('Parent number tree has an unmatched key.');
      for (let i = 0; i + 1 < nums.size(); i += 2) {
        const key = resolve(nums.get(i));
        if (!(key instanceof PDFNumber) || parentEntries.has(key.asNumber())) errors.push('Invalid or duplicate parent-tree key.');
        else parentEntries.set(key.asNumber(), resolve(nums.get(i + 1)));
      }
    }
    for (const k of entries(get(d, 'Kids'))) numberTree(k, depth + 1);
  }
  if (get(root, 'ParentTree')) numberTree(get(root, 'ParentTree'));
  else errors.push('No parent tree connects content back to tags.');
  const seen = new Set();
  function content(mcid, page, owner, source) {
    if (!Number.isInteger(mcid) || mcid < 0 || !pageMap.has(ref(page))) { errors.push('A content reference has an invalid MCID or page.'); return; }
    const pageNo = pageMap.get(ref(page)), key = `${pageNo}:${mcid}`;
    if (refs.has(key)) errors.push(`Page ${pageNo}: duplicate structure ownership for MCID ${mcid}.`);
    refs.set(key, { page: pageNo, mcid, owner: ref(owner), role: source.role });
    source.contentKeys.push(key);
    const pageDict = resolve(page), structParents = get(pageDict, 'StructParents');
    const parentArray = structParents instanceof PDFNumber ? parentEntries.get(structParents.asNumber()) : null;
    if (!(parentArray instanceof PDFArray) || mcid >= parentArray.size() || ref(parentArray.get(mcid)) !== ref(owner)) {
      errors.push(`Page ${pageNo}: MCID ${mcid} has a missing or inconsistent parent-tree association.`);
    }
  }
  function walk(value, parent, inheritedPage, depth = 0, owner = null) {
    if (++visits > 50000 || depth > 100) throw new Error('Structure traversal limit reached.');
    const o = resolve(value);
    if (o instanceof PDFArray) { for (const k of o.asArray()) walk(k, parent, inheritedPage, depth + 1, owner); return; }
    if (o instanceof PDFNumber) {
      if (!owner) errors.push('Content reference has no structure owner.');
      else content(o.asNumber(), inheritedPage, parent, owner);
      return;
    }
    if (!(o instanceof PDFDict)) { errors.push('A structure child is not a supported PDF object.'); return; }
    const type = name(get(o, 'Type'));
    if (type === 'OBJR') { unsupported.push('Object-reference structure requires annotation analysis.'); return; }
    if (type === 'MCR') {
      if (get(o, 'Stm')) { unsupported.push('Marked content in a separate stream is outside this profile.'); return; }
      const mcid = get(o, 'MCID');
      if (owner && mcid instanceof PDFNumber) content(mcid.asNumber(), o.get(PDFName.of('Pg')) || inheritedPage, parent, owner);
      else errors.push('Invalid marked-content reference.');
      return;
    }
    if (seen.has(o)) { errors.push('A structure element is cyclic or has multiple parents.'); return; }
    seen.add(o);
    if (!(value instanceof PDFRef)) errors.push('Structure elements must be indirect objects.');
    if (ref(o.get(PDFName.of('P'))) !== ref(parent)) errors.push('A structure element points to the wrong parent.');
    let role = name(get(o, 'S')), originalRole = role;
    const seenRoles = new Set();
    while (roleMap instanceof PDFDict && roleMap.has(PDFName.of(role || ''))) {
      if (seenRoles.has(role)) { errors.push('RoleMap contains a cycle.'); break; }
      seenRoles.add(role); role = name(get(roleMap, role));
    }
    if (!roles.has(role)) unsupported.push(`Unknown or unsupported structure role: ${originalRole || '(missing)'}.`);
    const node = { role, ref: ref(value), page: pageMap.get(ref(o.get(PDFName.of('Pg')) || inheritedPage)) || null,
      contentKeys: [], children: [], alt: get(o, 'Alt')?.decodeText?.() || null };
    if (owner) owner.children.push(node);
    nodes.push(node);
    const kids = get(o, 'K');
    if (kids != null) walk(kids, value, o.get(PDFName.of('Pg')) || inheritedPage, depth + 1, node);
    else errors.push(`Empty ${role || 'unknown'} element has no content or children.`);
    if (role === 'L' && (!node.children.length || node.contentKeys.length || node.children.some(n => n.role !== 'LI'))) errors.push('The project profile requires a list to contain list items, without directly owned text.');
    if (role === 'LI' && (node.contentKeys.length || !node.children.some(n => n.role === 'LBody') || node.children.some(n => !['Lbl', 'LBody'].includes(n.role)))) errors.push('The project profile requires list items to contain a list body and optional labels.');
    if (['THead', 'TBody', 'TFoot'].includes(role) && (!node.children.length || node.contentKeys.length || node.children.some(n => n.role !== 'TR'))) errors.push('The project profile requires table sections to contain rows.');
    if (role === 'TR' && (!node.children.length || node.contentKeys.length || node.children.some(n => !['TH', 'TD'].includes(n.role)))) errors.push('A table row has no cells or has invalid cell children.');
    if (role === 'Table' && (!node.children.length || node.contentKeys.length || node.children.some(n => !['TR', 'THead', 'TBody', 'TFoot'].includes(n.role)))) errors.push('A table has no rows or has invalid children.');
  }
  const kids = get(root, 'K');
  if (kids != null) walk(kids, rootRef, null);
  if (!nodes.length || !refs.size) errors.push('The structure tree does not connect to any page content.');
  return { present: true, nodes, refs, errors: [...new Set(errors)], unsupported: [...new Set(unsupported)] };
}

export function unsupportedFeatures(doc, { onContentError = () => {} } = {}) {
  const reasons = [];
  const seen = new Set();
  function inspect(value, depth = 0) {
    const resolved = value instanceof PDFRef ? doc.context.lookup(value) : value;
    const o = resolved instanceof PDFRawStream ? resolved.dict : resolved;
    if (!(o instanceof PDFDict) && !(o instanceof PDFArray)) return;
    if (seen.has(o)) return;
    if (depth > 100 || seen.size > 50000) throw new Error('Feature inspection traversal limit reached.');
    seen.add(o);
    if (o instanceof PDFArray) { o.asArray().forEach(x => inspect(x, depth + 1)); return; }
    const subtype = name(o.get(PDFName.of('Subtype')));
    if (subtype === 'Form') reasons.push('Form XObjects require stream-scoped coverage analysis.');
    if (subtype === 'Type3') reasons.push('Type 3 fonts require glyph-program analysis.');
    if (o.has(PDFName.of('ActualText'))) reasons.push('ActualText replacements are not yet joined to extracted evidence.');
    if (o.has(PDFName.of('OCProperties')) || o.has(PDFName.of('OC'))) reasons.push('Optional content layers are outside this profile.');
    for (const [, child] of o.entries()) inspect(child, depth + 1);
  }
  for (const [, o] of doc.context.enumerateIndirectObjects()) inspect(o);
  if (doc.catalog.has(PDFName.of('AcroForm'))) reasons.push('Forms and XFA are outside this profile.');
  if (doc.catalog.has(PDFName.of('AF'))) reasons.push('Associated files are outside this profile.');
  for (const [pageIndex, page] of doc.getPages().entries()) {
    let boundaryDepth = 0, opaqueBoundary = false;
    const annots = page.node.get(PDFName.of('Annots'));
    const resolved = annots instanceof PDFRef ? doc.context.lookup(annots) : annots;
    if (resolved && (!(resolved instanceof PDFArray) || resolved.size() > 0)) reasons.push('Annotations require object-reference analysis.');
    const content = page.node.get(PDFName.of('Contents'));
    const contentResolved = content instanceof PDFRef ? doc.context.lookup(content) : content;
    const streams = contentResolved instanceof PDFArray ? contentResolved.asArray() : [contentResolved];
    for (let stream of streams) {
      stream = stream instanceof PDFRef ? doc.context.lookup(stream) : stream;
      if (!(stream instanceof PDFRawStream)) continue;
      try {
        const bytes = decodePDFRawStream(stream).decode();
        if (bytes.length > 10_000_000) throw new Error('Decoded content stream limit reached.');
        const boundary = rawBoundaryTokens(bytes);
        for (const token of boundary) {
          if (token === 'BI') { opaqueBoundary = true; break; }
          if (token === 'BMC' || token === 'BDC') boundaryDepth++;
          else if (token === 'EMC') {
            if (!boundaryDepth) onContentError(`Page ${pageIndex + 1}: raw content has an unmatched marked-content closing boundary.`);
            else boundaryDepth--;
          }
        }
        for (const token of contentNames(bytes)) {
          if (token === 'ActualText') reasons.push('ActualText replacements are not yet joined to extracted evidence.');
          if (token === 'OC') reasons.push('Optional content layers are outside this profile.');
          if (token === 'INLINE_IMAGE') reasons.push('Inline image streams require additional coverage analysis.');
        }
      } catch (error) { reasons.push(`Raw content inspection did not complete: ${error.message}`); }
    }
    if (boundaryDepth && !opaqueBoundary) onContentError(`Page ${pageIndex + 1}: raw content has ${boundaryDepth} unclosed marked-content sequence(s).`);
  }
  return [...new Set(reasons)];
}

// Read PDF names without mistaking literal strings, hex strings, or comments for names.
// Inline image binary data is deliberately outside this scanner's scope.
function* contentNames(bytes) {
  const text = new TextDecoder('latin1').decode(bytes);
  const delimiter = /[\s\x00()[\]<>/%]/;
  let i = 0;
  while (i < text.length) {
    const char = text[i++];
    if (char === '%') { while (i < text.length && !/[\r\n]/.test(text[i])) i++; }
    else if (char === '(') {
      let depth = 1;
      while (i < text.length && depth) { const c = text[i++]; if (c === '\\') i++; else if (c === '(') depth++; else if (c === ')') depth--; }
    } else if (char === '<' && text[i] !== '<') { while (i < text.length && text[i++] !== '>') { /* hex string */ } }
    else if (char === '<' && text[i] === '<') i++;
    else if (char === '/') {
      const start = i; while (i < text.length && !delimiter.test(text[i])) i++;
      yield text.slice(start, i).replace(/#([\da-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    } else if (char === 'B' && text[i] === 'I' && (i < 2 || delimiter.test(text[i - 2])) && delimiter.test(text[i + 1] || ' ')) {
      yield 'INLINE_IMAGE'; return;
    }
  }
}


// Operators only: ignore comments, literal/hex strings and PDF names. Content
// arrays form one logical page stream, so callers carry nesting across streams.
function* rawBoundaryTokens(bytes) {
  const text = new TextDecoder('latin1').decode(bytes);
  const delimiter = /[\s\x00()[\]<>/%]/;
  let i = 0;
  while (i < text.length) {
    const c = text[i++];
    if (c === '%') { while (i < text.length && !/[\r\n]/.test(text[i])) i++; }
    else if (c === '(') {
      let depth = 1;
      while (i < text.length && depth) { const n = text[i++]; if (n === '\\') i++; else if (n === '(') depth++; else if (n === ')') depth--; }
    } else if (c === '<' && text[i] !== '<') { while (i < text.length && text[i++] !== '>') { /* hex string */ } }
    else if (c === '<' && text[i] === '<') i++;
    else if (c === '/') { while (i < text.length && !delimiter.test(text[i])) i++; }
    else if (!delimiter.test(c)) {
      const start = i - 1; while (i < text.length && !delimiter.test(text[i])) i++;
      const token = text.slice(start,i);
      if (['BMC','BDC','EMC','BI'].includes(token)) { yield token; if (token === 'BI') return; }
    }
  }
}
