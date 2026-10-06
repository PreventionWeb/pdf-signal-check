import { normalizeFindings } from '../review/findings.js';
export function captureSnapshot({report,file,reviewed=[]}) {
  if(!report)throw new Error('Complete an analysis before exporting.');
  const copy=structuredClone(report);
  return {report:copy,file,capturedAt:new Date().toISOString(),reviewed:[...reviewed],normalized:normalizeFindings(copy),source:{name:copy.file.name,bytes:copy.file.sourceBytes ?? file?.size,sha256:copy.file.sha256 || null}};
}
export const safeFilename=name=>String(name || 'pdf').replace(/\.pdf$/i,'').replace(/[^\p{L}\p{N}._-]+/gu,'-').slice(0,100) || 'pdf';
export function comparisonLines(finding,report) {
  const path=finding.source?.path || '',c=finding.comparison || {},lines=[];
  if(path==='metadataConsistency' || path==='checks.title') {lines.push(`Info title: ${report.metadata.infoTitle || 'Not set'}`);for(const t of report.metadata.xmpTitles || [])lines.push(`XMP title (${t.lang || 'unspecified'}): ${t.text}`);for(const t of c.candidates || [])lines.push(`Page ${t.page} ${t.source || t.role || 'title candidate'}: ${t.text}`);}
  else if(path==='authorConsistency') {lines.push(`Info authors: ${report.metadata.author || 'Not set'}`,`XMP authors: ${(report.metadata.xmpAuthors || []).join('; ') || 'Not set'}`);for(const t of c.candidates || [])lines.push(`Page ${t.page} byline: ${t.text}`);}
  else if(path==='readingOrder') {
    const numbered=b=>/^(?:H[1-6]?|Lbl)$/.test(b.role || '') && /^\s*\d{1,3}[.)]\s+\S/.test(b.text || '');
    const pages=[...new Set((finding.evidence || []).map(e=>e.page).filter(Boolean))];for(const n of pages){const p=report.pages.find(p=>p.number===n);const keys=new Set((finding.evidence || []).filter(e=>e.page===n).flatMap(e=>e.keys || (e.key?[e.key]:[])));if(p)for(const [label,field] of [['Tagged','logicalBlocks'],['Content stream','blocks']]){const selected=keys.size?p[field].filter(b=>keys.has(b.key)):p[field].filter(numbered);lines.push(`Page ${n} ${label}: ${selected.map(b=>b.text).join(' | ') || 'No comparable sequence recovered'}`);}}
  } else if(c.model){lines.push(`Completed model: ${c.model.label || c.model.id}; ${c.model.dtype || ''}`);const field=path.split('.')[1];const query=c.query || (field==='subject'?report.metadata.subject:field==='title'?report.metadata.infoTitle:null);if(query)lines.push(`Compared value: ${query}`);}
  return lines;
}
