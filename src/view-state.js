/** Preserve disclosure choices across view rebuilds without retaining source data. */
export function captureDisclosureState(root) {
  return new Map([...root.querySelectorAll('details[data-disclosure-key]')].map(detail=>[detail.dataset.disclosureKey,detail.open]));
}
export function restoreDisclosureState(root,state) {
  for(const detail of root.querySelectorAll('details[data-disclosure-key]')) {
    if(state.has(detail.dataset.disclosureKey))detail.open=state.get(detail.dataset.disclosureKey);
  }
}
