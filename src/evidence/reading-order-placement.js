const finiteQuad = quad => quad?.length === 4 && quad.every(point => point?.length === 2 && point.every(Number.isFinite));
export function hasUnsafePageScope(report, pageNumber) {
  const page = report?.pages?.find(page => page.number === pageNumber);
  if (page?.evidenceGeometryScoped === true) return false;
  // A complete per-page operator inventory overrides document-wide limitations.
  // Older captured reports have no inventory, so retain their conservative fallback.
  if (Number.isInteger(page?.formXObjectInvocations) && page.formXObjectInvocations >= 0)
    return page.formXObjectInvocations > 0;
  return Boolean(report?.checks?.some(check => check.evidence?.some(item => typeof item === 'string' && item.includes('Form XObjects'))));
}
/** The renderer and availability copy share the same key/geometry joins and region limit. */
export function readingOrderPlacement(report, pageNumber, { limit = 1500 } = {}) {
  const page = report?.pages?.find(page => page.number === pageNumber);
  const logical = page?.logicalBlocks || [];
  const recovered = logical.filter(block => block.text?.trim()).length;
  const unsafe = hasUnsafePageScope(report, pageNumber);
  const regions = [];
  const located = new Set();
  const byKey = new Map();
  for (const block of page?.blocks || []) {
    if (page.evidenceGeometryScoped && !block.locationSafe) continue;
    if (typeof block.key !== 'string' || !block.key || !finiteQuad(block.quad)) continue;
    if (!byKey.has(block.key)) byKey.set(block.key, []);
    byKey.get(block.key).push(block.quad);
  }
  if (!unsafe) logical.forEach((block, index) => {
    if (!block.text?.trim()) return;
    for (const quad of byKey.get(block.key) || []) {
      if (regions.length >= limit) continue;
      regions.push({ quad, kind: 'order', number: index + 1, label: !located.has(index) });
      if (block.text?.trim()) located.add(index);
    }
  });
  return { recovered, located: located.size, unlocated: recovered - located.size, unsafe, regions };
}
