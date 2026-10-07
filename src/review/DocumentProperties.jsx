import React from 'react';

/** Shows extracted saved values only; filename and visible page text are never substitutes. */
export function DocumentProperties({ metadata = {} }) {
  const text = value => typeof value === 'string' ? value.trim() : '';
  const rows = [
    ['Title (PDF properties)', text(metadata.infoTitle)],
    ['Title (XMP metadata)', (metadata.xmpTitles || []).filter(item => text(item.text)).map(item => `${item.lang ? `${item.lang}: ` : ''}${text(item.text)}`).join('\n'), !!metadata.xmpError],
    ['Description (Subject)', text(metadata.subject)],
    ['Keywords', text(metadata.keywords)],
    ['Author (PDF properties)', text(metadata.author)],
    ['Author (XMP metadata)', (metadata.xmpAuthors || []).map(text).filter(Boolean).join('; '), !!metadata.xmpError],
    ['Language', text(metadata.language)],
  ];
  return <section className="document-properties" aria-labelledby="document-properties-title">
    <h3 id="document-properties-title">What is saved in this PDF</h3>
    <table>
      <thead><tr><th scope="col">Property</th><th scope="col">Status</th><th scope="col">Saved value</th></tr></thead>
      <tbody>{rows.map(([label, value, unreadable]) => <tr key={label}>
        <th scope="row">{label}</th>
        <td><strong>{unreadable ? 'Could not read' : value ? 'Set' : 'Missing'}</strong></td>
        <td>{unreadable ? 'XMP metadata could not be read reliably.' : value || '—'}</td>
      </tr>)}</tbody>
    </table>
  </section>;
}
