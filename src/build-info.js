// Vite captures the timestamp once per build or development-server start.
export const BUILD_TIMESTAMP = typeof __BUILD_TIMESTAMP__ === 'string' ? __BUILD_TIMESTAMP__ : null;
export function buildLabel(timestamp = BUILD_TIMESTAMP) {
  if (!timestamp) return 'Local development';
  return `Build: ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' }).format(new Date(timestamp))}`;
}
