/** Presentation only: combine exact duplicate values without selecting a canonical store. */
export function identitySavedValues(kind, report) {
  const metadata = report.metadata || {};
  const entries = kind === 'title'
    ? [{ source: 'PDF properties (Info)', topic: 'info', value: metadata.infoTitle },
      ...(metadata.xmpTitles?.length ? metadata.xmpTitles.map(item => ({ source: `Embedded metadata (XMP${item.lang ? `, ${item.lang === 'x-default' ? 'default language' : item.lang}` : ''})`, topic: 'xmp', value: item.text })) : [{ source: 'Embedded metadata (XMP)', topic: 'xmp', value: null }])]
    : [{ source: 'PDF properties (Info)', topic: 'info', value: metadata.author },
      { source: 'Embedded metadata (XMP)', topic: 'xmp', value: (report.authorConsistency?.metadataAuthors?.xmp || metadata.xmpAuthors || []).join('; ') }];
  const values = [];
  for (const entry of entries) {
    if (typeof entry.value !== 'string' || !entry.value.trim()) continue;
    const existing = values.find(item => item.value === entry.value);
    if (existing) existing.sources.push(entry);
    else values.push({ value: entry.value, sources: [entry] });
  }
  return { values, missing: entries.filter(item => !item.value?.trim()) };
}
