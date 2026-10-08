/** PDF user-space geometry; always project through the full viewport matrix. */
export const point = (m, [x, y]) => [m[0]*x+m[2]*y+m[4], m[1]*x+m[3]*y+m[5]];
export const multiply = (a,b) => [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
export function rectPoints([x0,y0,x1,y1], matrix) { return [[x0,y0],[x1,y0],[x1,y1],[x0,y1]].map(p=>point(matrix,p)); }
export function textQuad(item, style = {}) {
  const m = item.transform;
  if (!m || m.length !== 6 || !Number.isFinite(item.width)) return null;
  const vertical = !!style.vertical;
  const length = Math.hypot(m[0],m[1]);
  const height = Math.hypot(m[2],m[3]);
  if (!length || !height || vertical) return null; // vertical glyph metrics need separate treatment
  const ascent = Number.isFinite(style.ascent) ? style.ascent : Number.isFinite(style.descent) ? 1+style.descent : 0.8;
  const descent = Number.isFinite(style.descent) ? style.descent : ascent-1;
  const dx = m[0]/length*item.width, dy = m[1]/length*item.width;
  const bottom = [m[4]+m[2]*descent,m[5]+m[3]*descent];
  const top = [m[4]+m[2]*ascent,m[5]+m[3]*ascent];
  return [bottom,[bottom[0]+dx,bottom[1]+dy],[top[0]+dx,top[1]+dy],top];
}
export function candidateBlocks(page, candidate) {
  if (candidate.blockIds?.length) return page.blocks.filter(b=>candidate.blockIds.includes(b.id));
  return candidate.keys ? page.blocks.filter(b=>candidate.keys.includes(b.key)) : [];
}
