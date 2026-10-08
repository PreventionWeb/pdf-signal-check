// This is a client-side preview notice, following Mangrove PreviewAccess, not authentication.
export const PREVIEW_PIN = '5498';
export function previewStorage() {
  try { return globalThis.sessionStorage; } catch { return null; }
}
export function previewScope(baseURI = globalThis.document?.baseURI || 'http://localhost/') {
  return `pdf-signal-check-v1:${new URL('./', baseURI).pathname}`;
}
export function previewAccess({ storage = previewStorage(), scope = previewScope(), pin = PREVIEW_PIN } = {}) {
  const key = `mg-preview-access:${scope}`;
  return {
    isUnlocked() { try { return storage?.getItem(key) === 'unlocked'; } catch { return false; } },
    unlock(value) {
      if (String(value).trim() !== pin) return false;
      try { storage?.setItem(key, 'unlocked'); } catch { /* Access still works for this mount when storage is unavailable. */ }
      return true;
    },
  };
}
