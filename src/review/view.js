import { card as createCard } from '../ui/patterns.js';
import { createElement } from '../ui/element.js';
import { helpTip } from '../help/popover.js';
import { findingProvenance } from './provenance.js';
const node=createElement;
const button=(text,action,cls='secondary')=>{const e=node('button',cls,text);e.type='button';e.onclick=action;return e;};
/** Findings are evidence-backed adapter output, never fixture labels. */
export function reviewView({normalized,report,flow,selectEvidence,comparison,refresh}) {
  const root=node('section','guided-review');
  const groups=[['problems','Problems to inspect',normalized.findings.filter(f=>['required-defect','required-indeterminate','advisory-concern'].includes(f.category))],['uncertainty','Uncertain or unassessed',normalized.findings.filter(f=>['uncertain','unassessed'].includes(f.category))],['success','What worked',normalized.findings.filter(f=>f.category==='success')]];
  const categories=node('fieldset','mg-segmented-control review-categories');
  categories.append(node('legend','mg-segmented-control__legend mg-u-sr-only','Finding groups'));
  const group=node('div','mg-segmented-control__group');categories.append(group);
  groups.forEach(([key,label,items])=>{
    const input=node('input','mg-segmented-control__input');input.type='radio';input.name='finding-group';input.value=key;input.id=`finding-group-${key}`;input.checked=flow.category===key;
    const option=node('label','mg-segmented-control__label',`${key==='problems'?'Problems':key==='uncertainty'?'Uncertain / unchecked':label} (${items.length})`);option.classList.remove('mg-form-label');option.htmlFor=input.id;
    input.onchange=()=>{if(!input.checked)return;flow.category=key;flow.issueId=null;refresh(false);document.getElementById(input.id)?.focus({preventScroll:true});};group.append(input,option);
  });root.append(categories);
  const currentGroup=groups.find(g=>g[0]===flow.category)[2];
  let index=currentGroup.findIndex(f=>f.id===flow.issueId);if(index<0)index=0;const finding=currentGroup[index];flow.issueId=finding?.id || null;
  if(!finding){
    const empty=node('section','review-empty mg-empty-state mg-empty-state--panel mg-empty-state--start mg-empty-state--compact');
    empty.append(node('h2','mg-empty-state__title',flow.category==='problems'?'No concrete problems found in completed checks.':'No findings in this group.'),node('p','mg-empty-state__description','Inspect the uncertain or unassessed scope before relying on the PDF. A profile pass does not establish correct metadata, reading order, or downstream AI accuracy.'));
    if(flow.category==='problems' && groups[1][2].length){const actions=node('div','mg-empty-state__actions');actions.append(button('Inspect uncertain or unassessed findings',()=>{flow.category='uncertainty';flow.issueId=null;refresh(true);}));empty.append(actions);}
    root.append(empty);return root;
  }
  const {root:frame,content:frameBody}=createCard('article','problem-frame');frame.dataset.findingId=finding.id;
  frameBody.append(node('p','eyebrow',`${index+1} of ${currentGroup.length} · ${finding.category.replaceAll('-',' ')}`));const h=node('h2','mg-card__title',finding.title);h.id='finding-title';h.tabIndex=-1;const labels={'suspected-mismatch':'Suspected mismatch','requires-review':'Requires review','not-assessed':'Not assessed','semantically-related':'Related; identity unconfirmed','uncertain':'Uncertain','match':'Match','fail':'Required defect','indeterminate':'Not established','pass':'Passed'};const method=findingProvenance(finding,report),methodLine=node('div','finding-provenance');methodLine.append(node('span','finding-method',labels[finding.outcome] || finding.outcome),node('span',`source-badge ${method.kind}`,`Source: ${method.label}`),helpTip(method.help,{label:`About this finding’s source: ${method.label}`,extraText:method.detail}));frameBody.append(h,methodLine);
  let hasComparison=false;if(comparison){const detail=comparison(finding);if(detail){frameBody.append(detail);hasComparison=true;}}if(!hasComparison)frameBody.append(node('p','',finding.summary));if(finding.source?.path!=='attachments'&&!frame.querySelector('.finding-crop-slot'))frameBody.append(node('div','finding-crop-slot'));const recorded=node('details','finding-technical');recorded.dataset.disclosureKey=`technical-${finding.id}`;recorded.append(node('summary','','Method and recorded evidence'),node('p','model-note',`${finding.outcome} · ${finding.method}`));
  const strings=(finding.evidence || []).filter(e=>typeof e==='string');
  if(strings.length){const list=node('ul','finding-raw-evidence');strings.slice(0,12).forEach(text=>list.append(node('li','',text)));recorded.append(node('h3','','Recorded evidence'),list);if(strings.length>12)recorded.append(node('p','model-note','First 12 evidence entries shown; full evidence is available below.'));}
  const details=finding.comparison || {};
  if(details.model || details.query || details.queryInput){
    const block=node('section','finding-inputs');block.append(node('h3','',method.kind==='ai'?'Completed screening inputs':'Recorded screening configuration'));
    if(details.model)block.append(node('p','',method.kind==='ai'?`Actual model configuration: ${details.model.label || details.model.id} · ${details.model.dtype || ''}. Selection preferences do not change this result.`:`Configured model for the run: ${details.model.label || details.model.id} · ${details.model.dtype || ''}. No completed inference is recorded for this check.`));
    const field=finding.source?.path?.split('.')[1], query=details.query || (field==='subject'?details.metadata?.subject:field==='title'?details.metadata?.infoTitle:field==='keywords'?details.metadata?.keywords:null);
    if(query)block.append(node('p','',`${method.kind==='ai'?'Compared':'Requested'} value: ${query}`));
    const inputReceipt=input=>{if(!input)return;const value=typeof input==='string'?{consumedText:input}:input;block.append(node('p','model-note',`Consumed input${Number.isFinite(value.consumedTokens)?`: ${value.consumedTokens} / ${value.inputTokens} tokens`:''}${value.truncated?' · truncated':''}`),node('p','',value.consumedText || 'Consumed text is recorded in the full evidence report.'));};
    if(method.kind==='ai'){inputReceipt(details.queryInput);
    (details.candidates || []).slice(0,6).forEach(e=>{block.append(node('p','',`${e.page?`Page ${e.page}: `:''}${e.text || e.source || ''}${Number.isFinite(e.similarity)?` · similarity ${e.similarity.toFixed(3)}`:''}`));inputReceipt(e.modelInput || e.inputProvenance);});
    block.append(node('p','model-note','Relatedness scores and thresholds are provisional. Consumed prefixes can be shorter than highlighted excerpts.'));}recorded.append(block);
  }
  frameBody.append(recorded);
  for(const [label,text] of [['Why inspect this?',finding.whyItMatters],['What to inspect or change',finding.whatToInspect]]){frameBody.append(node('h3','',label));if(Array.isArray(text)){const list=node('ul');text.forEach(t=>list.append(node('li','',typeof t==='string'?t:JSON.stringify(t))));frameBody.append(list);}else frameBody.append(node('p','',text || 'Compare the recovered evidence with the source document, then export a revised PDF and recheck it.'));}
  const evidence=node('div','finding-evidence');(finding.targets || []).slice(0,12).forEach(t=>evidence.append(button(t.page?`Inspect page ${t.page}: ${t.text || 'evidence'}`:'Document finding · no page location',()=>selectEvidence(t),'location-button')));
  if(!finding.targets?.length)evidence.append(node('p','model-note','No trustworthy page location is available for this finding.'));
  frameBody.append(evidence,node('p','model-note','This tool does not repair your PDF. Make changes in the source document or PDF authoring tool, then recheck the exported file.'));
  const actions=node('div','flow-actions');const previous=button('Previous',()=>{flow.issueId=currentGroup[index-1].id;refresh(true);});previous.disabled=index===0;const next=button('Next',()=>{flow.issueId=currentGroup[index+1].id;refresh(true);});next.disabled=index===currentGroup.length-1;
  const reviewed=button(flow.reviewed.has(finding.id)?'Reviewed ✓':'Mark reviewed',()=>{flow.reviewed.has(finding.id)?flow.reviewed.delete(finding.id):flow.reviewed.add(finding.id);refresh();});reviewed.id='finding-reviewed';reviewed.setAttribute('aria-pressed',String(flow.reviewed.has(finding.id)));actions.append(previous,reviewed,next);frameBody.append(actions,node('p','model-note','Reviewed records your inspection for this session. It does not resolve the finding or change machine results.'));root.append(frame);
  const overview=node('details','review-overview');overview.dataset.disclosureKey=`finding-list-${flow.category}`;overview.append(node('summary','','Jump to a finding'));currentGroup.forEach(f=>overview.append(button(`${flow.reviewed.has(f.id)?'✓ ':''}${f.title}`,()=>{flow.issueId=f.id;refresh(true);},'location-button')));root.append(overview);return root;
}
