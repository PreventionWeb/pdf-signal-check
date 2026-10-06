import { PRODUCT_NAME, REPORT_FILENAME_STEM } from '../brand.js';
import { captureSnapshot, safeFilename } from './snapshot.js';
import { targetQuads } from '../evidence/geometry.js';
import { EvidenceCropService } from '../evidence/crops.js';
const node=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
export class ExportController {
  constructor(getState) {
    this.getState=getState;this.epoch=0;this.root=node('section');this.root.className='export-actions';this.root.append(node('h3','Keep a captured report'),node('p','Reports can include your document’s file name, metadata, text excerpts, and page images. Downloads are generated on this device; share only with intended recipients.'));
    this.actions=node('div');this.actions.className='flow-actions';this.buttons=[];
    for(const [kind,label] of [['pdf',`Download ${PRODUCT_NAME} report (PDF)`],['png','Download summary image (PNG)'],['json','Download detailed report (JSON)']]){const b=node('button',label);b.className='secondary';b.type='button';b.onclick=()=>this.run(kind);this.buttons.push(b);this.actions.append(b);}
    this.cancelButton=node('button','Cancel export');this.cancelButton.type='button';this.cancelButton.className='secondary';this.cancelButton.hidden=true;this.cancelButton.onclick=()=>this.cancel();this.actions.append(this.cancelButton);this.message=node('p');this.message.setAttribute('role','status');this.root.append(this.actions,this.message);
  }
  cancel(message='Export canceled. Completed analysis remains available.') {const wasActive=Boolean(this.abort);++this.epoch;this.abort?.abort();this.abort=null;this.buttons.forEach(b=>b.disabled=false);this.cancelButton.hidden=true;this.message.textContent=wasActive?message:'';}
  async run(kind) {
    if(this.abort)return;const state=this.getState();if(!state.report)return;const snapshot=captureSnapshot(state),epoch=++this.epoch,abort=new AbortController();this.abort=abort;this.buttons.forEach(b=>b.disabled=true);this.cancelButton.hidden=false;
    let service;
    try {
      this.message.textContent='Capturing completed report…';let blob;
      if(kind==='json')blob=new Blob([JSON.stringify({...snapshot.report,exportReceipt:{capturedAt:snapshot.capturedAt,reviewedFindingIds:snapshot.reviewed,annotationMeaning:'User inspection only; machine outcomes unchanged'}},null,2)],{type:'application/json'});
      else {const {createPdfReport,createSummaryPng}=await import('./report.js');if(abort.signal.aborted)return;
        if(kind==='png'){this.message.textContent='Rendering dedicated summary image…';blob=await createSummaryPng(snapshot,{signal:abort.signal});}
        else {const crops=[];if(snapshot.file){service=new EvidenceCropService(snapshot.file,snapshot.report,{signal:abort.signal});const candidates=snapshot.normalized.findings.filter(f=>f.category!=='success').map(f=>({...f,cropTarget:f.targets?.find(t=>targetQuads(snapshot.report,t).length)})).filter(f=>f.cropTarget).slice(0,6);for(let i=0;i<candidates.length;i++){this.message.textContent=`Rendering source evidence ${i+1} / ${candidates.length}…`;const f=candidates[i];try{crops.push({...await service.crop(f.cropTarget),findingId:f.id});}catch(e){if(abort.signal.aborted)throw e;crops.push({findingId:f.id,unavailable:e.message});}}}this.message.textContent='Laying out captured report…';blob=await createPdfReport(snapshot,{signal:abort.signal,crops,onProgress:p=>this.message.textContent=`Writing findings ${p.completed+1} / ${p.total}…`});}
      }
      if(abort.signal.aborted || epoch!==this.epoch || this.getState().file!==snapshot.file)return;
      const url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download=`${safeFilename(snapshot.source.name)}-${REPORT_FILENAME_STEM}.${kind}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);this.message.textContent='Download requested for the captured report. The original PDF was not changed.';
    } catch(e){if(epoch===this.epoch)this.message.textContent=abort.signal.aborted?'Export canceled.':`Export unavailable: ${e.message}. Analysis remains available.`;}
    finally {await service?.destroy();if(epoch===this.epoch){this.abort=null;this.buttons.forEach(b=>b.disabled=false);this.cancelButton.hidden=true;}}
  }
}
