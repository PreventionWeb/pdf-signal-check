const GAP = 44;
const EDGE = GAP / 2;

/** Screen-space gutter layout only; source boxes and issue numbers stay unchanged. */
export function layoutPinMarkers(pins, boxes, height) {
  if (!Number.isFinite(height) || height < GAP) return [];
  const located = pins.flatMap((pin, index) => {
    const box = boxes?.[index];
    return box && Number.isFinite(box.y) ? [{ pin, box, anchor: Math.max(0, Math.min(height, box.y * height)) }] : [];
  }).sort((a, b) => a.anchor - b.anchor || a.pin.number - b.pin.number);
  const runs = [];
  for (const item of located) {
    const last = runs.at(-1);
    if (last && item.anchor - last.at(-1).anchor < GAP) last.push(item);
    else runs.push([item]);
  }
  // A few nearby pins remain individually visible. Dense runs become an issue menu.
  const groups = runs.flatMap(run => run.length > 3 ? [run] : run.map(item => [item]));
  const center = group => group.reduce((sum, item) => sum + item.anchor, 0) / group.length;
  const capacity = Math.floor(height / GAP);
  while (groups.length > capacity) {
    let closest = 0;
    for (let i = 1; i < groups.length - 1; i++) {
      if (center(groups[i + 1]) - center(groups[i]) < center(groups[closest + 1]) - center(groups[closest])) closest = i;
    }
    groups.splice(closest, 2, [...groups[closest], ...groups[closest + 1]]);
  }
  const result = groups.map(items => ({ items, y: Math.max(EDGE, Math.min(height - EDGE, center(items))) }));
  for (let i = 1; i < result.length; i++) result[i].y = Math.max(result[i].y, result[i - 1].y + GAP);
  if (result.length) result.at(-1).y = Math.min(result.at(-1).y, height - EDGE);
  for (let i = result.length - 2; i >= 0; i--) result[i].y = Math.min(result[i].y, result[i + 1].y - GAP);
  return result;
}
