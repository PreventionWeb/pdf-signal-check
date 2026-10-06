import { card as createCard, notice, checkRow, formField } from './ui/patterns.js';
import { initializePresentationBrand } from './brand.js';
import { createElement, primaryButton, checkbox } from './ui/element.js';
import { createAttachmentView } from './review/attachment-view.js';
import { createIdentityComparison } from './review/identity-comparison.js';
import { createOrderComparison } from './review/order-comparison.js';
import { helpTip, helpLabel } from './help/popover.js';
import { screeningProvenance } from './review/provenance.js';
import { captureDisclosureState, restoreDisclosureState } from './view-state.js';
import { BatchView } from './batch/view.js';
import { buildScreeningRequest } from './runtime/screening-request.js';
import { createCalibrationView } from './calibration/view.js';
import { ExportController } from './export/controller.js';
import { EvidenceCropView } from './evidence/view.js';
import { normalizeFindings } from './review/findings.js';
import { reviewView } from './review/view.js';
import { GuidedFlow } from './flow.js';
import { initializeAiNotice } from './privacy-notice.js';
import { SEMANTIC_MODELS, getSemanticModel, supportsLanguage } from './engine/models.js';
import { Preview } from './preview.js';
import { candidateBlocks, findingTargets } from './geometry.js';
import './style.css';


initializePresentationBrand();

const $ = selector => document.querySelector(selector);
const el=createElement;
let batchReviewId=null;
let preview, sourceFile, knownExample, sourceDigest, summarySelection = null, extractionOrder = 'tagged';
const exampleLabels = new Map();
let worker, modelWorker, report, job = 0, modelRun = 0, modelBusy = false, analysisBusy = false;
let selectedModel = null, screeningChecks = new Set(['title','subject','keywords']), modelMessage = '';
let progressState = null;
const flow = new GuidedFlow(renderFlow);
const exports = new ExportController(()=>({report,file:sourceFile,reviewed:flow.reviewed}));
const cropView = new EvidenceCropView();
const deviceTest=createCalibrationView({getSelectedModel:()=>selectedModel || 'minilm',onBusy:value=>{if(value){stopModel();batchView.releaseIdleWorkers();}}});
const batchView=new BatchView({onOpen:openCompletedReport,onOwnership:()=>{++job;worker?.terminate();worker=null;stopModel();deviceTest.cancel();busy(false);},onClear:()=>{if(batchReviewId){exports.cancel();cropView.clear();preview?.destroy();preview=null;report=null;sourceFile=null;batchReviewId=null;$('#advanced-evidence').hidden=true;}},onState:state=>document.querySelectorAll('[data-batch-lock]').forEach(button=>button.disabled=state.running)});
const status = message => { $('#status').textContent = message; const messageNode=$('#flow-status'); if(messageNode)messageNode.textContent=message; };
function cancelAnalysis() { deviceTest.cancel();exports.cancel();cropView.clear();++job; worker?.terminate();worker=null; stopModel();busy(false);report=null;preview?.destroy();preview=null;progressState=null;status('Analysis canceled. Your selected file is retained; retry or choose another PDF.');flow.go('document'); }
function stopModel() { ++modelRun; modelWorker?.terminate(); modelWorker = null; modelBusy = false; }
function busy(value) {
  analysisBusy = value;
  $('#progress-area').hidden = !value;
  $('#cancel').hidden = !value;
  document.querySelectorAll('[data-sample], [data-example]').forEach(b => b.disabled = value);
  $('#load-calibration').disabled = value || !$('#calibration-select').value;
}

async function analyze(file, example = null) {
  if(batchView.busy){status('Stop the active queue before starting separate analysis.');return;}batchView.releaseIdleWorkers();batchReviewId=null;
  deviceTest.cancel();exports.cancel('Source changed; any active export was canceled.');cropView.clear();const currentJob = ++job;
  worker?.terminate(); stopModel(); preview?.destroy(); preview = null; sourceFile = file; knownExample = example; sourceDigest = null; summarySelection = null; selectedModel=null; modelMessage=''; report = null;
  $('#report').hidden = true; $('#empty-state').hidden = false; flow.reset();progressState=null;flow.go('processing-analysis');
  $('#status').className = '';
  $('#selected-file').replaceChildren(el('strong', '', file.name), el('span', '', `${(file.size / 1024 / 1024).toFixed(2)} MB`));
  $('#selected-file').hidden = false;
  $('#progress').value = 0;
  if (file.size > 50 * 1024 * 1024) { busy(false); flow.go('document'); status('This file exceeds the 50 MB limit. Choose a smaller PDF.'); return; }
  busy(true); status('Preparing local analysis…');
  try {
    const buffer = await file.arrayBuffer();
    try { const digest = await crypto.subtle.digest('SHA-256',buffer); if(currentJob===job)sourceDigest=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join(''); } catch { /* Hash unavailable; analysis remains usable. */ }
    if (currentJob !== job) return;
    worker = new Worker(new URL('./analysis.worker.js', import.meta.url), { type: 'module' });
    const error = message => { if(currentJob!==job)return; busy(false); $('#status').className = 'error-message'; status(message); worker?.terminate();flow.go('document'); };
    worker.onerror = event => error(`Analysis could not start: ${event.message || 'worker unavailable'}.`);
    worker.onmessage = ({ data }) => {
      if (currentJob !== job) return;
      if (data.type === 'progress') { progressState=data.progress; if(Number.isFinite(data.progress.percent))$('#progress').value=data.progress.percent; status(data.progress.phase); renderFlow(); }
      else if (data.type === 'error') error(data.message);
      else if (data.type === 'result') {
        report = data.report; if(/^en(?:-|$)/i.test(report.metadata.language || ''))selectedModel='minilm'; else if(supportsLanguage(getSemanticModel('granite-r2'),report.metadata.language))selectedModel='granite-r2'; if(sourceDigest)report.file.sha256=sourceDigest; report.file.sourceBytes=file.size; busy(false); status('Analysis complete. Your file was processed locally.');
        preview = new Preview(); preview.load(sourceFile, report); renderReport();flow.go('checks'); worker.terminate(); worker = null;
      }
    };
    worker.postMessage({ buffer, fileName: file.name }, [buffer]);
  } catch (error) { if (currentJob === job) { busy(false); status(error.message);flow.go('document'); } }
}

