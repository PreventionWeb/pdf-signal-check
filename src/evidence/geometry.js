import { point, candidateBlocks } from '../geometry.js';
export const throwIfAborted = signal => { if(signal?.aborted)throw new DOMException('Canceled','AbortError'); };
export function targetQuads(report,target) {
  if(!target?.page)return [];
  if(report.checks?.some(c=>(c.evidence || []).some(e=>typeof e==='string' && e.includes('Form XObjects'))))return [];
  const page=report.pages.find(p=>p.number===target.page);
  const quads=target.quads?.length?target.quads:page?candidateBlocks(page,target).flatMap(b=>b.quad?[b.quad]:[]):[];
  return quads.filter(q=>q.length===4 && q.every(p=>p.length===2 && p.every(Number.isFinite)));
}
/** A single quad only: disconnected regions must never become a pinpoint union. */
export function cropBounds(quad,viewport,padding=28) {
  if(!quad || quad.length!==4)return null;
  const points=quad.map(p=>point(viewport.transform,p));if(!points.every(p=>p.every(Number.isFinite)))return null;
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const raw={x:Math.min(...xs),y:Math.min(...ys),right:Math.max(...xs),bottom:Math.max(...ys)};
  if(raw.right<=0 || raw.bottom<=0 || raw.x>=viewport.width || raw.y>=viewport.height || raw.right<=raw.x || raw.bottom<=raw.y)return null;
  const x=Math.max(0,Math.floor(raw.x-padding)),y=Math.max(0,Math.floor(raw.y-padding));
  return {x,y,width:Math.min(viewport.width,Math.ceil(raw.right+padding))-x,height:Math.min(viewport.height,Math.ceil(raw.bottom+padding))-y,points};
}
