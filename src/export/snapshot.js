import { findingProvenance, screeningProvenance } from '../review/provenance.js';
import { normalizeFindings } from '../review/findings.js';
import { findingGroups, groupHeadingFindings, groupFigureFindings, reviewSummary, fixCard } from '../review/workspace.js';
export function captureSnapshot({report,file}) {
  if(!report)throw new Error('Complete an analysis before exporting.');
  const copy=structuredClone(report);
  return {report:copy,file,capturedAt:new Date().toISOString(),normalized:normalizeFindings(copy),source:{name:copy.file.name,bytes:copy.file.sourceBytes ?? file?.size,sha256:copy.file.sha256 || null}};
}
export const safeFilename=name=>String(name || 'pdf').replace(/\.pdf$/i,'').replace(/[^\p{L}\p{N}._-]+/gu,'-').slice(0,100) || 'pdf';
export function comparisonLines(finding,report) {
  const path=finding.source?.path || '',c=finding.comparison || {},lines=[];
  if(path==='metadataConsistency' || path==='checks.title') {lines.push(`Info title: ${report.metadata.infoTitle || 'Not set'}`);for(const t of report.metadata.xmpTitles || [])lines.push(`XMP title (${t.lang || 'unspecified'}): ${t.text}`);for(const t of c.candidates || [])lines.push(`Page ${t.page} ${t.source || t.role || 'title candidate'}: ${t.text}`);}
  else if(path==='authorConsistency') {lines.push(`Info authors: ${report.metadata.author || 'Not set'}`,`XMP authors: ${(report.metadata.xmpAuthors || []).join('; ') || 'Not set'}`);for(const t of c.candidates || [])lines.push(`Page ${t.page} byline: ${t.text}`);}
  else if(path==='readingOrder') {
    const numbered=b=>/^(?:H[1-6]?|Lbl)$/.test(b.role || '') && /^\s*\d{1,3}[.)]\s+\S/.test(b.text || '');
    const pages=[...new Set((finding.evidence || []).map(e=>e.page).filter(Boolean))];for(const n of pages){const p=report.pages.find(p=>p.number===n);const keys=new Set((finding.evidence || []).filter(e=>e.page===n).flatMap(e=>e.keys || (e.key?[e.key]:[])));if(p)for(const [label,field] of [['Tagged','logicalBlocks'],['Content stream','blocks']]){const selected=keys.size?p[field].filter(b=>keys.has(b.key)):p[field].filter(numbered);lines.push(`Page ${n} ${label}: ${selected.map(b=>b.text).join(' | ') || 'No comparable sequence recovered'}`);}}
  } else if(c.model){const actual=findingProvenance(finding,report).kind==='ai';lines.push(`${actual?'Actual model for this check':'Configured model; no completed inference for this check'}: ${c.model.label || c.model.id}; ${c.model.dtype || ''}`);const field=path.split('.')[1];const query=c.query || (field==='subject'?report.metadata.subject:field==='title'?report.metadata.infoTitle:null);if(query)lines.push(`${actual?'Compared':'Requested'} value: ${query}`);}
  return lines;
}

export function screeningReceipt(report) {
  const provenance=screeningProvenance(report),semantic=report.semantic;
  const model=semantic?.model;
  return `${provenance.label}. ${provenance.detail}${model?` ${provenance.kind==='ai'?'Actual':'Configured'} model: ${model.label || model.id || 'unspecified'}; revision ${model.revision || 'unavailable'}; ${model.dtype || 'unavailable'}; ${model.pooling || 'unavailable'} pooling.`:''}`;
}

/** The designer hand-off: numbered Fix and Check items as the results screen shows them, from the captured report. */
export function fixSheet(snapshot) {
  const report=snapshot.report;
  const groups=groupFigureFindings(groupHeadingFindings(findingGroups(snapshot.normalized.findings)));
  const summary=reviewSummary(report,groups);
  let number=0;
  const memberLine=member=>{const figure=member.comparison?.figure;
    if(figure)return `Page ${figure.page}, ${figure.decorative?'decorative graphics':figure.tagged?`image ${member.comparison.figureNumber || 1}`:'unlabelled graphics'}`;
    const page=member.targets?.[0]?.page;return `“${member.comparison?.query || member.title.replace(/^Heading: /,'')}”${page?`, page ${page}`:''}`;};
  const entry=(item,bucket)=>({number:++number,bucket,...fixCard(item,report),
    // A one-region crop cannot show a sequence or page-wide decoration; those stay text-only.
    cropFindingId:item.figureGroup==='decorative' || item.source?.path==='readingOrder'?null:item.figureGroup?item.members[0].id:item.members?null:item.id,
    members:[...(item.members || []).map(memberLine),...(fixCard(item,report).also || []).map(text=>`Also fixes: ${text}`)]});
  return {headline:summary.headline,scope:summary.scope,fix:summary.buckets.fix.map(item=>entry(item,'fix')),check:summary.buckets.check.map(item=>entry(item,'check')),
    unknown:summary.buckets.unknown.map(item=>fixCard(item,report).title)};
}