function openCompletedReport(completed,file,id) {
  ++job;worker?.terminate();worker=null;stopModel();deviceTest.cancel();exports.cancel('Source view changed; active export canceled.');cropView.clear();preview?.destroy();
  report=structuredClone(completed);sourceFile=file;knownExample=null;sourceDigest=report.file.sha256 || null;batchReviewId=id;summarySelection=null;flow.reset();
  selectedModel=report.screeningSelection?.modelId || null;screeningChecks=new Set(report.screeningSelection?.checks || ['title','subject','keywords']);modelMessage='Retained batch attempt opened without repeating analysis.';busy(false);
  $('#selected-file').replaceChildren(el('strong','',file.name));$('#selected-file').hidden=false;preview=new Preview();preview.load(file,report);flow.stage='review';renderReport();$('#flow-title')?.focus({preventScroll:true});
}
function flowButton(text, action) { const b=el('button','secondary',text);b.type='button';b.onclick=action;return b; }
function renderFlow(focusIssue=false) {
  const host=$('#guided-flow'); if(!host)return;const disclosures=captureDisclosureState(host);cropView.clear();const previousFocus=host.contains(document.activeElement)?document.activeElement.id:null;
  const oldPreview=preview?.root;if(oldPreview?.parentNode)oldPreview.remove();
  host.replaceChildren();const stage=flow.stage;if(stage!=='checks')deviceTest.cancel();
  $('.workspace').dataset.stage=stage;$('.intro').hidden=stage!=='document';$('.about-profile').hidden=stage!=='document';
  $('.input-column').hidden=stage!=='document';
  $('#empty-state').hidden=stage!=='document';
  $('#advanced-evidence').hidden=!report || !['review','checks'].includes(stage);
  const steps=$('#flow-steps');steps.replaceChildren();const inBatch=stage==='batch' || (stage==='review' && batchReviewId);$('#flow-steps').setAttribute('aria-label',inBatch?'Batch review':'Review stages');
  for(const [key,label] of (inBatch?[['batch','Batch queue'],['review','PDF evidence']]:[['document','1 · Document'],['checks','2 · Checks'],['processing','3 · Processing'],['review','4 · Review']])){const item=el('li','',label);if(stage===key || stage.startsWith('processing') && key==='processing')item.setAttribute('aria-current','step');steps.append(item);}
  const heading=el(stage==='document'?'h2':'h1','flow-title',{batch:'Review several PDFs',document:'Choose one PDF to begin',checks:'Choose how to review this PDF',review:'Review the evidence', 'processing-analysis':'Checking text, tags, and metadata', 'processing-model':'Screening selected checks locally'}[stage]);heading.id='flow-title';heading.tabIndex=-1;if(stage!=='document')host.append(heading);
  if(stage==='batch'){host.append(batchView.root,flowButton('Stop queue and return to single PDF',()=>{batchView.queue.stopAll();batchView.client.dispose();flow.go('document');}));restoreDisclosureState(host,disclosures);return;}
  if(sourceFile)host.append(el('p','flow-file',`${sourceFile.name} · ${(sourceFile.size/1e6).toFixed(2)} MB`));
  if(stage==='document'){
    host.append(el('p','entry-orientation','Start with a PDF or a sample. Find the problems, compare the evidence, and keep a report. Traditional checks run first; AI is optional.'));
    if(report)host.append(flowButton('Return to this PDF’s review',()=>flow.go('review')),flowButton('Return to screening choices',()=>flow.go('checks')));else if(sourceFile)host.append(flowButton('Retry this PDF',()=>analyze(sourceFile,knownExample)));
    restoreDisclosureState(host,disclosures);return;
  }
  if(stage.startsWith('processing')){
    const message=el('p','flow-status',stage==='processing-model'?modelMessage:$('#status').textContent);message.id='flow-status';message.setAttribute('role','status');host.append(message);
    const progress=el('progress');progress.setAttribute('aria-label','Current processing step');
    const p=progressState;if(p && Number.isFinite(p.completed) && p.total>0){progress.max=p.total;progress.value=p.completed;host.append(progress,el('p','model-note',`${p.completed} / ${p.total} ${p.unit || 'units'}${p.asset?` · ${p.asset}`:''}`));}else {progress.removeAttribute('value');host.append(progress,el('p','model-note','Preparing or processing locally. No estimated completion time is available.'));}
    const cancel=flowButton('Cancel and go back',()=>{if(stage==='processing-analysis')cancelAnalysis();else {stopModel();modelMessage='AI screening canceled. Traditional results and any previous completed screening are retained.';flow.go('checks');}});cancel.id='flow-cancel';host.append(cancel);restoreDisclosureState(host,disclosures);if(previousFocus)document.getElementById(previousFocus)?.focus({preventScroll:true});return;
  }
  if(stage==='checks'){
    const completed=normalizeFindings(report),problemCount=completed.findings.filter(f=>['required-defect','required-indeterminate','advisory-concern'].includes(f.category)).length;const first=notice({title:problemCount?`${problemCount} finding${problemCount===1?'':'s'} to inspect`:'No concrete problems found',description:report.accepted?'The required text profile passed. Metadata and reading order still need separate review.':report.checks.some(c=>c.status==='fail')?'The required text profile failed: required defects were found. Inspect their evidence.':'The required text profile was not established. Inspect the required findings.',className:'traditional-result',titleTag:'h2'});first.body.prepend(el('p','eyebrow','Traditional checks complete'));first.actions.append(primaryButton(flowButton('Review findings without AI',()=>flow.go('review'))));host.append(first.root);
    host.append(el('p','model-note','Optional AI compares bounded text relatedness. It can add clues, make mistakes, and takes additional time and downloads.'));
    const recommendedKey=/^en(?:-|$)/i.test(report.metadata.language || '')?'minilm':supportsLanguage(getSemanticModel('granite-r2'),report.metadata.language)?'granite-r2':null;const model=recommendedKey && getSemanticModel(recommendedKey),supported=Boolean(model);
    const {root:recommendation,content:recommendationBody}=createCard('div','recommendation');recommendationBody.append(el('h3','',supported?`Recommended for the declared language: ${model.label}`:'No supported recommendation is available'),el('p','',supported?`${(model.graphBytes/1e6).toFixed(2)} MB model + ${(model.tokenizerBytes/1e6).toFixed(2)} MB tokenizer on first use; runtime assets are separate. Assets download from external hosts; PDF text stays on this device. Speed, memory use, and accuracy for this task are unmeasured.`:'Language metadata is missing or unsupported. You can review without AI immediately. Selecting an unsupported model does not make that language supported.'));
    const actions=el('div','flow-actions');
    if(supported){const run=flowButton('Use recommended settings',()=>{selectedModel=recommendedKey;report.screeningSelection={modelId:selectedModel,checks:[...screeningChecks]};runSimilarity();});primaryButton(run);run.id='recommended-run';run.disabled=!screeningChecks.size;actions.append(run);}recommendationBody.append(actions);const optional=el('details','optional-screening');optional.dataset.disclosureKey='optional-screening';optional.append(el('summary','','Add optional local AI screening'),recommendation);host.append(optional);
    const choose=el('details','alternate-model');choose.dataset.disclosureKey='alternate-model';choose.append(el('summary','','Choose another model or change screening checks'),modelPicker());optional.append(choose);deviceTest.refresh();optional.append(deviceTest.root);
    if(modelMessage)host.append(el('p','model-note',modelMessage));
    host.append(flowButton('Choose another PDF',()=>flow.go('document')));restoreDisclosureState(host,disclosures);return;
  }
  const normalized=normalizeFindings(report);const exportMenu=el('details','review-export-menu');exportMenu.dataset.disclosureKey='review-export';exportMenu.append(el('summary','','Keep this report'),exports.root);host.append(exportMenu);
  const counts=el('p','review-counts',`${normalized.findings.filter(f=>f.category==='required-defect').length} required defects · ${normalized.findings.filter(f=>f.category==='required-indeterminate').length} required checks not established · ${normalized.findings.filter(f=>f.category==='advisory-concern').length} advisory concerns · ${normalized.findings.filter(f=>['uncertain','unassessed'].includes(f.category)).length} uncertain or unassessed`);const overview=el('section','review-result-overview');const receipt=el('details','review-scope-details');receipt.dataset.disclosureKey='review-scope';receipt.append(el('summary','','Scope and required-check counts'),counts,el('p','model-note','Your PDF is retained only for this browser session. Required profile outcomes and advisory findings are separate; downstream AI accuracy is not certified.'));overview.append(el('p','profile-receipt',`Text profile ${report.profile.replace('text-actionability-','')}: ${report.accepted?'Yes — required checks passed':report.checks.some(c=>c.status==='fail')?'No — required defects found':'No — not established'}`),el('p','model-note','Metadata and reading order require separate review.'),receipt);overview.querySelector('.profile-receipt').append(helpTip('profile'));const execution=screeningProvenance(report),executionLine=el('div','execution-receipt');executionLine.append(el('span','','Traditional rules + PDF extraction'),el('span',`source-badge ${execution.kind}`,execution.label),helpTip(execution.kind==='ai'?'ai':'bounded',{label:'About actual AI execution',extraText:execution.detail}));overview.append(executionLine);host.append(overview);
  if(knownExample){const labels=el('details','example-label-details');labels.append(el('summary','','Synthetic example labels (separate from findings)'),el('p','example-truth',`${knownExample.defects?.join('; ') || 'Matching control'}. These authored labels do not determine analyzer results.`));receipt.append(labels);}
  host.append(reviewView({normalized,report,flow,selectEvidence:t=>{const page=report.pages.find(p=>p.number===t.page);inspectPreview({page:t.page,quads:t.quads?.length?t.quads:page?candidateBlocks(page,t).flatMap(b=>b.quad?[b.quad]:[]):[],label:t.text || 'Finding evidence'});},comparison:f=>{const path=f.source?.path || '';if(path==='attachments')return createAttachmentView(report.attachments);const kind=/author/i.test(path)?'authors':(/metadataConsistency|deterministicTitle/.test(path) || f.source?.checkId==='title')?'title':/readingOrder/.test(path)?'order':null;if(!kind)return null;const panel=summaryComparison(kind);panel.removeAttribute('id');panel.removeAttribute('aria-labelledby');panel.removeAttribute('role');return panel;},refresh:focus=>renderFlow(focus)}));
  const selectedFinding=normalized.findings.find(f=>f.id===flow.issueId);const frame=host.querySelector('.problem-frame');if(frame && sourceFile){let cropFinding=selectedFinding;if(selectedFinding?.source?.checkId==='title'&&!selectedFinding.targets?.length){const candidates=report.metadataConsistency?.publicationCandidates || [];cropFinding={...selectedFinding,targets:candidates.map(e=>({page:e.page,text:e.text,keys:e.keys || (e.key?[e.key]:[]),blockIds:e.blockIds || (e.id!=null?[e.id]:[])}))};}const cropHost=frame.querySelector('.finding-crop-slot') || frame;if(cropFinding?.targets?.length)cropView.show(cropHost,sourceFile,report,cropFinding);else if(cropHost.classList.contains('finding-crop-slot'))cropHost.append(el('p','model-note','No trustworthy source region is available for a crop. Recovered text and metadata remain available below.'));}
  if(preview){const full=el('details','full-page-evidence');full.id='full-page-evidence';full.dataset.disclosureKey='full-page';full.append(el('summary','','Inspect the full page and extracted order'),preview.root);host.append(full);}
  const actions=el('div','flow-actions');for(const [label,action] of [['Back to screening choices',()=>flow.go('checks')],['Recheck this PDF',()=>analyze(sourceFile,knownExample)]]){const b=flowButton(label,action);b.dataset.batchLock='';b.disabled=batchView.busy;actions.append(b);}actions.append(flowButton('Choose another PDF',()=>{if(batchView.busy){batchView.queue.stopAll();batchView.client.dispose();}flow.go('document');}));if(batchReviewId)actions.append(flowButton('Return to batch',()=>flow.go('batch')),el('p','model-note','This is a detached copy of the retained attempt. Review/preferences do not change the batch summary.'));host.append(actions);
  restoreDisclosureState(host,disclosures);if(exports.abort)exportMenu.open=true;
  if(focusIssue)$('#finding-title')?.focus({preventScroll:true});else if(previousFocus)document.getElementById(previousFocus)?.focus({preventScroll:true});
}

