/** Same bounded evidence for single-file and queued screening. */
export function buildScreeningRequest(report,{modelId,checks,requestId,languageAssumption=null,requireInference=true}={}) {
  const sections=[];
  for(const page of report.pages.slice(0,3)){let section=null;for(const b of page.logicalBlocks){if(/^H[1-6]?$/.test(b.role || '')){if(section?.body.text.trim())sections.push(section);section={heading:{...b,page:page.number,keys:b.key?[b.key]:[]},body:{page:page.number,text:'',keys:[]}};}else if(section && section.body.text.length<1200){section.body.text+=`${b.text} `;if(b.key)section.body.keys.push(b.key);}}if(section?.body.text.trim())sections.push(section);}
  return {requestId,modelId,requireInference,checks:[...checks],languageAssumption,metadata:report.metadata,candidates:report.metadataConsistency.candidates,deterministicTitle:report.metadataConsistency,sections:sections.slice(0,8),openingEvidence:report.pages.slice(0,2).flatMap(p=>p.logicalBlocks.length?p.logicalBlocks.map(b=>({...b,page:p.number,source:'tagged opening text'})):p.blocks.map(b=>({...b,page:p.number,source:'opening text'})))};
}
