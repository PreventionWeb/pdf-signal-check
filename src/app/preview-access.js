// This is a client-side preview notice, following Mangrove PreviewAccess, not authentication.
export const PREVIEW_PIN = '5498';
// Mangrove 2.2 `persist="local"`: unlocks are shared across visits and tabs until they expire.
export const PREVIEW_MAX_AGE_DAYS = 30;
const DAY_MS = 86400000;
function browserStorage(name) {
  try { return globalThis[name]; } catch { return null; }
}
export const previewStorage = () => browserStorage('sessionStorage');
export const previewLocalStorage = () => browserStorage('localStorage');
export function previewScope(baseURI = globalThis.document?.baseURI || 'http://localhost/') {
  return `pdf-signal-check-v1:${new URL('./', baseURI).pathname}`;
}
/** Mangrove's 32-bit FNV-1a PIN fingerprint, so a changed PIN relocks stored local unlocks. Not a security measure. */
export function pinFingerprint(pin) {
  let hash = 0x811c9dc5;
  for (const char of String(pin)) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 0x01000193); }
  return (hash >>> 0).toString(16);
}
export function previewAccess({ storage = previewStorage(), local = previewLocalStorage(), scope = previewScope(), pin = PREVIEW_PIN,
  maxAgeDays = PREVIEW_MAX_AGE_DAYS, now = Date.now } = {}) {
  const key = `mg-preview-access:${scope}`;
  // Only the record format written below counts; expired, future-dated, other-PIN or malformed records are removed.
  const validLocal = raw => {
    let entry;
    try { entry = JSON.parse(raw); } catch { return false; }
    const age = now() - entry?.at;
    return entry?.pin === pinFingerprint(pin) && Number.isFinite(entry.at) && entry.at >= 0 && age >= 0 && age < maxAgeDays * DAY_MS;
  };
  const hasLocal = () => {
    try {
      const raw = local?.getItem(key);
      if (raw == null) return false;
      if (validLocal(raw)) return true;
      local.removeItem(key);
    } catch { /* Storage unavailable: treat as locked. */ }
    return false;
  };
  const hasSession = () => { try { return storage?.getItem(key) === 'unlocked'; } catch { return false; } };
  return {
    isUnlocked() { return hasLocal() || hasSession(); },
    unlock(value) {
      if (String(value).trim() !== pin) return false;
      try { local.setItem(key, JSON.stringify({ pin: pinFingerprint(pin), at: now() })); return true; } catch { /* Fall back to this tab. */ }
      try { storage?.setItem(key, 'unlocked'); } catch { /* Access still works for this mount when storage is unavailable. */ }
      return true;
    },
  };
}