function inspectPreview(target){const detail=$('#full-page-evidence');if(detail)detail.open=true;preview?.select(target);preview?.root.scrollIntoView({block:'start',behavior:'instant'});}
function locationButton(target, label) {
  if(!target.page)return el('p','model-note',`${label || target.label || 'Document finding'} · No page location.`);
  const button=el('button','location-button',label || (target.page ? `Show page ${target.page}: ${target.label}` : 'Document finding · no page location'));
  button.onclick=()=>inspectPreview(target); return button;
}
function blockList(page, blocks) {
  const list=el('div','text-block-list');
  for(const b of blocks.slice(0,200)) {
    const matches=b.id!=null?[b]:page.blocks.filter(x=>x.key===b.key);
    list.append(locationButton({page:page.number,quads:matches.flatMap(x=>x.quad?[x.quad]:[]),label:b.text},`${b.role || 'UNTAGGED'}${b.key?` [${b.key}]`:''}  ${b.text}`));
  }
  if(blocks.length>200)list.append(el('p','model-note','First 200 text rows shown. Download JSON for all extracted evidence.'));
  return list;
}

function advisorySection(label,result) {
  const section=el('section','advisory-result');
  const labels={'match':'Match','semantically-related':'Related — identity unconfirmed','suspected-mismatch':'Suspected mismatch','uncertain':'Uncertain','requires-review':'Requires review','not-assessed':'Not assessed'};
  section.append(el('h4','',label),el('strong','',labels[result.status] || result.status),el('p','',result.reason));
  for(const e of (result.evidence || []).slice(0,12)){
    const page=report.pages.find(p=>p.number===e.page); const blocks=page ? candidateBlocks(page,e) : [];
    section.append(locationButton({page:e.page,quads:blocks.flatMap(b=>b.quad?[b.quad]:[]),label:e.text || 'Evidence'},e.text || 'Inspect evidence'));
  }
  return section;
}

