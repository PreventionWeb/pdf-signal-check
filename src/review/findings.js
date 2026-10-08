const hash = value => { let n=2166136261; for(const c of String(value)) n=Math.imul(n^c.codePointAt(0),16777619); return (n>>>0).toString(16); };
const normalize = text => String(text || '').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
const advisoryCategory = result => (result?.method==='embedding-screening' && result?.inferencePerformed===false) || ['not-requested','unsupported-language','insufficient-evidence'].includes(result?.method) ? 'unassessed' :
  ['suspected-mismatch','requires-review'].includes(result?.status) ? 'advisory-concern' : result?.status==='match' || result?.status==='semantically-related' ? 'success' : 'uncertain';
const guidance = {
  semanticError:['Unavailable optional screening cannot establish semantic relatedness. Required profile outcomes remain independent.','Inspect the retained model/worker error and selected settings. Retry explicitly, choose another supported model, or continue with traditional checks; no inference success is implied.'],
  load:['Machines need a document their parsers can read.','Inspect the input file and parsing error. Obtain a fresh PDF export if the source is damaged.'],
  title:['A saved title can point to the wrong report or year even when the page looks clear.','Inspect Info/XMP title values and the printed publication title. Correct metadata in the source authoring tool, then regenerate and recheck.'],
  xmp:['Machine-readable metadata must be interpretable before its declared values can be trusted.','Inspect the original XML parsing reason and XMP serialization. Correct malformed XML or unsupported metadata constructs in the source exporter or metadata tool, regenerate the PDF, and recheck.'],
  required:['The required profile predicate has not established its outcome.','Inspect the original check result and available structural or metadata evidence using an appropriate validator or source authoring tool. Resolve the reported condition and recheck; no semantic similarity conclusion is implied.'],
  language:['Language declarations guide decoding and model eligibility; syntax does not prove the content language.','Set or correct the document’s language (for example, English) in your source document or PDF properties. Export again, then recheck. The setting should match the text’s language.'],
  text:['Suspicious decoding can give machines text different from the visible glyphs.','Inspect affected extracted text against the page. Re-export with correct font/Unicode mappings where possible.'],
  structure:['Tags identify headings, paragraphs and other parts of a document so screen readers and tools can follow its structure.','Inspect tag links and parent associations using the source authoring tool or a capable PDF tag editor; regenerate and recheck.'],
  coverage:['Unconnected text can disappear from structured extraction or lose its role.','Inspect highlighted untagged text and give meaningful content connected tags in the authoring source.'],
  'supported-content':['This is a limitation of the tool, not evidence that your figure or PDF is wrong. Figure tags and alternate-text presence are checked separately; image meaning is not analysed.','Review the listed scope limits. For figures, check that the alternate text or a nearby text/data equivalent conveys the important information. Use a suitable workflow for other excluded features.'],
  figureUnknown:['The graphic’s purpose and tag association have not been established. It could be meaningful content or decoration.','Decide whether the graphic conveys information. If meaningful, connect it to a Figure tag and add a useful alternate description in the source authoring tool, or supply an appropriate text/data equivalent. If purely decorative, mark it as an artifact. Re-export and check again.'],
  figure:['People listening to a report need the chart’s finding in words. Text descriptions also help software that cannot interpret the image. Finding a description does not prove it is accurate.','If a meaningful figure has no alternate text, add a useful description to its Figure tag in the source authoring tool. For charts, include key values and relationships, or supply a nearby text/data equivalent. If a graphic is decorative, mark it as an artifact after confirming its purpose. Check the description against the image yourself.'],
  'content-integrity':['Repeated identifiers or broken boundaries make content ownership ambiguous.','Inspect the named marked-content identifiers/boundaries. Correct the producing tool or regenerate the source PDF.'],
  completion:['Incomplete processing cannot establish the required profile.','Inspect the error or limit. Retry if appropriate, or use a workflow that supports this document; do not treat partial evidence as a pass.'],
  attachments:['Important source data can be embedded or referenced rather than visible in the PDF pages. Missing guidance can make a machine overlook it or use it incorrectly.','Inspect each file’s declared name, type, description, relationship and association. In the source publishing tool, document the file’s purpose and how machines should use it. Review payloads separately with an appropriate workflow; this tool does not open or analyse them.'],
  authors:['Wrong author metadata can attribute a publication to different people.','Compare Info Author, XMP creators and the explicit byline. Resolve initials, publisher/editor roles or aliases manually; correct the source metadata if wrong.'],
  order:['Tags can still put steps in the wrong order, so someone listening may hear what to do before the step it depends on.','Compare the tagged sequence and the named numbered/spatial detector with the intended procedure and page layout. Check whether numbering legitimately restarts before editing source tag order.'],
  orderMissing:['Without a recovered tagged sequence, this check cannot establish the order machines will follow.','Inspect the PDF tag tree in your authoring tool. Add or repair semantic tags if missing, and arrange them in the intended reading order across columns, paragraphs and figures. Re-export the PDF and check it again.'],
  orderUnconfirmed:['Recovered tags do not establish the intended reading order of the whole document.','Compare the recovered tagged text with the intended order on each page, especially across columns, paragraphs and figures. Inspect and correct the tag tree in your authoring tool where necessary.'],
  hiddenInstructions:['AI tools read text that people cannot see. Hidden instructions can steer AI summaries, reviews, search results or decisions about the document.','Ask whoever produced the PDF why the text is there. If it is not meant to be in the document, remove it from the source and export again.'],
  visibility:['Invisible extracted text can differ from content people see.','Compare extracted text with the rendered page; invisible OCR/accessibility text can be legitimate. Color, clipping and occlusion remain unverified.'],
  travel:['Links, bookmarks, saved publication details and data help people and tools find, understand and reuse a PDF. These are opportunities, separate from the required text checks.','Read the recorded evidence and the limits of each advisory. Make changes in the source document or publishing system, export again and recheck.'],
  semantic:['Topical relatedness is evidence to inspect, not proof of identity or truth.','Compare the bounded excerpts and metadata/heading. Check token truncation, later sections, alternate wording and the provisional model policy before changing source content.'],
};
const target = e => {
  if (!e || typeof e !== 'object' || !Number.isInteger(e.page) || e.page<1) return null;
  const keys = e.keys || (e.key ? [e.key] : []), blockIds = e.blockIds || (e.blockId!=null?[e.blockId]:e.id!=null?[e.id]:[]);
  if (!keys.length && !blockIds.length && !e.quads?.length && !e.quad) return null;
  return {page:e.page,keys,blockIds,node:e.node || null,text:e.text || '',...(e.quads?.length?{quads:e.quads}:e.quad?{quads:[e.quad]}:{})};
};
const targets = evidence => evidence.map(target).filter(Boolean);

