import {PDFArray, PDFDict, PDFHexString, PDFName, PDFNumber, PDFRawStream, PDFRef, PDFString} from 'pdf-lib';

export const ATTACHMENT_LIMITS = {maxObjects: 20000, maxDepth: 64, maxFiles: 100, maxAssociations: 24, maxTextLength: 1024};
// ISO 32000-2 base relationships; other names may be legitimate extensions.
const relationships = new Set(['Source','Data','Alternative','Supplement','EncryptedPayload','FormData','Schema','Unspecified']);
const pdfName = value => value instanceof PDFName ? value.decodeText() : null;

/** Inventory reachable declarations only. Never decode, copy, open, or execute an embedded payload. */
export function inspectAttachments(doc, options = {}) {
  const limits = {...ATTACHMENT_LIMITS, ...options}, files = [], warnings = [], fileMap = new Map(), knownStreams = new Set(), reachableStreams = new Map(), orphanStreams = [];
  let visitedObjects = 0, inventoryComplete = true;
  const warn = message => { inventoryComplete = false; const bounded=message.slice(0,1024); if (warnings.length < 40 && !warnings.includes(bounded)) warnings.push(bounded); };
  const declaredName = (value,path) => {
    const result=pdfName(value);
    if (result && result.length>limits.maxTextLength) { warn(`Name declaration truncated at ${path}.`); return result.slice(0,limits.maxTextLength); }
    return result;
  };
  const budget = depth => {
    if (++visitedObjects > limits.maxObjects || depth > limits.maxDepth) { warn('Attachment inventory traversal limit reached; absence or completeness cannot be established.'); return false; }
    return true;
  };
  const resolve = (value, required = false, path = '') => {
    if (!(value instanceof PDFRef)) return value;
    try {
      const result = doc.context.lookup(value);
      if (!result && required) warn(`Unresolved attachment reference at ${path}.`);
      return result;
    } catch { if (required) warn(`Unreadable attachment reference at ${path}.`); return undefined; }
  };
  const get = (dict, key, required = false, path = '') => resolve(dict?.get(PDFName.of(key)), required, path);
  const text = (value, path) => {
    const object = resolve(value, true, path);
    if (object == null) return null;
    if (!(object instanceof PDFString || object instanceof PDFHexString)) { warn(`Invalid string declaration at ${path}.`); return null; }
    const result = object.decodeText();
    if (result.length > limits.maxTextLength) { warn(`Metadata text truncated at ${path}.`); return result.slice(0, limits.maxTextLength); }
    return result;
  };
  const size = (value, path) => {
    const object = resolve(value, true, path);
    if (object == null) return null;
    const result = object instanceof PDFNumber ? object.asNumber() : NaN;
    if (!Number.isSafeInteger(result) || result < 0) { warn(`Invalid size declaration at ${path}.`); return null; }
    return result;
  };
  function appendStream(file, reference, key, path, relatedFilename = null) {
    const stream = resolve(reference, true, path);
    if (!(stream instanceof PDFRawStream)) { warn(`Embedded-file reference is not a raw stream at ${path}.`); return; }
    knownStreams.add(stream);
    if (pdfName(get(stream.dict,'Type')) !== 'EmbeddedFile') file.guidanceIssues.push(`Embedded stream ${key} lacks the EmbeddedFile Type declaration.`);
    const params = get(stream.dict,'Params',true,`${path}/Params`);
    if (params != null && !(params instanceof PDFDict)) warn(`Embedded stream Params is not a dictionary at ${path}.`);
    file.payloads.push({key, streamRef:reference instanceof PDFRef ? reference.toString() : null, relatedFilename,
      mediaType:declaredName(get(stream.dict,'Subtype'),`${path}/Subtype`), encodedBytes:stream.getContentsSize(),
      declaredDecodedBytes:params instanceof PDFDict ? size(params.get(PDFName.of('Size')),`${path}/Params/Size`) : null});
  }
  function addFile(value, association, alias = null) {
    const dict = resolve(value, true, association.path);
    if (!(dict instanceof PDFDict)) { warn(`Attachment file specification is not a dictionary at ${association.path}.`); return; }
    let file = fileMap.get(dict);
    if (!file) {
      if (files.length >= limits.maxFiles) { warn('Attachment inventory file limit reached; further records omitted.'); return; }
      const type = pdfName(get(dict, 'Type'));
      const relationship = declaredName(get(dict, 'AFRelationship', true, `${association.path}/AFRelationship`),`${association.path}/AFRelationship`);
      file = {id: value instanceof PDFRef ? value.toString() : `direct-filespec-${files.length+1}`,
        filename: text(dict.get(PDFName.of('F')), `${association.path}/F`),
        unicodeFilename: text(dict.get(PDFName.of('UF')), `${association.path}/UF`),
        description: text(dict.get(PDFName.of('Desc')), `${association.path}/Desc`),
        relationship, relationshipRecognized: relationships.has(relationship), aliases: [], associations: [],
        embedded: dict.has(PDFName.of('EF')) || dict.has(PDFName.of('RF')), payloads: [], guidanceIssues: []};
      files.push(file); fileMap.set(dict, file);
      if (type && type !== 'Filespec') warn(`Unexpected file specification type at ${association.path}.`);
      if (!type) file.guidanceIssues.push('File specification Type is not declared.');
      if (!file.filename && !file.unicodeFilename) file.guidanceIssues.push('No filename declaration was recovered.');
      if (!file.description?.trim()) file.guidanceIssues.push('No description explains the attached or referenced file.');
      if (!relationship || relationship === 'Unspecified') file.guidanceIssues.push('No specific AFRelationship explains how this file relates to the PDF.');
      else if (!file.relationshipRecognized) file.guidanceIssues.push('AFRelationship is an unrecognized or extension name; its meaning has not been verified.');
      if (dict.has(PDFName.of('EF'))) {
        const ef = get(dict, 'EF', true, `${association.path}/EF`);
        if (!(ef instanceof PDFDict)) warn(`Embedded-file EF declaration is not a dictionary at ${association.path}.`);
        else {
          const entries = ef.entries();
          if (!entries.length) warn(`Embedded-file EF dictionary has no stream reference at ${association.path}.`);
          if (entries.length > 8) warn(`Embedded-file stream-entry limit reached at ${association.path}.`);
          for (const [key, reference] of entries.slice(0,8)) {
            const label=declaredName(key,`${association.path}/EF`);
            appendStream(file,reference,label,`${association.path}/EF/${label}`);
          }
        }
      }
      if (dict.has(PDFName.of('RF'))) {
        const rf = get(dict,'RF',true,`${association.path}/RF`);
        if (!(rf instanceof PDFDict)) warn(`Related-file RF declaration is not a dictionary at ${association.path}.`);
        else {
          const entries = rf.entries();
          if (!entries.length || entries.length>8) warn(`Empty or limited related-file RF declaration at ${association.path}.`);
          for (const [key,value] of entries.slice(0,8)) {
            const label=declaredName(key,`${association.path}/RF`);
            const pairs = resolve(value,true,`${association.path}/RF/${label}`);
            if (!(pairs instanceof PDFArray) || !pairs.size() || pairs.size()%2 || pairs.size()>32) warn(`Invalid or limited related-file name/stream pairs at ${association.path}.`);
            if (pairs instanceof PDFArray) for(let i=0;i+1<Math.min(pairs.size(),32);i+=2) {
              const relatedFilename = text(pairs.get(i),`${association.path}/RF/Name[${i}]`);
              appendStream(file,pairs.get(i+1),`RF/${label}[${i+1}]`,`${association.path}/RF/${label}[${i+1}]`,relatedFilename);
            }
          }
        }
      }
      if (file.embedded && !file.payloads.some(payload=>payload.mediaType)) file.guidanceIssues.push('No embedded MIME type declaration was recovered.');
    }
    if (alias != null && !file.aliases.includes(alias)) {
      if (file.aliases.length >= limits.maxAssociations) warn('Attachment name-tree alias limit reached.'); else file.aliases.push(alias);
    }
    if (!file.associations.some(item => item.path === association.path && item.kind === association.kind)) {
      if (file.associations.length >= limits.maxAssociations) warn('Attachment association limit reached; further contexts omitted.');
      else file.associations.push({...association, path: association.path.slice(0,512)});
    }
    if (association.kind === 'embedded-name-tree' && !file.embedded) warn('EmbeddedFiles name tree contains a file specification without an EF declaration.');
    if (association.kind === 'file-attachment-annotation' && !file.embedded) warn('FileAttachment annotation refers to a file specification without an embedded EF declaration.');
  }
  const nameVisited = new Set();
  function names(value, path, depth = 0) {
    if (!budget(depth)) return;
    const dict = resolve(value, true, path);
    if (!(dict instanceof PDFDict)) { warn(`Invalid EmbeddedFiles name-tree node at ${path}.`); return; }
    if (nameVisited.has(dict)) { warn('Cyclic or shared EmbeddedFiles name-tree node; inventory completeness is unknown.'); return; }
    nameVisited.add(dict);
    const pairs = get(dict,'Names',true,path);
    if (pairs != null) {
      if (!(pairs instanceof PDFArray) || pairs.size()%2) warn(`Invalid EmbeddedFiles name pairs at ${path}.`);
      if (pairs instanceof PDFArray) for (let i=0; i+1<pairs.size(); i+=2) {
        if (!budget(depth+1)) break;
        addFile(pairs.get(i+1), {kind:'embedded-name-tree',path:`${path}/Names[${i+1}]`,page:null}, text(pairs.get(i), `${path}/Names[${i}]`));
      }
    }
    const kids = get(dict,'Kids',true,path);
    if (pairs == null && kids == null) warn(`EmbeddedFiles name-tree node has neither Names nor Kids at ${path}.`);
    if (kids != null && !(kids instanceof PDFArray)) warn(`Invalid EmbeddedFiles name-tree Kids at ${path}.`);
    if (kids instanceof PDFArray) for (let i=0; i<kids.size(); i++) { if (visitedObjects > limits.maxObjects) break; names(kids.get(i),`${path}/Kids[${i}]`,depth+1); }
  }
  const namesDict = get(doc.catalog,'Names',true,'Catalog/Names');
  if (namesDict != null && !(namesDict instanceof PDFDict)) warn('Catalog Names dictionary is unreadable; embedded-file listing is unknown.');
  if (namesDict instanceof PDFDict && namesDict.has(PDFName.of('EmbeddedFiles'))) names(namesDict.get(PDFName.of('EmbeddedFiles')),'Catalog/Names/EmbeddedFiles');
  const pageNumbers = new Map(doc.getPages().map((page,index)=>[page.node,index+1]));
  const seen = new Set();
  function walk(value,path,depth=0,inheritedPage=null) {
    if (!budget(depth)) return;
    if (path.length>512) { warn('Attachment context path truncated; precise association context is incomplete.'); path=path.slice(0,512); }
    const object = resolve(value,true,path);
    if (object == null || seen.has(object)) return;
    if (!(object instanceof PDFDict || object instanceof PDFArray || object instanceof PDFRawStream)) return;
    seen.add(object);
    if (object instanceof PDFArray) {
      for (let i=0;i<object.size();i++) { if (visitedObjects>limits.maxObjects) break; walk(object.get(i),`${path}[${i}]`,depth+1,inheritedPage); }
      return;
    }
    const dict = object instanceof PDFRawStream ? object.dict : object;
    const page = pageNumbers.get(dict) || pageNumbers.get(get(dict,'Pg')) || inheritedPage;
    if (dict.has(PDFName.of('AF'))) {
      const af = get(dict,'AF',true,`${path}/AF`);
      if (!(af instanceof PDFArray)) warn(`Associated-file AF entry is not an array at ${path}.`);
      else for (let i=0;i<af.size();i++) { if (!budget(depth+1)) break; addFile(af.get(i),{kind:'associated-file',path:`${path}/AF[${i}]`,page}); }
    }
    if (pdfName(get(dict,'Subtype')) === 'FileAttachment') {
      if (!dict.has(PDFName.of('FS'))) warn(`FileAttachment annotation has no file specification at ${path}.`);
      else addFile(dict.get(PDFName.of('FS')),{kind:'file-attachment-annotation',path:`${path}/FS`,page});
    }
    if (dict.has(PDFName.of('EF')) || dict.has(PDFName.of('RF'))) addFile(value,{kind:'reachable-filespec',path,page});
    if (object instanceof PDFRawStream && pdfName(get(dict,'Type')) === 'EmbeddedFile') reachableStreams.set(object,{path,streamRef:value instanceof PDFRef?value.toString():null});
    // Dictionary/array graph only: no content-stream tokenization and no stream decoding.
    for (const [key, child] of dict.entries()) {
      if (visitedObjects>limits.maxObjects) break;
      const label=key.decodeText();
      if (label.length>128) warn('Dictionary-key context segment truncated; precise attachment context is incomplete.');
      walk(child,`${path}/${label.slice(0,128)}`,depth+1,page);
    }
  }
  walk(doc.catalog,'Catalog');
  const recordOrphan = (stream,origin,context) => {
    if (orphanStreams.length>=limits.maxFiles) { warn('Unassociated embedded-stream inventory limit reached.'); return; }
    orphanStreams.push({origin, ...context, mediaType:declaredName(get(stream.dict,'Subtype'),'Unassociated EmbeddedFile/Subtype'), encodedBytes:stream.getContentsSize()});
    warn(origin==='reachable-unassociated' ? 'A reachable EmbeddedFile stream has no inventoried file specification; attachment context is unresolved.' : 'An unreachable EmbeddedFile stream declaration remains in the object table. It may be an inactive remnant; content scope has not been established.');
  };
  for (const [stream,context] of reachableStreams) if (!knownStreams.has(stream)) recordOrphan(stream,'reachable-unassociated',context);
  // Raw object-table metadata only. Unreachable streams are remnants, never presented as active files.
  for (const [reference,object] of doc.context.enumerateIndirectObjects()) {
    if (!budget(0)) break;
    if (object instanceof PDFRawStream && pdfName(get(object.dict,'Type'))==='EmbeddedFile' && !knownStreams.has(object) && !reachableStreams.has(object)) recordOrphan(object,'unreachable-remnant',{streamRef:reference.toString(),path:null});
  }
  const embedded = files.some(file=>file.embedded);
  const status = !inventoryComplete ? 'uncertain' : files.length ? 'requires-review' : 'none';
  return {status, inventoryComplete, files, orphanStreams, warnings, payloadsAnalyzed:false, limits, visitedObjects,
    scope:'Bounded reachable catalog dictionary/array graph, including name trees, AF/RF entries, page/structure/annotation contexts and stream dictionaries, plus object-table EmbeddedFile stream metadata. Unreachable streams are labeled as possible remnants, not active attachments. Associated-file references inside content-stream instructions are not interpreted.',
    reason: !inventoryComplete ? 'Attachment declarations were only partially inventoried or their context is unresolved; absence and completeness are not established.' : embedded ? 'Embedded files are present. Their contents, declared types, sizes, safety and machine meaning have not been verified.' : files.length ? 'Associated external file references are declared; no referenced file was fetched or analyzed.' : 'No attachment declaration was found in the bounded reachable dictionary graph or raw EmbeddedFile object-table scan. Content-stream associated-file instructions are outside this inventory.'};
}
