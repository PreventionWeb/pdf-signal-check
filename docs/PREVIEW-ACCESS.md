# Preview access

The bootstrap uses the published [Mangrove PreviewAccess pattern](https://mangrove.undrr.org/ai-components/components-preview-access.json), with the requested default PIN **5498**. Its `mg-preview-access__*` classes come from the pinned institutional theme. React owns a native modal dialog rather than invoking the package's body-mutating vanilla initializer. No external startup JavaScript is added.

`src/main.jsx` renders `PreviewGate` before the lazy application. Until a correct PIN is submitted, App does not mount: no sample manifest, PDF processing, calibration or model downloads start. The existing `story.html` forwarding entry leads to the same gated application and retains its requested scene. Institutional theme assets may still load before unlock.

Unlock follows Mangrove 2.2’s opt-in `persist="local"` mode with a 30-day max age (`PREVIEW_MAX_AGE_DAYS`). It stores `{ pin, at }` in `localStorage` under `mg-preview-access:pdf-signal-check-v1:<base-path>`: `pin` is Mangrove’s 32-bit FNV-1a fingerprint of the PIN, not the PIN, and `at` is the unlock time. The unlock is shared across tabs and visits on that base path. Expired, future-dated, malformed and other-PIN records are treated as locked and removed. If local storage is denied, the unlock falls back to the value `unlocked` in `sessionStorage` for that tab’s session, which is also honoured; if both are denied, unlocking still works for the current mount and reload asks again. Neither record contains document data. After a PIN unlock, focus moves to the application’s main landmark unless a dialog has already taken it. Incorrect PINs leave the app unmounted and announce an error. Escape does not dismiss the gate; the native dialog contains keyboard focus.

This is Mangrove's preview notice, not authentication or protection for confidential content. The static bundle contains the PIN, and static assets remain directly accessible.

## Launch removal

In `src/main.jsx`, remove the `PreviewGate` wrapper and its import, leaving the application and Suspense rendering intact. Then remove `src/app/PreviewGate.jsx`, `src/app/preview-access.js`, `src/app/preview-gate.css` and `test/preview-access.test.js`. The stored unlock record is harmless after the gate is removed. No engine/profile changes are required. Before launch, verify the app and a `story.html?scene=...` link at both the root and repository-prefixed URL.

To change the preview code before launch, edit `PREVIEW_PIN` in `src/app/preview-access.js`. Local unlocks made with the old PIN stop matching its fingerprint; also bump the `pdf-signal-check-v1` scope so session fallback unlocks are asked again too. It is a public static configuration value, not a backend secret.
