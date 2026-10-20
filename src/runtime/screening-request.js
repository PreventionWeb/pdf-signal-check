import { buildDocumentEvidence } from '../engine/topic-retrieval.js';
import { factSentences } from '../engine/consistency.js';
/** The flag-only comparisons: image descriptions with captions, contents entries with headings, sentences stating quantities. */
const flagInputs = report => ({
  figures: (report.figureDescriptions?.items || []).filter(item => item.context && !item.flags.length).map(item => ({ id: item.id, alt: item.alt, caption: item.context.text })),
  contents: (report.consistency?.items || []).filter(item => item.kind === 'contents-wording' && item.headings?.length).map(item => ({ id: item.id, entry: item.entry.text, headings: item.headings })),
  facts: report.analysisComplete ? factSentences(report) : [],
});
/** Same bounded evidence for single-file and queued screening. */
export function buildScreeningRequest(report,{modelId,checks,requestId,languageAssumption=null,requireInference=true,semanticExperiment=false}={}) {
  const sections=[];
  for(const page of report.pages.slice(0,3)){let section=null;for(const b of page.logicalBlocks){if(/^H[1-6]?$/.test(b.role || '')){if(section?.body.text.trim())sections.push(section);section={heading:{...b,page:page.number,keys:b.key?[b.key]:[]},body:{page:page.number,text:'',keys:[]}};}else if(section && section.body.text.length<1200){section.body.text+=`${b.text} `;if(b.key)section.body.keys.push(b.key);}}if(section?.body.text.trim())sections.push(section);}
  // Saved descriptions and keywords are compared with passages from across the PDF, not only its opening pages.
  return {...flagInputs(report),documentEvidence: buildDocumentEvidence(report.pages), requestId,modelId,requireInference,checks:[...checks],languageAssumption,metadata:report.metadata,names:(report.consistency?.items || []).filter(item=>item.severity==='unresolved'&&item.left).slice(0,8).map(item=>({id:item.id,left:item.left.text,right:item.right.text})),candidates:report.metadataConsistency.candidates,deterministicTitle:report.metadataConsistency,sections:sections.slice(0,8),openingEvidence:report.pages.slice(0,2).flatMap(p=>p.logicalBlocks.length?p.logicalBlocks.map(b=>({...b,page:p.number,source:'tagged opening text'})):p.blocks.map(b=>({...b,page:p.number,source:'opening text'})))};
}
