/** Store only the user's notice preference; no document content enters storage. */
export function initializeAiNotice({ onStorageFailure = () => {} } = {}) {
  const dialog = document.querySelector('#ai-info-dialog');
  const opener = document.querySelector('#about-ai');
  const checkbox = document.querySelector('#ai-info-suppress');
  const understand = document.querySelector('#ai-info-understand');
  const note = document.querySelector('#ai-info-preference-note');
  const preferenceKey = 'pdf-input-check.hide-ai-notice.v1';
  let returnFocus = null;
  const readPreference = () => {
    try { return localStorage.getItem(preferenceKey) === '1'; }
    catch {
      note.textContent = 'This browser cannot read the notice preference. You can continue, but this notice may appear again. No PDF data is stored.';
      return false;
    }
  };
  const open = () => {
    if (dialog.open) return;
    returnFocus = document.activeElement;
    checkbox.checked = readPreference();
    dialog.showModal();
    understand.focus({ preventScroll: true });
  };
  const close = () => {
    if (!dialog.open) return;
    try {
      if (checkbox.checked) localStorage.setItem(preferenceKey, '1');
      else localStorage.removeItem(preferenceKey);
    } catch {
      onStorageFailure('Notice preference could not be saved. You can continue; this notice may appear again.');
    }
    dialog.close();
    const target = returnFocus && returnFocus !== document.body && returnFocus.isConnected ? returnFocus : opener;
    target.focus({ preventScroll: true });
  };
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape' || event.code === 'Escape' || event.keyCode === 27) {
      event.preventDefault(); event.stopPropagation();
      close();
    }
  });
  understand.addEventListener('click', close);
  opener.addEventListener('click', open);
  if (!readPreference()) open();
}
