import React from 'react';

/** Shows extracted saved values only; filename and visible page text are never substitutes. */
export function DocumentProperties({ metadata = {} }) {
  const text = value => typeof value === 'string' ? value.trim() : '';
  // One row per property: values saved in either place (PDF properties or XMP) are listed together.
  const merged = (...values) => [...new Set(values.flat().map(text).filter(Boolean))].join('\n');
  const rows = [
    ['Title', merged(metadata.infoTitle, (metadata.xmpTitles || []).filter(item => text(item.text)).map(item => `${item.lang && item.lang !== 'x-default' ? `${item.lang}: ` : ''}${text(item.text)}`)), !!metadata.xmpError],
    ['Description (Subject)', text(metadata.subject)],
    ['Keywords', text(metadata.keywords)],
    ['Author', merged(metadata.author, metadata.xmpAuthors || []), !!metadata.xmpError],
    ['Language', text(metadata.language)],
  ];
  return <section className="document-properties" aria-labelledby="document-properties-title">
    <h3 id="document-properties-title">What is saved in this PDF</h3>
    <table>
      <thead><tr><th scope="col">Property</th><th scope="col">Status</th><th scope="col">Saved value</th></tr></thead>
      <tbody>{rows.map(([label, value, unreadable]) => <tr key={label}>
        <th scope="row">{label}</th>
        <td><strong>{value ? 'Set' : unreadable ? 'Could not read' : 'Missing'}</strong></td>
        <td>{value || (unreadable ? 'Part of the saved information could not be read.' : '—')}</td>
      </tr>)}</tbody>
    </table>
  </section>;
}
