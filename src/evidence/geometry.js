import { point, candidateBlocks } from '../geometry.js';
import { hasUnsafePageScope } from './reading-order-placement.js';
export const throwIfAborted = signal => { if(signal?.aborted)throw new DOMException('Canceled','AbortError'); };
export function targetQuads(report,target) {
  if(!target?.page)return [];
  if(hasUnsafePageScope(report,target.page))return [];
  const page=report.pages.find(p=>p.number===target.page);
  const candidates = page ? candidateBlocks(page,target).filter(b=>!page.evidenceGeometryScoped || b.locationSafe) : [];
  const quads=target.quads?.length?target.quads:candidates.flatMap(b=>b.quad?[b.quad]:[]);
  const safeQuads = page?.evidenceGeometryScoped && page.formXObjectInvocations > 0
    ? (target.keys?.length || target.blockIds?.length ? candidates.map(b=>b.quad)
      : [...page.blocks.filter(b=>b.locationSafe).map(b=>b.quad), ...(page.graphics || []).map(g=>g.quad), ...(page.decorativeGraphics || []).map(g=>g.quad)]).filter(Boolean) : null;
  return quads.filter(q=>q.length===4 && q.every(p=>p.length===2 && p.every(Number.isFinite)) &&
    (!safeQuads || safeQuads.some(safe=>JSON.stringify(safe)===JSON.stringify(q))));
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

/** Figure context may fall back to a full page, never an invented figure rectangle. */
export function evidenceCropBounds(report, target, viewport) {
  if (target.wholePage) return { x: 0, y: 0, width: viewport.width, height: viewport.height, points: [], regionCount: 0, pageContext: true };
  const quads = targetQuads(report, target);
  const located = quads.length ? cropBounds(quads[0], viewport) : null;
  if (located) return { ...located, regionCount: quads.length, pageContext: false };
  if (!target.contextPage) return null;
  return { x: 0, y: 0, width: viewport.width, height: viewport.height, points: [], regionCount: 0, pageContext: true };
}