function summaryEvidence(e, label) {
  const page=report.pages.find(p=>p.number===e.page);
  const blocks=page ? candidateBlocks(page,e) : [];
  const row=el('div','comparison-evidence');
  const origin=el('small','',e.page ? `Page ${e.page}${e.source ? ` · ${e.source}` : e.role ? ` · tagged ${e.role}` : ''}` : 'No page location');if(e.role || /tagged|structure/i.test(e.source || ''))origin.append(helpTip('tags',{label:`About tagged ${e.role || 'content'}`}));row.append(origin);
  row.append(locationButton({page:e.page,quads:blocks.flatMap(b=>b.quad?[b.quad]:[]),label:e.text || label},label || e.text || 'Inspect evidence'));
  return row;
}
function summaryComparison(kind) {
  const panel=el('section','summary-comparison'); panel.id=`review-panel-${kind}`;
  panel.setAttribute('role','region');panel.setAttribute('aria-labelledby',`review-toggle-${kind}`);
  const result=kind==='title' ? report.metadataConsistency : kind==='authors' ? report.authorConsistency : report.readingOrder;
  panel.append(el('h3','',kind==='title'?'Compare publication titles':kind==='authors'?'Compare author names':'Compare the extracted sequence'));const reason=el('p','comparison-reason',result?.reason || 'This property has not been assessed.');
  if(kind==='title' || kind==='authors') {
    panel.append(createIdentityComparison({kind,report,result,renderEvidence:summaryEvidence}));
  } else {
    const findings=result?.findings || [];
    const pageNumbers=findings.length ? [...new Set(findings.map(f=>f.page))] : report.pages.slice(0,2).map(p=>p.number);
    const columns=el('div','sequence-comparison');
    const numbered=b=>/^(?:H[1-6]?|Lbl)$/.test(b.role || '') && /^\s*\d{1,3}[.)]\s+\S/.test(b.text || '');
    for(const [label,field] of [['Tagged reading order','logicalBlocks'],['Content-stream order','blocks']]) {
      const column=el('div');column.append(helpLabel(label,field==='logicalBlocks'?'taggedOrder':'contentStream','h4'));let count=0;
      for(const number of pageNumbers) {
        const page=report.pages.find(p=>p.number===number); if(!page)continue;
        const keys=new Set(findings.filter(f=>f.page===number).flatMap(f=>(f.evidence || []).flatMap(e=>e.keys || (e.key?[e.key]:[]))));const relevant=keys.size?page[field].filter(b=>keys.has(b.key)):page[field].filter(numbered); const blocks=relevant.length ? relevant : page[field].slice(0,6);
        for(const b of blocks.slice(0,12)){column.append(summaryEvidence({...b,page:number,blockIds:b.id!=null?[b.id]:undefined,keys:b.key?[b.key]:undefined}));count++;}
      }
      if(!count)column.append(el('p','model-note','No text was recovered for this sequence.'));
      columns.append(column);
    }
    const technical=el('details','order-technical');technical.dataset.disclosureKey='order-technical';technical.append(el('summary','','Recovered text and technical detail'));findings.forEach(f=>technical.append(el('p','order-anomaly',`Page ${f.page}: ${f.reason}`)));technical.append(columns,el('p','model-note','Bounded comparison of detected heading/label evidence, or opening text when no located order clue is available. Extracted order alone does not prove the intended reading sequence.'));panel.append(createOrderComparison(report),technical);
  }
  panel.append(reason);return panel;
}
function renderReviewSummary() {
  const summary=el('div','review-summary');
  const rows=[['title','Title',report.metadataConsistency?.status || 'uncertain'],['authors','Authors',report.authorConsistency?.status || 'not-assessed'],['order','Reading order',report.readingOrder?.status || 'requires-review']];
  const labels={'match':'Match','suspected-mismatch':'Suspected mismatch','uncertain':'Uncertain','not-assessed':'Not assessed','requires-review':'Requires review'};
  const cards=[],panels=[];
  for(const [kind,label,value] of rows){
    const card=el('button',`review-status ${value}`);card.type='button';card.id=`review-toggle-${kind}`;
    card.setAttribute('aria-controls',`review-panel-${kind}`);card.setAttribute('aria-expanded',String(summarySelection===kind));
    card.append(el('span','',label),el('strong','',labels[value] || value),el('small','review-action','Inspect comparison ▾'));
    const panel=summaryComparison(kind);panel.hidden=summarySelection!==kind;
    card.onclick=()=>{summarySelection=summarySelection===kind?null:kind;cards.forEach((c,i)=>c.setAttribute('aria-expanded',String(rows[i][0]===summarySelection)));panels.forEach((p,i)=>p.hidden=rows[i][0]!==summarySelection);};
    cards.push(card);panels.push(panel);summary.append(card);
  }
  summary.append(...panels,el('p','review-scope','A structural pass does not establish correct authorship, reading order, or downstream AI accuracy.'));
  return summary;
}

