import React from 'react';

const comparable = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
/** True when the saved description only repeats the title (ignoring case, punctuation and spacing). */
export function descriptionRepeatsTitle(metadata = {}) {
  const description = comparable(metadata.subject);
  if (!description) return false;
  return [metadata.infoTitle, ...(metadata.xmpTitles || []).map(item => item.text)].map(comparable).filter(Boolean)
    .some(title => title === description || ((title.includes(description) || description.includes(title)) && Math.min(title.length, description.length) / Math.max(title.length, description.length) > 0.75));
}
/** Shows extracted saved values only; filename and visible page text are never substitutes. */
export function DocumentProperties({ metadata = {}, title = 'What is saved in this PDF', annotate }) {
  const text = value => typeof value === 'string' ? value.trim() : '';
  // One row per property: values saved in either place (PDF properties or XMP) are listed together.
  const merged = (...values) => [...new Set(values.flat().map(text).filter(Boolean))].join('\n');
  const rows = [
    ['Title', merged(metadata.infoTitle, (metadata.xmpTitles || []).filter(item => text(item.text)).map(item => `${item.lang && item.lang !== 'x-default' ? `${item.lang}: ` : ''}${text(item.text)}`)), !!metadata.xmpError],
    ['Description (Subject)', text(metadata.subject)],
    ['Keywords', text(metadata.keywords)],
    // XMP stores authors as a list; join it so a matching PDF-properties author line is not repeated name by name.
    ['Author', merged(metadata.author, (metadata.xmpAuthors || []).map(text).filter(Boolean).join('; ')), !!metadata.xmpError],
    ['Language', text(metadata.language)],
  ];
  return <section className="document-properties" aria-labelledby={title ? "document-properties-title" : undefined} aria-label={title ? undefined : "Saved document properties"}>
    {title && <h3 id="document-properties-title">{title}</h3>}
    <table>
      <thead><tr><th scope="col">Property</th><th scope="col">Status</th><th scope="col">Saved value</th></tr></thead>
      <tbody>{rows.map(([label, value, unreadable]) => <tr key={label}>
        <th scope="row">{label}</th>
        <td><strong>{value ? 'Set' : unreadable ? 'Could not read' : 'Missing'}</strong></td>
        <td>{value || (unreadable ? 'Part of the saved information could not be read.' : '—')}{annotate?.(label)}</td>
      </tr>)}</tbody>
    </table>
    {descriptionRepeatsTitle(metadata) && <div className="document-properties-note" role="note">
      <h4>The description repeats the title</h4>
      <p>They do different jobs. The <strong>title</strong> names the document. The <strong>description</strong> (the Subject field) says in one or two sentences what the document covers and who it is for. Software that uses these saved details can help people identify a relevant report without opening every page.</p>
      <p className="model-note">For example: Title “Annual Report 2025”. Description “Summarizes our work in 2025, including results by region, spending and priorities for 2026. Written for partners and member states.”</p>
      <p>Ask the designer to write a short summary in the Subject field of the source document’s properties, then export again.</p>
    </div>}
  </section>;
}
