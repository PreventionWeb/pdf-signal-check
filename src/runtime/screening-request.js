import { sectionEvidence } from '../engine/semantic.js';
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
  // Every tagged heading in the document with the text under it; the model's budget spreads its checks across them.
  const pages = report.pages || [];
  const sections=sectionEvidence(pages);
  // Saved descriptions and keywords are compared with passages from across the PDF, not only its opening pages.
  return {...flagInputs(report),documentEvidence: buildDocumentEvidence(pages), requestId,modelId,requireInference,checks:[...checks],languageAssumption,metadata:report.metadata,names:(report.consistency?.items || []).filter(item=>item.severity==='unresolved'&&item.left).slice(0,8).map(item=>({id:item.id,left:item.left.text,right:item.right.text})),candidates:report.metadataConsistency?.candidates || [],deterministicTitle:report.metadataConsistency,sections,openingEvidence:pages.slice(0,2).flatMap(p=>p.logicalBlocks?.length?p.logicalBlocks.map(b=>({...b,page:p.number,source:'tagged opening text'})):p.blocks.map(b=>({...b,page:p.number,source:'opening text'})))};
}
