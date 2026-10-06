import { DOMParser } from '@xmldom/xmldom';

export function readMetadata(info, rawXmp) {
  const result = { infoTitle: info.Title || null, author: info.Author || null,
    subject: info.Subject || null, keywords: info.Keywords || null,
    language: info.Language || null, xmpAuthors: [], xmpTitles: [], xmpError: null };
  if (!rawXmp) return result;
  try {
    if (rawXmp.length > 2_000_000 || /<!DOCTYPE|<!ENTITY/i.test(rawXmp)) throw new Error('XMP exceeds the supported size or contains a DTD.');
    const errors = [];
    const xml = new DOMParser({ onError: (level, message) => errors.push(`${level}: ${message}`) })
      .parseFromString(rawXmp, 'application/xml');
    if (errors.length) throw new Error(errors[0]);
    const titles = xml.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', 'title');
    for (let i = 0; i < titles.length; i++) {
      const entries = titles[i].getElementsByTagNameNS('http://www.w3.org/1999/02/22-rdf-syntax-ns#', 'li');
      if (!entries.length && titles[i].textContent.trim()) result.xmpTitles.push({ lang: null, text: titles[i].textContent.trim() });
      for (let j = 0; j < entries.length; j++) result.xmpTitles.push({
        lang: entries[j].getAttributeNS('http://www.w3.org/XML/1998/namespace', 'lang') || null,
        text: entries[j].textContent.trim(),
      });
    }
    result.xmpTitles = result.xmpTitles.filter(t => t.text);
    const creators = xml.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', 'creator');
    for (let i = 0; i < creators.length; i++) {
      const entries = creators[i].getElementsByTagNameNS('http://www.w3.org/1999/02/22-rdf-syntax-ns#', 'li');
      for (let j = 0; j < entries.length; j++) if (entries[j].textContent.trim()) result.xmpAuthors.push(entries[j].textContent.trim());
    }
  } catch (e) { result.xmpError = e.message; }
  return result;
}