function renderReport() {
  const focusedSummary=document.activeElement?.id?.startsWith('review-toggle-') ? document.activeElement.id : null;
  const root = $('#report'); root.replaceChildren(); root.hidden = false; $('#empty-state').hidden = true;
  const {root:top,content:topBody}=createCard('section','report-top');
  topBody.append(el('div', 'section-label', '02 / THE EVIDENCE'));
  topBody.append(el('h2','profile-label',`Text profile ${report.profile?.replace('text-actionability-','') || '—'}`));
  const verdictRow = el('div', 'verdict-row');
  verdictRow.append(el('div', `verdict ${report.accepted ? 'yes' : 'no'}`, report.accepted ? 'Yes' : 'No'));
  const copy = el('div', 'verdict-copy');
  copy.append(el('h2', '', report.accepted ? 'Meets the text actionability profile.' : report.checks.some(c => c.status === 'fail') ? 'Required checks found a defect.' : 'Compliance is not established.'), el('p', '', report.accepted ? 'Required structural checks passed. Review publication identity and reading order separately.' : 'Inspect the findings and supported scope before using this PDF as an AI input.'));
  verdictRow.append(copy); topBody.append(verdictRow);
  const stats = el('section','mg-stats-card');stats.setAttribute('aria-label','Required check counts');
  const statGrid=el('div','mg-grid mg-grid__col-3');stats.append(statGrid);
  for (const [value,label] of [[report.file.pages ?? '—','pages'],[report.checks.filter(c=>c.status==='pass').length,'checks passed'],[report.checks.filter(c=>c.status!=='pass').length,'required checks to inspect']]) {
    const stat=el('article','mg-card mg-stats-card-item');const count=el('data','mg-stats-card-item__value',value);count.value=String(value);stat.append(count,el('strong','mg-stats-card-item__bottom-label',label));statGrid.append(stat);
  }
  topBody.append(stats, renderReviewSummary());
  if(knownExample){const note=el('div','example-truth');note.append(el('strong','','Known example: authored ground truth'),el('p','',knownExample.defects?.length ? knownExample.defects.join('; ') : 'Matching metadata and intended semantic order control.'),el('small','','These labels describe this synthetic example; analyzer findings are shown separately.'));topBody.append(note);} root.append(top); root.append( el('h3', 'report-heading', 'Required checks'));
  const list = el('div', 'check-list');
  for (const check of report.checks) {
    const row = el('details', `check-row ${check.status}`), summary = el('summary');
    const text = el('span', 'check-text', check.label);
    text.append(el('span', 'check-summary', check.summary));
    const symbol = el('span', 'check-symbol', check.status === 'pass' ? '✓' : check.status === 'fail' ? '×' : '?');
    symbol.setAttribute('aria-label', check.status === 'indeterminate' ? 'Not established' : check.status);
    summary.append(symbol, text); row.append(summary);
    const evidence = el('div', 'check-evidence');
    evidence.append(el('p', '', `Outcome: ${check.status}. Required for acceptance.`));
    check.evidence.forEach(e => evidence.append(el('p', '', e)));
    const targets = findingTargets(report, check.id);
    if (targets.length) { targets.slice(0,100).forEach(t => evidence.append(locationButton(t))); if(targets.length>100)evidence.append(el('p','model-note','First 100 locations shown; complete evidence is in the JSON report.')); }
    else if(check.status!=='pass') evidence.append(el('p','model-note','Document-level finding; no page location.'));
    row.open = check.status === 'fail' || check.status === 'indeterminate'; row.append(evidence); list.append(row);
  }
  root.append(list, el('h3', 'report-heading', 'Publication metadata'));
  const {root:metadata,content:metadataBody}=createCard('section','metadata-card');
  const consistency = report.metadataConsistency;
  metadataBody.append(el('h4','','Title comparison'), el('span', `badge ${consistency.status}`, { match: 'MATCH', 'suspected-mismatch': 'SUSPECTED MISMATCH', uncertain: 'UNCERTAIN' }[consistency.status]), el('p', '', consistency.reason || 'Metadata comparison could not complete.'));
  const dl = el('dl', 'metadata-dl');
  for (const [label, value] of [['Info title', report.metadata.infoTitle], ...((report.metadata.xmpTitles || []).map(t => [`XMP ${t.lang || 'title'}`, t.text])), ['Author metadata (Info)',report.metadata.author], ['Language', report.metadata.language]]) dl.append(el('dt', '', label), el('dd', '', value || 'Not set'));
  if(report.authorConsistency?.metadataAuthors?.xmp?.length)dl.append(el('dt','','Author metadata (XMP)'),el('dd','',report.authorConsistency.metadataAuthors.xmp.join('; ')));
  metadataBody.append(dl);
  if(report.authorConsistency)metadataBody.append(advisorySection('Author identity',report.authorConsistency));
  const candidates = report.semantic?.ranked?.length ? report.semantic.ranked : consistency.candidates || [];
  const candidateList = el('ol', 'candidates');
  candidates.forEach(c => {
    const li = el('li', 'candidate');
    if (Number.isFinite(c.similarity)) li.append(el('span', 'score', c.similarity.toFixed(3)));
    li.append(locationButton({page:c.page, quads:candidateBlocks(report.pages.find(p=>p.number===c.page),c).flatMap(b=>b.quad?[b.quad]:[]),label:c.text},c.text), el('small', '', `Page ${c.page} · ${c.source}${c.node ? ` · node ${c.node}` : ''}`));
    candidateList.append(li);
  });
  metadataBody.append(candidateList);
  if (!candidates.length) metadataBody.append(el('p', 'model-note', 'No title candidates were recovered.'));

  if (report.semantic) {
    if(report.semantic.error)metadataBody.append(el('p','error-message',`Optional screening failed: ${report.semantic.error}. Traditional results are retained; no model inference is claimed.`));
    if(report.semantic.status==='skipped')metadataBody.append(el('p','model-note',`AI requested but not run: ${report.semantic.reason || report.semantic.skipReason || 'analysis incomplete'}. No model inference is claimed.`));
    metadataBody.append(el('h4','semantic-heading','Completed screening result'),el('p','model-result-identity',`${report.semantic.inferencePerformed?'Model used':'No model inference; selected model configuration'}: ${report.semantic.model?.label || report.semantic.model?.id || 'No completed model configuration'} · ${report.semantic.model?.dtype || '—'} · ${report.semantic.model?.pooling || '—'} pooling · requested checks: ${(report.semantic.requestedChecks || ['title','subject','keywords']).join(', ')}`),el('p', 'model-note', report.semantic.note),el('p','inference-note',report.semantic.inferencePerformed ? `Model inference ran on ${report.semantic.embeddedTextCount ?? 'bounded'} text excerpts.` : 'No model inference ran; inspect each check’s reason.'));
    for (const field of ['title','subject','keywords','sections']) {
      const result=report.semantic[field]; if(!result)continue;
      const section=el('section','semantic-result');
      section.append(el('p','model-note',result.inferencePerformed?'Local model screening':result.method==='deterministic-rules'?'Traditional rules · no model inference':result.method==='not-requested'?'Not requested':'No model inference for this check'));
      section.append(el('h4','',`${field[0].toUpperCase()+field.slice(1)} screening`),el('strong','',{'match':'Match','semantically-related':'Related — identity unconfirmed','suspected-mismatch':'Suspected mismatch','uncertain':'Uncertain'}[result.status] || result.status),el('p','',result.reason));
      for(const warning of result.identityWarnings || []) { const text=typeof warning==='string'?warning:JSON.stringify(warning); if(!result.reason?.includes(text))section.append(el('p','',text)); }
      for(const e of result.evidence || []) {
        const page=report.pages.find(p=>p.number===e.page);
        const blocks=page ? candidateBlocks(page,e) : [];
        section.append(locationButton({page:e.page,quads:blocks.flatMap(b=>b.quad?[b.quad]:[]),label:e.text || e.source || 'Semantic evidence'},e.text || e.source || 'Show semantic evidence'));
      }
      metadataBody.append(section);
    }
  }
  if(report.semantic){
    for(const [label,items] of [['Keyword',(report.semantic.keywordItems || [])],['Heading',(report.semantic.sectionItems || [])]])for(const item of items.slice(0,12))metadataBody.append(advisorySection(`${label}: ${item.keyword || item.heading?.text || item.heading || 'Candidate'}`,item));
    if(report.semantic.inferenceProvenance?.length){const provenance=el('details','input-receipt');provenance.append(el('summary','','Model input limits'));for(const p of report.semantic.inferenceProvenance.slice(0,24))provenance.append(el('p','model-note',`Input ${p.index+1}: ${p.consumedTokens} / ${p.inputTokens} tokens${p.truncated?' · truncated':''}`),el('p','',p.consumedText || ''));if(report.semantic.inferenceProvenance.length>24)provenance.append(el('p','model-note','First 24 model inputs shown; the JSON report contains all input provenance.'));metadataBody.append(provenance);if(report.semantic.inferenceProvenance.some(p=>p.truncated))metadataBody.append(el('p','model-note','Some model inputs were truncated. The model input limits show the consumed prefixes; highlighted spans may also include text beyond those prefixes.'));}
    if(report.semantic.skippedChecks?.length)metadataBody.append(el('p','model-note',`Checks without model inference: ${report.semantic.skippedChecks.map(c=>typeof c==='string'?c:`${c.check || c.id || ''}${c.reason?` — ${c.reason}`:''}`).join('; ')}`));
    if(report.semantic.keywordCoverage)metadataBody.append(el('p','model-note',`Keyword coverage: ${report.semantic.keywordCoverage.evaluatedTerms} of ${report.semantic.keywordCoverage.totalTerms} terms evaluated${report.semantic.keywordCoverage.skippedTerms?` · ${report.semantic.keywordCoverage.skippedTerms} skipped`:''}.`));
  }
  const modelStatus = el('p', 'model-progress',modelMessage); modelStatus.id = 'model-status'; modelStatus.setAttribute('role', 'status'); metadataBody.append(modelStatus);
  root.append(metadata);
  root.append(el('h3','report-heading','Reading order and text visibility'));
  const {root:review,content:reviewBody}=createCard('section','evidence-card');
  reviewBody.append(advisorySection('Reading order',report.readingOrder || {status:'requires-review',reason:'Compare the tagged sequence with the original page. Correct order has not been established.'}));
  if(report.textVisibility)reviewBody.append(advisorySection('Text visibility',report.textVisibility));
  root.append(review,el('h3', 'report-heading', 'Inspect the extracted evidence'));
  const {root:evidence,content:evidenceBody}=createCard('section','evidence-card');
  const orderLabel=el('label','extraction-label','Extracted text order'); orderLabel.htmlFor='extraction-order';
  const order=el('select');order.id='extraction-order';
  for(const [value,label] of [['tagged','Tagged reading order'],['stream','Content-stream order']]){const option=el('option','',label);option.value=value;order.append(option);}order.value=extractionOrder;
  evidenceBody.append(orderLabel,order,el('p','model-note','Tags record an intended reading sequence. Connectivity alone does not establish that the sequence is correct.'));
  order.onchange=()=>{extractionOrder=order.value;evidence.querySelectorAll('[data-order]').forEach(n=>n.hidden=n.dataset.order!==extractionOrder);};
  for (const page of report.pages) {
    const details = el('details'); details.append(el('summary', '', `Page ${page.number} · ${page.characters} characters · ${page.untaggedCharacters} untagged`));
    for(const [kind,blocks] of [['tagged',page.logicalBlocks],['stream',page.blocks]]){
      const section=el('div');section.dataset.order=kind;section.hidden=kind!==extractionOrder;
      section.append(el('p','model-note',kind==='tagged'?'Text in tag-tree order; verify the sequence against the page.':'Text in PDF content-stream order; this may differ from intended reading order.'));
      if(blocks.length)section.append(blockList(page,blocks));else section.append(el('p','model-note','No connected tagged text was recovered on this page. Choose content-stream order to inspect extracted text.'));
      details.append(section);
    }
    evidenceBody.append(details);
  }
  const limitations = el('details'); limitations.append(el('summary', '', 'Profile scope and limitations'));
  const limitationsList = el('ul', 'limitations'); report.limitations.forEach(l => limitationsList.append(el('li', '', l))); limitations.append(limitationsList); evidenceBody.append(limitations); root.append(evidence);
  const actions = el('div', 'report-actions'), download = el('button', 'secondary', 'Download detailed report (JSON)');
  download.onclick = () => exports.run('json');
  actions.append(download); root.append(actions);
  if(focusedSummary)document.getElementById(focusedSummary)?.focus({preventScroll:true});
  renderFlow();
  if(report.file.sha256){const receipt=el('details','input-receipt');receipt.append(el('summary','','Input receipt'),el('p','model-note',`SHA-256 of the original ${report.file.sourceBytes.toLocaleString()} file bytes`),el('code','',report.file.sha256));root.append(receipt);}
}

