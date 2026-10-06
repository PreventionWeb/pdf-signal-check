import { targetQuads } from './geometry.js';
import { EvidenceCropService } from './crops.js';
/** One transient crop, accessible textual equivalent; dispose on every frame/source change. */
export class EvidenceCropView {
  constructor(){this.epoch=0;}
  async show(host,file,report,finding) {
    this.clear();if(!finding?.targets?.length)return;const epoch=this.epoch,abort=new AbortController();this.abort=abort;const service=new EvidenceCropService(file,report,{signal:abort.signal});this.service=service;
    const figure=document.createElement('figure');figure.className='evidence-crop';const caption=document.createElement('figcaption');caption.textContent='Rendering one located source region…';figure.append(caption);host.append(figure);
    try {const result=await service.crop(finding.targets.find(t=>targetQuads(report,t).length) || finding.targets[0]);if(epoch!==this.epoch)return;if(result.unavailable){caption.textContent=result.unavailable;return;}const url=URL.createObjectURL(result.blob);this.url=url;const image=document.createElement('img');image.src=url;image.alt=`Source PDF page ${result.page}: ${result.text}. Approximate evidence outlined in blue.`;image.width=result.width;image.height=result.height;caption.textContent=result.caption;figure.prepend(image);}
    catch(e){if(epoch===this.epoch && !abort.signal.aborted)caption.textContent=`Crop unavailable: ${e.message}. Use textual evidence or the full-page preview.`;}
    finally{await service.destroy();if(this.service===service)this.service=null;}
  }
  clear(){++this.epoch;this.abort?.abort();this.abort=null;this.service?.destroy();this.service=null;if(this.url)URL.revokeObjectURL(this.url);this.url=null;}
}