/**
 * "Travel further" advisories. Unlinked cross-references and detached values are suspected problems (Check);
 * missing bookmarks, publication details and figure data are opportunities, never defects.
 */
function addTravelFindings(report, add) {
  const base = (id, field, result, extra) => ({ id, outcome: result.status, summary: result.reason, source: { path: field }, kind: 'travel', ...extra });
  const unassessed = (id, field, result, title) => result?.status === 'not-assessed' && report.analysisComplete === true &&
    add(base(id, field, result, { category: 'unassessed', title, method: 'travel-advisory' }));
  const refs = report.crossReferences;
  if (refs?.status === 'requires-review' || refs?.status === 'present') {
    const unlinked = (refs.references || []).filter(reference => reference.linked !== true);
    add(base('travel:cross-references', 'crossReferences', refs, { category: unlinked.length ? 'advisory-concern' : 'success',
      title: unlinked.length ? 'Cross-references without links' : 'Cross-references are linked', method: 'cross-reference-pattern-and-link-overlap',
      evidence: (unlinked.length ? unlinked : refs.references).map(reference => ({ page: reference.page, blockIds: [reference.blockId], ...(reference.quad ? { quad: reference.quad } : {}), text: reference.text })),
      comparison: { references: unlinked.map(({ page, text, context }) => ({ page, text, context })), linked: refs.linked, found: refs.found } }));
  } else unassessed('travel:cross-references', 'crossReferences', refs, 'Cross-references not checked');
  const detached = report.detachedValues;
  if (detached?.status === 'requires-review') add(base('travel:detached-values', 'detachedValues', detached, { category: 'advisory-concern',
    title: 'Values drawn apart from their labels', method: 'tag-and-drawing-order-comparison',
    // The number first (crops use the first target), then its label, so the page pin spans both.
    evidence: detached.findings.flatMap(item => [{ page: item.page, keys: [item.key], blockIds: item.blockIds, text: item.value },
      ...(item.labelBlockIds?.length ? [{ page: item.page, keys: [item.labelKey], blockIds: item.labelBlockIds, text: item.label }] : [])]),
    comparison: { values: detached.findings.map(({ page, value, label }) => ({ page, value, label })) } }));
  const links = report.links;
  // Untagged links are an aspiration, not a defect: suggest tagging them so screen readers announce them as links.
  if (links?.status === 'present') add(base('travel:links', 'links', links, { category: links.linksTagged === 'all' ? 'success' : 'opportunity', title: links.linksTagged === 'all' ? 'Links' : 'Untagged links', method: 'link-annotation-inventory',
    evidence: (links.links || []).slice(0, 50).map(link => `Page ${link.page}: ${link.target}${link.url ? ` ${link.url}` : ''}${link.contents ? ` (${link.contents})` : ''}`),
    comparison: { count: links.count, linksTagged: links.linksTagged } }));
  else unassessed('travel:links', 'links', links, 'Links not checked');
  const outline = report.outline;
  if (outline?.status === 'opportunity' || outline?.status === 'present') add(base('travel:outline', 'outline', outline, {
    category: outline.status === 'present' ? 'success' : 'opportunity', title: outline.status === 'present' ? 'Bookmarks' : 'No bookmarks', method: 'outline-inspection',
    evidence: (outline.titles || []).slice(0, 50).map(title => `Bookmark: ${title}`), comparison: { headings: outline.headings, count: outline.count, pages: report.file?.pages } }));
  else unassessed('travel:outline', 'outline', outline, 'Bookmarks not checked');
  const machine = report.machineMetadata;
  if (machine?.status === 'opportunity' || machine?.status === 'present') add(base('travel:metadata', 'machineMetadata', machine, {
    category: machine.status === 'present' ? 'success' : 'opportunity', title: 'Publication details for catalogues and search', method: 'metadata-property-inventory',
    evidence: [`Saved: ${machine.present.join(', ') || 'none'}`, `Not saved: ${machine.missing.join(', ') || 'none'}`, ...machine.structuredData.map(file => `Attached description: ${file.name || file.id} (${file.mediaTypes.join(', ') || 'type not declared'}; relationship ${file.relationship || 'not set'})`)],
    comparison: { missingPublication: machine.missingPublication, structuredData: machine.structuredData.length } }));
  else unassessed('travel:metadata', 'machineMetadata', machine, 'Publication details not checked');
  const data = report.figureData;
  if (data?.status === 'opportunity' || data?.status === 'present') {
    const without = data.items.filter(item => !item.hasEquivalent);
    add(base('travel:figure-data', 'figureData', data, { category: without.length ? 'opportunity' : 'success',
      title: without.length ? 'Figures without a data table or data file' : 'Figures have a data table or data file', method: 'figure-table-and-data-file-inventory',
      evidence: [...(without.length ? without : data.items).map(item => ({ page: item.page, keys: item.keys, node: item.node, quads: item.quads, text: 'Figure' })),
        ...data.tables.map(table => `Tagged table on page ${table.pages.join(', ') || 'unknown'}${table.headerCells ? ' with header cells' : ''}`),
        ...data.dataFiles.map(file => `Attached data file: ${file.name || file.id} (relationship ${file.relationship || 'not set'})`)],
      comparison: { figures: without.map(item => item.page), total: data.items.length } }));
  }
}