function modelPicker() {
  const {root:panel,content:panelBody}=createCard('section','model-picker');
  panelBody.append(el('h4','semantic-heading','Choose a model and screening checks'),el('p','model-note','Traditional title, author, and structure checks already ran. Optional models compare relatedness against bounded excerpts; they do not change structural acceptance. Nothing downloads when you change these options.'));
  const label=el('label','','Screening model');label.htmlFor='screening-model';const select=el('select');select.id='screening-model';select.disabled=modelBusy;
  const empty=el('option','','Choose a model…');empty.value='';select.append(empty);
  for(const model of SEMANTIC_MODELS){const option=el('option','',model.label);option.value=model.key;select.append(option);}select.value=selectedModel || '';
  const explanation=el('p','model-note');
  const refresh=()=>{report.screeningSelection={modelId:selectedModel,checks:[...screeningChecks]};const model=selectedModel ? getSemanticModel(selectedModel) : null; const language=report.metadata.language;
    explanation.textContent=!language ? 'Document language is missing. Compatibility cannot be established; unsupported semantic checks remain uncertain without model inference.' : model && !supportsLanguage(model,language) ? `Declared language ${language} is outside this model’s verified support. Choose a supported model; unsupported semantic checks remain uncertain.` : /^en(?:-|$)/i.test(language) ? 'MiniLM is the smaller English baseline. Granite offers multilingual support with a larger download. Neither has calibrated accuracy for this task.' : `Declared language: ${language}. A supported multilingual model is recommended; selecting it does not start a download.`;
    if($('#recommended-run'))$('#recommended-run').disabled=modelBusy || !screeningChecks.size;
    run.disabled=modelBusy || !selectedModel || !screeningChecks.size || !report.pages.length;
  };
  select.onchange=()=>{deviceTest.cancel();selectedModel=select.value || null;refresh();deviceTest.refresh();};panelBody.append(formField(label,select,explanation));
  const tableRegion=el('div','mg-table-scroll-region');tableRegion.setAttribute('role','region');tableRegion.setAttribute('aria-label','Model download and language tradeoffs');tableRegion.tabIndex=0;const table=el('table','model-tradeoffs');const head=el('thead');const hr=el('tr');['Model / language','Download assets','Tradeoffs'].forEach(t=>hr.append(el('th','',t)));head.append(hr);table.append(head);const body=el('tbody');
  for(const model of SEMANTIC_MODELS){const row=el('tr');const identity=el('td','',`${model.label} · ${model.language}`);const languages=el('details');languages.append(el('summary','','Supported languages'));const names=new Intl.DisplayNames(['en'],{type:'language'});languages.append(el('p','',model.languages.map(l=>names.of(l)).join(', ')));identity.append(languages);row.append(identity,el('td','',`${(model.graphBytes/1e6).toFixed(2)} MB model + ${(model.tokenizerBytes/1e6).toFixed(2)} MB tokenizer · ${model.maxTokens}-token input cap`),el('td','',model.tradeoff));body.append(row);}table.append(body);const scroll=tableRegion;scroll.classList.add('model-table-scroll');scroll.append(table);panelBody.append(scroll,el('p','model-note','Sizes exclude the bundled inference runtime: approximately 26.86 MB of uncompressed WASM plus runtime JavaScript; transfer size depends on hosting compression. First-use assets may be cached by your browser. Browser speed and memory use are unmeasured; PDF text remains on this device. Similarity is not a probability of correctness.'));
  const checks=el('fieldset','screening-checks');checks.disabled=modelBusy;checks.append(el('legend','mg-form-group__legend','Checks to screen'));
  for(const [key,text] of [['title','Publication title'],['subject','Subject'],['keywords','Each keyword'],['sections','Tagged headings and section text']]){const input=el('input');input.id=`single-check-${key}`;input.type='checkbox';checkbox(input);input.value=key;input.checked=screeningChecks.has(key);input.onchange=()=>{input.checked?screeningChecks.add(key):screeningChecks.delete(key);refresh();};checks.append(checkRow(input,text));}panelBody.append(checks,el('p','model-note','Section screening associates bounded tagged headings with following tagged text. It is advisory and does not verify all heading roles or the whole document.'));
  const actions=el('div','model-actions');const run=primaryButton(el('button','secondary',modelBusy?'Screening in progress…':'Run selected checks locally'));run.onclick=runSimilarity;actions.append(run);
  if(modelBusy){const cancel=el('button','secondary','Cancel AI screening');cancel.onclick=()=>{stopModel();modelMessage='AI screening canceled. The structural report and any previous completed result are retained.';renderReport();};actions.append(cancel);}panelBody.append(actions);refresh();return panel;
}
function runSimilarity() {
  if (batchView.busy){modelMessage='Stop the queue before separate screening.';return;}batchView.releaseIdleWorkers();
  if (!report || modelBusy || !selectedModel || !screeningChecks.size) return;
  modelBusy=true;modelMessage='Preparing the selected checks…';progressState=null;flow.stage='processing-model';
  const currentJob=job,currentRun=++modelRun;
  if(!modelWorker)modelWorker=new Worker(new URL('./model.worker.js',import.meta.url),{type:'module'});const runningWorker=modelWorker;
  const active=()=>currentJob===job && currentRun===modelRun && modelWorker===runningWorker && report;
  const failure=message=>{if(!active())return;stopModel();modelMessage=`Semantic screening unavailable: ${message}. Structural results and any previous completed screening are retained.`;flow.stage='checks';renderReport();};
  runningWorker.onerror=e=>failure(e.message || 'Model worker failed');
  runningWorker.onmessage=({data})=>{
    if(!active() || data.requestId!==currentRun)return;
    if(data.type==='progress'){modelMessage=data.message;if($('#model-status'))$('#model-status').textContent=modelMessage;progressState=data.progress || null;renderFlow();}
    else if(data.type==='error')failure(data.message);
    else if(data.type==='result'){report.semantic=data.semantic;modelBusy=false;modelMessage='Screening complete. Structural acceptance and traditional metadata findings are unchanged.';flow.stage='review';renderReport();$('#flow-title')?.focus({preventScroll:true});}
  };
  const request=buildScreeningRequest(report,{requestId:currentRun,modelId:selectedModel,checks:[...screeningChecks]});
  renderReport();$('#flow-title')?.focus({preventScroll:true});runningWorker.postMessage(request);
}

