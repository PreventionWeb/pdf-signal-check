import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
import { evidenceCropBounds, targetQuads, throwIfAborted } from './geometry.js';
import { point } from '../geometry.js';
pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;
const blobOf=canvas=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not encode evidence image')),'image/png'));
/** Serialized, independent source rendering; no dependency on preview zoom/page/canvas. */
export class EvidenceCropService {
  constructor(file,report,{signal}={}) {this.file=file;this.report=report;this.signal=signal;this.queue=Promise.resolve();this.closed=false;this.abort=()=>{this.renderTask?.cancel();this.loadingTask?.destroy();};signal?.addEventListener('abort',this.abort,{once:true});}
  async load() {
    throwIfAborted(this.signal);if(this.closed)throw new DOMException('Canceled','AbortError');if(this.doc)return this.doc;
    const data=new Uint8Array(await this.file.arrayBuffer());throwIfAborted(this.signal);
    const base=new URL('./pdfjs/',document.baseURI);
    this.loadingTask=pdfjs.getDocument({data,standardFontDataUrl:new URL('standard_fonts/',base).href,cMapUrl:new URL('cmaps/',base).href,cMapPacked:true,wasmUrl:new URL('wasm/',base).href});
    this.doc=await this.loadingTask.promise;throwIfAborted(this.signal);return this.doc;
  }
  crop(target) {const task=this.queue.catch(()=>{}).then(()=>this.renderCrop(target));this.queue=task;return task;}
  async renderCrop(target) {
    throwIfAborted(this.signal);const quads=targetQuads(this.report,target);if(!quads.length && !target.contextPage)return {unavailable:'No trustworthy region is available; inspect textual evidence.'};
    let canvas,crop,page;
    try {
      const doc=await this.load();page=await doc.getPage(target.page);throwIfAborted(this.signal);
      const unit=page.getViewport({scale:1});const scale=Math.min(1.6,4096/Math.max(unit.width,unit.height),Math.sqrt(8_000_000/(unit.width*unit.height)));
      const viewport=page.getViewport({scale});const bounds=evidenceCropBounds(this.report,target,viewport);if(!bounds)return {unavailable:'Evidence geometry is outside the rendered page.'};
      canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.floor(viewport.width));canvas.height=Math.max(1,Math.floor(viewport.height));
      this.renderTask=page.render({canvasContext:canvas.getContext('2d'),viewport});await this.renderTask.promise;this.renderTask=null;throwIfAborted(this.signal);
      const outputScale=Math.min(1,1000/Math.max(bounds.width,bounds.height),Math.sqrt(1_000_000/(bounds.width*bounds.height)));
      crop=document.createElement('canvas');crop.width=Math.max(1,Math.floor(bounds.width*outputScale));crop.height=Math.max(1,Math.floor(bounds.height*outputScale));const ctx=crop.getContext('2d');
      ctx.drawImage(canvas,bounds.x,bounds.y,bounds.width,bounds.height,0,0,crop.width,crop.height);
      const outlines = target.wholePage ? quads.map(quad => quad.map(p => point(viewport.transform, p))) : !bounds.pageContext ? [bounds.points] : [];
      for (const outline of outlines) { ctx.strokeStyle='#1767a6';ctx.fillStyle='rgba(23,103,166,.10)';ctx.lineWidth=2;ctx.beginPath();outline.forEach(([x,y],i)=>i?ctx.lineTo((x-bounds.x)*outputScale,(y-bounds.y)*outputScale):ctx.moveTo((x-bounds.x)*outputScale,(y-bounds.y)*outputScale));ctx.closePath();ctx.fill();ctx.stroke(); }
      const blob=await blobOf(crop);throwIfAborted(this.signal);
      return {blob,width:crop.width,height:crop.height,page:target.page,pageContext:bounds.pageContext,caption:bounds.pageContext ? `Page ${target.page} · page context; the figure’s exact location could not be isolated.` : `Page ${target.page} · blue outline: one approximate located evidence region${quads.length>1?`; ${quads.length-1} additional regions remain in textual/full-page evidence`:''}.`,text:target.text || 'Located evidence'};
    } finally {if(canvas)canvas.width=canvas.height=0;if(crop)crop.width=crop.height=0;page?.cleanup();}
  }
  async destroy() {if(this.closed)return;this.closed=true;this.signal?.removeEventListener('abort',this.abort);this.renderTask?.cancel();await this.queue.catch(()=>{});await this.loadingTask?.destroy();this.doc=null;}
}
