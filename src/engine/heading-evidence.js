const heading = role => /^H[1-6]?$/.test(role || '');
const fragment = text => /^(?:and|of|for|to|with|by|from|at|on)\b/i.test(String(text).trim());
const box = blocks => {
  if (!blocks?.length || blocks.some(block => block.locationSafe === false || !block.quad?.flat().every(Number.isFinite))) return null;
  const points = blocks.flatMap(block => block.quad), xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  return { x: Math.min(...xs), right: Math.max(...xs), top: Math.max(...ys), bottom: Math.min(...ys), height: Math.max(...ys) - Math.min(...ys) };
};
export function evidenceBoundsByKey(page) {
  const grouped = new Map();
  for (const block of page.blocks || []) if (block.key) grouped.set(block.key, [...(grouped.get(block.key) || []), block]);
  return new Map([...grouped].map(([key, blocks]) => [key, box(blocks)]));
}

/** Recover a wrapped heading's preceding line only with close, aligned, same-size physical evidence.
 * Original tags and profile outcomes are never changed. Unrecovered connector fragments remain unavailable to AI.
 */
export function headingEvidenceBlocks(page) {
  const physical = new Map(), result = [];
  for (const block of page.blocks || []) if (block.key) physical.set(block.key, [...(physical.get(block.key) || []), block]);
  for (const block of (page.logicalBlocks || []).slice(0, 400)) {
    const previous = result.at(-1), a = box(physical.get(previous?.key)), b = box(physical.get(block.key));
    const continuation = heading(block.role) && fragment(block.text);
    const splitHeading = heading(block.role) && previous?.role === block.role
      && (continuation || /^\p{Ll}/u.test(String(block.text).trim()) || /\b(?:of|and|in|the|for|to|at|on|with)$/i.test(previous.text || ''));
    if ((continuation && previous?.role === 'P' || splitHeading) && previous.text?.length <= 160 && !/[.!?]$/.test(previous.text.trim())
      && a && b && a.height > 0 && b.height / a.height >= 0.8 && b.height / a.height <= 1.2
      && Math.abs(a.x - b.x) <= a.height && a.bottom >= b.top - 1 && a.bottom - b.top <= a.height * 0.6) {
      result.pop();
      result.push({ ...block, text: `${previous.text} ${block.text}`.replace(/\s+/g, ' ').trim(),
        keys: [...(previous.keys || [previous.key]), block.key].filter(Boolean), recoveredHeadingContext: true });
    } else result.push({ ...block, ...(continuation ? { headingFragment: true } : {}) });
  }
  return result;
}
