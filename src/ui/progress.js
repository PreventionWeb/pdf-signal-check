/** Presentation only: decimal units match the displayed model download costs. */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Unknown size';
  const units = ['bytes', 'KB', 'MB', 'GB'];
  let amount = bytes, unit = 0;
  while (amount >= 1000 && unit < units.length - 1) { amount /= 1000; unit++; }
  return `${amount.toLocaleString('en', { maximumFractionDigits: unit ? 1 : 0 })} ${units[unit]}`;
}
export function formatProgress(progress) {
  if (progress.unit === 'bytes') return `${formatBytes(progress.completed)}${progress.total > 0 ? ` of ${formatBytes(progress.total)}` : ''} downloaded`;
  return `${progress.completed} / ${progress.total} ${progress.unit || 'units'}`;
}
