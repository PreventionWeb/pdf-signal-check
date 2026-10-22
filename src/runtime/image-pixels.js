/** Strict proof of a uniform crop. Any visible colour variation keeps it available; no semantic classifier decides this. */
export function uniformPixels(rgba) {
  if (!rgba?.length || rgba.length % 4) return false;
  const composite = i => [0, 1, 2].map(c => Math.round((rgba[i + c] * rgba[i + 3] + 255 * (255 - rgba[i + 3])) / 255));
  const first = composite(0);
  for (let i = 4; i < rgba.length; i += 4) for (let c = 0; c < 3; c++) {
    const value = Math.round((rgba[i + c] * rgba[i + 3] + 255 * (255 - rgba[i + 3])) / 255);
    if (value !== first[c]) return false;
  }
  return true;
}
/** Full bounded crop pixels: do not downsample away small real content. Unknown/decode failure is never blank. */
export async function inspectCropPixels(blob) {
  let bitmap, canvas;
  try {
    if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas !== 'function') return { blank: false, method: 'pixel-check-unavailable' };
    bitmap = await createImageBitmap(blob);
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 1_000_000) return { blank: false, method: 'pixel-check-unavailable' };
    canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0);
    return { blank: uniformPixels(ctx.getImageData(0, 0, bitmap.width, bitmap.height).data), method: 'uniform-pixels' };
  } catch { return { blank: false, method: 'pixel-check-unavailable' }; }
  finally { bitmap?.close(); if (canvas) canvas.width = canvas.height = 0; }
}
