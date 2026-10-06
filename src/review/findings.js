const hash = value => { let n=2166136261; for(const c of String(value)) n=Math.imul(n^c.codePointAt(0),16777619); return (n>>>0).toString(16); };
const normalize = text => String(text || '').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
const advisoryCategory = result => (result?.method==='embedding-screening' && result?.inferencePerformed===false) || ['not-requested','unsupported-language','insufficient-evidence'].includes(result?.method) ? 'unassessed' :
  ['suspected-mismatch','requires-review'].includes(result?.status) ? 'advisory-concern' : result?.status==='match' || result?.status==='semantically-related' ? 'success' : 'uncertain';
const guidance = {
  semanticError:['Unavailable optional screening cannot establish semantic relatedness. Required profile outcomes remain independent.','Inspect the retained model/worker error and selected settings. Retry explicitly, choose another supported model, or continue with traditional checks; no inference success is implied.'],
  load:['Machines need a document their parsers can read.','Inspect the input file and parsing error. Obtain a fresh PDF export if the source is damaged.'],
  title:['Metadata can identify the wrong publication even when body text is extractable.','Inspect Info/XMP title values and the printed publication title. Correct metadata in the source authoring tool, then regenerate and recheck.'],
  xmp:['Machine-readable metadata must be interpretable before its declared values can be trusted.','Inspect the original XML parsing reason and XMP serialization. Correct malformed XML or unsupported metadata constructs in the source exporter or metadata tool, regenerate the PDF, and recheck.'],
  required:['The required profile predicate has not established its outcome.','Inspect the original check result and available structural or metadata evidence using an appropriate validator or source authoring tool. Resolve the reported condition and recheck; no semantic similarity conclusion is implied.'],
  language:['Language declarations guide decoding and model eligibility; syntax does not prove the content language.','Inspect the declaration against the document language and correct the source export if necessary.'],
  text:['Suspicious decoding can give machines text different from the visible glyphs.','Inspect affected extracted text against the page. Re-export with correct font/Unicode mappings where possible.'],
  structure:['Connected semantic tags let machines associate content with document relationships.','Inspect tag links and parent associations using the source authoring tool or a capable PDF tag editor; regenerate and recheck.'],
  coverage:['Unconnected text can disappear from structured extraction or lose its role.','Inspect highlighted untagged text and give meaningful content connected tags in the authoring source.'],
  'supported-content':['Excluded features prevent this text profile from establishing coverage.','Inspect the named unsupported content with a suitable validator or workflow. An indeterminate result does not prove that content is defective.'],
  'content-integrity':['Repeated identifiers or broken boundaries make content ownership ambiguous.','Inspect the named marked-content identifiers/boundaries. Correct the producing tool or regenerate the source PDF.'],
  completion:['Incomplete processing cannot establish the required profile.','Inspect the error or limit. Retry if appropriate, or use a workflow that supports this document; do not treat partial evidence as a pass.'],
  authors:['Wrong author metadata can attribute a publication to different people.','Compare Info Author, XMP creators and the explicit byline. Resolve initials, publisher/editor roles or aliases manually; correct the source metadata if wrong.'],
  order:['Connected tags can still present dependent steps in the wrong order.','Compare the tagged sequence and the named numbered/spatial detector with the intended procedure and page layout. Check whether numbering legitimately restarts before editing source tag order.'],
  visibility:['Invisible extracted text can differ from content people see.','Compare extracted text with the rendered page; invisible OCR/accessibility text can be legitimate. Color, clipping and occlusion remain unverified.'],
  semantic:['Topical relatedness is evidence to inspect, not proof of identity or truth.','Compare the bounded excerpts and metadata/heading. Check token truncation, later sections, alternate wording and the provisional model policy before changing source content.'],
};
const target = e => {
  if (!e || typeof e !== 'object' || !Number.isInteger(e.page) || e.page<1) return null;
  const keys = e.keys || (e.key ? [e.key] : []), blockIds = e.blockIds || (e.blockId!=null?[e.blockId]:e.id!=null?[e.id]:[]);
  if (!keys.length && !blockIds.length && !e.quads?.length && !e.quad) return null;
  return {page:e.page,keys,blockIds,node:e.node || null,text:e.text || '',...(e.quads?.length?{quads:e.quads}:e.quad?{quads:[e.quad]}:{})};
};
const targets = evidence => evidence.map(target).filter(Boolean);