$('#file-input').onchange = event => { const file = event.target.files[0]; if (file) analyze(file); event.target.value = ''; };
$('#cancel').onclick = cancelAnalysis;
$('#entry-batch').onclick=()=>flow.go('batch');
for (const event of ['dragenter', 'dragover']) $('#drop-zone').addEventListener(event, e => { e.preventDefault(); $('#drop-zone').classList.add('dragging'); });
for (const event of ['dragleave', 'drop']) $('#drop-zone').addEventListener(event, e => { e.preventDefault(); $('#drop-zone').classList.remove('dragging'); });
$('#drop-zone').addEventListener('drop', e => { if (e.dataTransfer.files.length !== 1) status('Please choose one PDF at a time.'); else analyze(e.dataTransfer.files[0]); });
window.addEventListener('dragover', e => e.preventDefault()); window.addEventListener('drop', e => e.preventDefault());
async function loadSample(path) {
  if(batchView.busy){status('Stop the queue before loading another source.');return;}batchView.releaseIdleWorkers();batchReviewId=null;
  deviceTest.cancel();exports.cancel('Source changed; any active export was canceled.');cropView.clear();const currentJob = ++job;
  worker?.terminate(); worker = null; stopModel(); preview?.destroy(); preview=null; sourceFile=null; knownExample=null; sourceDigest=null; busy(true);
  report = null; flow.reset();flow.go('processing-analysis');$('#report').hidden = true;
  try {
    status('Loading the example PDF…');
    const response = await fetch(new URL(path, document.baseURI));
    if (!response.ok) throw new Error('The sample PDF could not be loaded.');
    const blob = await response.blob();
    if (currentJob !== job) return;
    await analyze(new File([blob], path.split('/').at(-1), { type: 'application/pdf' }), path.includes('/calibration/') ? exampleLabels.get(path.split('/').at(-1)) || null : null);
  } catch (error) { if (currentJob === job) { busy(false); status(error.message);flow.go('document'); } }
}
document.querySelectorAll('[data-sample]').forEach(b => b.onclick = () => loadSample(`./samples/${b.dataset.sample}.pdf`));
document.querySelectorAll('[data-example]').forEach(b=>b.onclick=()=>loadSample(`./calibration/${b.dataset.example}`));
$('#calibration-select').onchange = () => { $('#load-calibration').disabled = analysisBusy || !$('#calibration-select').value; };
$('#load-calibration').onclick = () => loadSample(`./calibration/${$('#calibration-select').value}`);
fetch(new URL('./calibration/manifest.json', document.baseURI)).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(manifest => {
  const samples=manifest.samples || manifest;$('#example-gallery-summary').textContent=`Controls and all ${samples.length} examples`;
  for (const sample of samples) { exampleLabels.set(sample.file,sample); const option = el('option', '', sample.title); option.value = sample.file; $('#calibration-select').append(option); }
}).catch(() => { $('#calibration-select').disabled = true; });

renderFlow();
initializeAiNotice({ onStorageFailure: message => { if(!analysisBusy)status(message); } });
