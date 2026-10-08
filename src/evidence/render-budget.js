export const RENDER_BUDGET = Object.freeze({ maxSide: 4096, maxPixels: 8_000_000 });

/** Apply the same allocation ceiling to source crops, page pins and preview canvases. */
export function boundedRenderScale(width, height, requestedScale = 1) {
  if (![width, height, requestedScale].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error('The PDF page has invalid dimensions or cannot be rendered at this scale.');
  }
  const scale = Math.min(
    requestedScale,
    RENDER_BUDGET.maxSide / Math.max(width, height),
    Math.sqrt(RENDER_BUDGET.maxPixels) / Math.sqrt(width) / Math.sqrt(height),
  );
  if (!Number.isFinite(scale) || scale <= 0) throw new Error('The PDF page dimensions exceed the supported rendering range.');
  return scale;
}