/** Normalizes completed reports only. Review annotations never modify engine outcomes. */
export function normalizeFindings(report) {
  const findings=[],seen=new Set(),pages=report.pages || [];
  const add = ({id,category,title,outcome,method,summary,evidence=[],comparison={},source,kind='semantic'}) => {
    if(seen.has(id))return;seen.add(id);
    const orderGuidance = kind === 'order' ? !pages.some(page => page.logicalBlocks?.some(block => block.text?.trim())) ? guidance.orderMissing : !report.readingOrder?.findings?.length ? guidance.orderUnconfirmed : guidance.order : null;
    const [whyItMatters,whatToInspect]=orderGuidance || guidance[kind] || (source?.checkId ? guidance.required : guidance.semantic);
    findings.push({id,category,title,outcome,method,summary,whyItMatters,whatToInspect,comparison,evidence,targets:targets(evidence),source});
  };
  for(const c of report.checks || []) {
    let evidence=[...(c.evidence || [])];
    if(c.id==='coverage' && c.status==='fail') evidence.push(...pages.flatMap(p=>p.blocks.filter(b=>!b.connected).map(b=>({...b,page:p.number,blockIds:[b.id]}))));
    if(c.id==='text' && c.status==='fail') evidence.push(...pages.flatMap(p=>p.blocks.filter(b=>b.suspicious).map(b=>({...b,page:p.number,blockIds:[b.id]}))));
    if(c.id==='supported-content' && c.status==='indeterminate') evidence.push(...pages.flatMap(p=>(p.graphics || []).map(g=>({...g,page:p.number,text:g.label}))));
    add({id:`required:${c.id}`,category:c.id==='supported-content' && c.status==='indeterminate'?'unassessed':c.status==='fail'?'required-defect':c.status==='pass'?'success':['not-applicable','not-assessed'].includes(c.status)?'unassessed':'required-indeterminate',
      title:c.id==='supported-content' && c.status==='indeterminate' ? 'Content this tool cannot fully assess' : c.label,outcome:c.status,method:'profile-rules',summary:c.summary,evidence,
      comparison:c.id==='title'?{metadata:{infoTitle:report.metadata?.infoTitle,xmpTitles:report.metadata?.xmpTitles}}:{},source:{path:`checks.${c.id}`,checkId:c.id},kind:c.id});
  }
  for (const [index, figure] of (report.figureAlternatives?.items || []).entries()) {
    const summary = !figure.tagged ? 'Graphic content was detected, but no unambiguous Figure tag was recovered for it. It may be meaningful or decorative; inspect its intended role.'
      : !figure.alt ? 'A Figure tag was found, but its alternate text is missing or empty.'
      : figure.status === 'uncertain' ? 'Alternate text is present, but tag connection problems prevent a reliable association with page content.'
      : 'A connected Figure tag has non-empty alternate text. Its accuracy and the image’s meaning have not been analysed.';
    add({id:`figure:${figure.id}`, category:figure.status==='requires-review'?'advisory-concern':figure.status==='present'?'success':'uncertain',
      title:!figure.tagged?'Graphics without a recovered figure tag':figure.alt?'Figure alternate text present':'Figure alternate text missing',
      outcome:figure.status, method:'figure-alternative-inspection', summary,
      evidence:[...(figure.alt ? [`Alternate text: ${figure.alt}`] : []), {page:figure.page,keys:figure.keys,node:figure.node,quads:figure.quads,text:figure.tagged?'Figure content':'Graphic content'}],
      comparison:{figure, figureNumber: report.figureAlternatives.items.slice(0, index + 1).filter(item => item.page === figure.page).length}, source:{path:`figureAlternatives.items[${index}]`}, kind:figure.tagged?'figure':'figureUnknown'});
  }
  for (const [index, figure] of (report.figureAlternatives?.decorativeItems || []).entries()) {
    add({ id: `figure:${figure.id}`, category: 'uncertain', title: 'Graphics marked as decorative',
      outcome: 'uncertain', method: 'figure-alternative-inspection',
      summary: 'These graphics are marked as decoration and excluded from the reading sequence. Check that they do not convey essential information.',
      evidence: [{ page: figure.page, keys: [], quads: figure.quads, text: 'Declared decorative graphics' }],
      comparison: { figure }, source: { path: `figureAlternatives.decorativeItems[${index}]` }, kind: 'figureDecorative' });
  }
  const identity=(field,id,title,kind,comparison)=>{
    const r=report[field];if(!r)return;
    add({id,category:advisoryCategory(r),title,outcome:r.status,method:r.method || ({authors:'explicit-byline-rules',order:'numbered-and-spatial-order-heuristics',visibility:'text-rendering-mode-inspection',title:'publication-title-rules'}[kind] || 'deterministic-rules'),summary:r.reason,evidence:r.evidence || r.publicationCandidates || r.candidates || [],comparison,source:{path:field},kind});
  };
  identity('metadataConsistency','identity:title','Publication title comparison','title',{metadata:{infoTitle:report.metadata?.infoTitle,xmpTitles:report.metadata?.xmpTitles},candidates:report.metadataConsistency?.publicationCandidates || report.metadataConsistency?.candidates || []});
  identity('authorConsistency','identity:authors','Author/byline comparison','authors',{metadata:{infoAuthor:report.metadata?.author,xmpAuthors:report.metadata?.xmpAuthors},candidates:report.authorConsistency?.evidence || []});
  identity('readingOrder','advisory:reading-order','Reading-order comparison','order',{readingSequenceMissing: report.analysisComplete === true && !pages.some(page => page.logicalBlocks?.some(block => block.text?.trim())), sequence:report.readingOrder?.evidence || [],detectors:(report.readingOrder?.findings || []).map(f=>f.detector)});
  identity('textVisibility','advisory:visibility','Extracted text visibility','visibility',{});
  const hidden=report.hiddenInstructions;
  if(hidden && hidden.status!=='not-assessed') add({id:'advisory:hidden-instructions',category:hidden.status==='requires-review'?'advisory-concern':'success',title:'Hidden instructions for AI tools',
    outcome:hidden.status,method:'hidden-text-pattern-screening',summary:hidden.reason,comparison:{matches:hidden.matches || [],scanned:hidden.scanned},source:{path:'hiddenInstructions'},kind:'hiddenInstructions',
    evidence:(hidden.matches || []).map(match=>match.quads?.length && match.page ? {page:match.page,quads:match.quads,text:match.text} : `${match.field || match.kind}: ${match.text}`)});
  if(report.attachments){const a=report.attachments,files=a.files || [],evidence=files.map(file=>`File: ${file.unicodeFilename || file.filename || `Unnamed (${file.id})`}; ${file.embedded?(file.payloads?.length?'located embedded payload stream(s)':'embedded-file declaration; no payload stream located'):'associated reference only'}; declared media type: ${(file.payloads || []).map(p=>p.mediaType || 'not declared').join(', ') || 'not declared'}; description: ${file.description || 'not set'}; declared relationship: ${file.relationship || 'not set'}; related filename declarations: ${(file.payloads || []).map(p=>p.relatedFilename).filter(Boolean).join(', ') || 'none recovered'}; guidance: ${(file.guidanceIssues || []).map(i=>typeof i==='string'?i:i.message || JSON.stringify(i)).join('; ') || 'no missing-declaration issue recorded; instruction usability is not verified'}.`);evidence.push(...(a.orphanStreams || []).map(stream=>`Unlinked embedded payload declaration: ${stream.origin || 'unknown origin'}; reference ${stream.streamRef || 'not recovered'}; declared media type ${stream.mediaType || 'not declared'}; encoded size ${stream.encodedBytes ?? 'unknown'} bytes; context ${stream.path || 'not recovered'}. It is not established as an active attachment.`));evidence.push(...(a.warnings || []).map(w=>typeof w==='string'?w:w.message || JSON.stringify(w)));add({id:'advisory:attachments',category:a.status==='none'&&a.inventoryComplete===true?'success':a.status==='requires-review'?'advisory-concern':a.status==='not-assessed'?'unassessed':'uncertain',title:'Embedded and associated files',outcome:a.status,method:'attachment-metadata-inspection',summary:a.reason,evidence,comparison:{inventory:a},source:{path:'attachments'},kind:'attachments'});}
  addTravelFindings(report, add);
  const semantic=report.semantic;
  if(!semantic) add({id:'semantic:unassessed',category:'unassessed',title:'AI screening not completed',outcome:'not-assessed',method:'not-requested',summary:'No completed model screening is available.',source:{path:'semantic'}});
  else if(semantic.status==='skipped')add({id:'semantic:skipped',category:'unassessed',title:'Requested AI screening skipped',outcome:'skipped',method:semantic.skipReason||'screening-skipped',summary:semantic.reason||'The requested optional screening was not performed.',comparison:{model:semantic.model||null,requestedChecks:semantic.requestedChecks||[],skipReason:semantic.skipReason||null},source:{path:'semantic'},kind:'semanticError'});
  else if(semantic.status==='error')add({id:'semantic:error',category:'unassessed',title:'AI screening unavailable',outcome:'error',method:semantic.errorStage==='model-init'?'model-initialization-failed':'screening-failed',summary:semantic.error||'No completed model screening is available.',comparison:{model:semantic.model||null,requestedChecks:semantic.requestedChecks||[],errorStage:semantic.errorStage||null,errorCode:semantic.errorCode||null},source:{path:'semantic'},kind:'semanticError'});
  else {
    for(const field of ['title','titleAI','subject','keywords','sections']) {
      const r=semantic[field];if(!r)continue;
      // Title fast-path reproduces an existing identity finding. Per-item results replace aggregates.
      if(field==='title' && r.method==='deterministic-rules')continue;
      const items=field==='keywords'?semantic.keywordItems || []:field==='sections'?semantic.sectionItems || []:[];
      if(items.length) {
        items.forEach((item,i)=>{
          const identity=field==='keywords'?normalize(item.keyword):`${item.heading?.page}:${(item.heading?.keys || []).slice().sort().join('|') || item.heading?.node || normalize(item.heading?.text)}`;
          add({id:`semantic:${field}:${hash(identity)}`,category:advisoryCategory(item),title:field==='keywords'?`Keyword: ${item.keyword}`:`Heading: ${item.heading?.text || 'Tagged heading'}`,outcome:item.status,method:item.method || 'embedding-screening',summary:item.reason,evidence:[...(item.heading?[item.heading]:[]),...(item.evidence || [])],comparison:{retrieval:item.retrieval,query:field==='keywords'?item.keyword:item.heading?.text,candidates:item.evidence || [],queryInput:item.queryInput,model:semantic.model},source:{path:`semantic.${field==='keywords'?'keywordItems':'sectionItems'}[${i}]`}});
        });
        const coverage=field==='keywords'?semantic.keywordCoverage:semantic.sectionCoverage;
        const skipped=field==='keywords'?coverage?.skippedTerms:coverage?.skippedPairs;
        if(skipped>0)add({id:`semantic:${field}:unassessed`,category:'unassessed',title:`Unassessed ${field}`,outcome:'not-assessed',method:'bounded-scope',summary:`${skipped} ${field==='keywords'?'terms/phrases':'supplied pairs'} were not screened within the selected bounds.`,comparison:{coverage},source:{path:`semantic.${field==='keywords'?'keywordCoverage':'sectionCoverage'}`}});
      } else add({id:`semantic:${field}`,category:advisoryCategory(r),title:field==='titleAI'?'AI title relatedness (separate from identity rules)':`${field[0].toUpperCase()+field.slice(1)} screening`,outcome:r.status,method:r.method || 'embedding-screening',summary:r.reason,evidence:r.evidence || [],comparison:{retrieval:r.retrieval,metadata:report.metadata,candidates:r.evidence || [],model:semantic.model},source:{path:`semantic.${field}`}});
    }
  }
  const order={'required-defect':0,'required-indeterminate':1,'advisory-concern':2,uncertain:3,opportunity:4,unassessed:5,success:6};
  findings.sort((a,b)=>order[a.category]-order[b.category] || a.id.localeCompare(b.id));
  const counts=Object.fromEntries(Object.keys(order).map(category=>[category,findings.filter(f=>f.category===category).length]));
  return {findings,reviewQueue:findings.filter(f=>['required-defect','required-indeterminate','advisory-concern'].includes(f.category)),counts};
}
