import React from 'react';
const features = [
  ['Saved title, authors and language', 'Yes', 'Looks for missing details and disagreements with the page, such as the wrong publication year.'],
  ['Text tags and reading order', 'Yes · bounded checks', 'Looks for missing or broken structure and clues to mixed-up steps. You review whether the full reading order makes sense.'],
  ['Image descriptions', 'Yes · presence checks', 'Finds labelled images with missing descriptions. You check that a description conveys the image’s important information.'],
  ['Links, bookmarks and supporting data', 'Yes · limited checks', 'Flags some references without links and numbers apart from their labels. Separately suggests opportunities for wider reuse; it does not open links or attached data.'],
  ['Hidden instructions for AI', 'Yes · basic pattern check', 'Looks for instruction-like text that readers can’t see: invisible, tiny, white or off-page text, document properties and image descriptions. Reworded or encoded text can be missed.'],
  ['AI text comparisons', 'With an AI model', 'Compares short text excerpts locally. Relatedness is advisory, not proof of correctness.'],
  ['Image or chart meaning', 'No', 'Does not interpret pixels, verify chart values or assess alternate-text accuracy.'],
  ['PDF/UA or PDF/A certification', 'No', 'Checks a limited project text profile; does not certify accessibility or archival conformance.'],
  ['Repairing your PDF', 'No', 'Shows evidence and guidance. Make changes in your source document and export again.'],
];
export function Capabilities() {
  return <section className="tool-capabilities" aria-label="Tool capabilities">
    <h2>What this tool checks</h2>
    <p>Use the results to repair missing meaning, then consider ways to help the report travel further. A clear result is not a guarantee of accessibility, search visibility or accurate AI answers.</p>
    <div className="mg-table-scroll-region">
      <table className="mg-table">
        <caption className="mg-u-sr-only">What PDF Signal Check does and does not do</caption>
        <thead><tr><th scope="col">Feature</th><th scope="col">Included</th><th scope="col">What to expect</th></tr></thead>
        <tbody>{features.map(([feature, included, detail]) => <tr key={feature}><th scope="row">{feature}</th><td><strong>{included}</strong></td><td>{detail}</td></tr>)}</tbody>
      </table>
    </div>
  </section>;
}