/** Normalizes completed reports only. Review annotations never modify engine outcomes. */
export function normalizeFindings(report) {
  const findings=[],seen=new Set(),pages=report.pages || [];
  const add = ({id,category,title,outcome,method,summary,evidence=[],comparison={},source,kind='semantic'}) => {
    if(seen.has(id))return;seen.add(id);
    const [whyItMatters,whatToInspect]=guidance[kind] || (source?.checkId ? guidance.required : guidance.semantic);
    findings.push({id,category,title,outcome,method,summary,whyItMatters,whatToInspect,comparison,evidence,targets:targets(evidence),source});
  };
  for(const c of report.checks || []) {
    let evidence=[...(c.evidence || [])];
    if(c.id==='coverage' && c.status==='fail') evidence.push(...pages.flatMap(p=>p.blocks.filter(b=>!b.connected).map(b=>({...b,page:p.number,blockIds:[b.id]}))));
    if(c.id==='text' && c.status==='fail') evidence.push(...pages.flatMap(p=>p.blocks.filter(b=>b.suspicious).map(b=>({...b,page:p.number,blockIds:[b.id]}))));
    if(c.id==='supported-content' && c.status==='indeterminate') evidence.push(...pages.flatMap(p=>(p.graphics || []).map(g=>({...g,page:p.number,text:g.label}))));
    add({id:`required:${c.id}`,category:c.status==='fail'?'required-defect':c.status==='pass'?'success':['not-applicable','not-assessed'].includes(c.status)?'unassessed':'required-indeterminate',
      title:c.label,outcome:c.status,method:'profile-rules',summary:c.summary,evidence,
      comparison:c.id==='title'?{metadata:{infoTitle:report.metadata?.infoTitle,xmpTitles:report.metadata?.xmpTitles}}:{},source:{path:`checks.${c.id}`,checkId:c.id},kind:c.id});
  }
  const identity=(field,id,title,kind,comparison)=>{
    const r=report[field];if(!r)return;
    add({id,category:advisoryCategory(r),title,outcome:r.status,method:r.method || ({authors:'explicit-byline-rules',order:'numbered-and-spatial-order-heuristics',visibility:'text-rendering-mode-inspection',title:'publication-title-rules'}[kind] || 'deterministic-rules'),summary:r.reason,evidence:r.evidence || r.publicationCandidates || r.candidates || [],comparison,source:{path:field},kind});
  };
  identity('metadataConsistency','identity:title','Publication title comparison','title',{metadata:{infoTitle:report.metadata?.infoTitle,xmpTitles:report.metadata?.xmpTitles},candidates:report.metadataConsistency?.publicationCandidates || report.metadataConsistency?.candidates || []});
  identity('authorConsistency','identity:authors','Author/byline comparison','authors',{metadata:{infoAuthor:report.metadata?.author,xmpAuthors:report.metadata?.xmpAuthors},candidates:report.authorConsistency?.evidence || []});
  identity('readingOrder','advisory:reading-order','Bounded semantic order review','order',{sequence:report.readingOrder?.evidence || [],detectors:(report.readingOrder?.findings || []).map(f=>f.detector)});
  identity('textVisibility','advisory:visibility','Extracted text visibility','visibility',{});
  const semantic=report.semantic;
  if(!semantic) add({id:'semantic:unassessed',category:'unassessed',title:'Optional AI screening',outcome:'not-assessed',method:'not-requested',summary:'No completed optional model screening is available.',source:{path:'semantic'}});
  else if(semantic.status==='skipped')add({id:'semantic:skipped',category:'unassessed',title:'Requested AI screening skipped',outcome:'skipped',method:semantic.skipReason||'screening-skipped',summary:semantic.reason||'The requested optional screening was not performed.',comparison:{model:semantic.model||null,requestedChecks:semantic.requestedChecks||[],skipReason:semantic.skipReason||null},source:{path:'semantic'},kind:'semanticError'});
  else if(semantic.status==='error')add({id:'semantic:error',category:'unassessed',title:'Optional AI screening unavailable',outcome:'error',method:semantic.errorStage==='model-init'?'model-initialization-failed':'screening-failed',summary:semantic.error||'No completed model screening is available.',comparison:{model:semantic.model||null,requestedChecks:semantic.requestedChecks||[],errorStage:semantic.errorStage||null,errorCode:semantic.errorCode||null},source:{path:'semantic'},kind:'semanticError'});
  else {
    for(const field of ['title','subject','keywords','sections']) {
      const r=semantic[field];if(!r)continue;
      // Title fast-path reproduces an existing identity finding. Per-item results replace aggregates.
      if(field==='title' && r.method==='deterministic-rules')continue;
      const items=field==='keywords'?semantic.keywordItems || []:field==='sections'?semantic.sectionItems || []:[];
      if(items.length) {
        items.forEach((item,i)=>{
          const identity=field==='keywords'?normalize(item.keyword):`${item.heading?.page}:${(item.heading?.keys || []).slice().sort().join('|') || item.heading?.node || normalize(item.heading?.text)}`;
          add({id:`semantic:${field}:${hash(identity)}`,category:advisoryCategory(item),title:field==='keywords'?`Keyword: ${item.keyword}`:`Heading: ${item.heading?.text || 'Tagged heading'}`,outcome:item.status,method:item.method || 'embedding-screening',summary:item.reason,evidence:[...(item.heading?[item.heading]:[]),...(item.evidence || [])],comparison:{query:field==='keywords'?item.keyword:item.heading?.text,candidates:item.evidence || [],queryInput:item.queryInput,model:semantic.model},source:{path:`semantic.${field==='keywords'?'keywordItems':'sectionItems'}[${i}]`}});
        });
        const coverage=field==='keywords'?semantic.keywordCoverage:semantic.sectionCoverage;
        const skipped=field==='keywords'?coverage?.skippedTerms:coverage?.skippedPairs;
        if(skipped>0)add({id:`semantic:${field}:unassessed`,category:'unassessed',title:`Unassessed ${field}`,outcome:'not-assessed',method:'bounded-scope',summary:`${skipped} ${field==='keywords'?'terms/phrases':'supplied pairs'} were not screened within the selected bounds.`,comparison:{coverage},source:{path:`semantic.${field==='keywords'?'keywordCoverage':'sectionCoverage'}`}});
      } else add({id:`semantic:${field}`,category:advisoryCategory(r),title:`${field[0].toUpperCase()+field.slice(1)} screening`,outcome:r.status,method:r.method || 'embedding-screening',summary:r.reason,evidence:r.evidence || [],comparison:{metadata:report.metadata,candidates:r.evidence || [],model:semantic.model},source:{path:`semantic.${field}`}});
    }
  }
  const order={'required-defect':0,'required-indeterminate':1,'advisory-concern':2,uncertain:3,unassessed:4,success:5};
  findings.sort((a,b)=>order[a.category]-order[b.category] || a.id.localeCompare(b.id));
  const counts=Object.fromEntries(Object.keys(order).map(category=>[category,findings.filter(f=>f.category===category).length]));
  return {findings,reviewQueue:findings.filter(f=>['required-defect','required-indeterminate','advisory-concern'].includes(f.category)),counts};
}
