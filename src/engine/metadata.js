import { DOMParser } from '@xmldom/xmldom';

const DC = 'http://purl.org/dc/elements/1.1/';
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
// Publication-level Dublin Core properties that help catalogues and tools identify, cite and reuse a document.
// Title and creator keep their dedicated fields. These values are producer statements and are never verified.
export const XMP_PROPERTY_FIELDS = ['publisher', 'rights', 'date', 'identifier', 'format', 'description', 'subject', 'language', 'type', 'source', 'relation'];
const MAX_VALUES = 24, MAX_LENGTH = 1024;

export function readMetadata(info, rawXmp) {
  const result = { infoTitle: info.Title || null, author: info.Author || null,
    subject: info.Subject || null, keywords: info.Keywords || null,
    language: info.Language || null, xmpAuthors: [], xmpTitles: [], xmpProperties: {}, xmpError: null };
  if (!rawXmp) return result;
  try {
    if (rawXmp.length > 2_000_000 || /<!DOCTYPE|<!ENTITY/i.test(rawXmp)) throw new Error('XMP exceeds the supported size or contains a DTD.');
    const errors = [];
    const xml = new DOMParser({ onError: (level, message) => errors.push(`${level}: ${message}`) })
      .parseFromString(rawXmp, 'application/xml');
    if (errors.length) throw new Error(errors[0]);
    const titles = xml.getElementsByTagNameNS(DC, 'title');
    for (let i = 0; i < titles.length; i++) {
      const entries = titles[i].getElementsByTagNameNS(RDF, 'li');
      if (!entries.length && titles[i].textContent.trim()) result.xmpTitles.push({ lang: null, text: titles[i].textContent.trim() });
      for (let j = 0; j < entries.length; j++) result.xmpTitles.push({
        lang: entries[j].getAttributeNS('http://www.w3.org/XML/1998/namespace', 'lang') || null,
        text: entries[j].textContent.trim(),
      });
    }
    result.xmpTitles = result.xmpTitles.filter(t => t.text);
    const creators = xml.getElementsByTagNameNS(DC, 'creator');
    for (let i = 0; i < creators.length; i++) {
      const entries = creators[i].getElementsByTagNameNS(RDF, 'li');
      for (let j = 0; j < entries.length; j++) if (entries[j].textContent.trim()) result.xmpAuthors.push(entries[j].textContent.trim());
    }
    // Bounded: at most 24 values of 1,024 characters per property.
    for (const field of XMP_PROPERTY_FIELDS) {
      const values = [], elements = xml.getElementsByTagNameNS(DC, field);
      for (let i = 0; i < elements.length && values.length < MAX_VALUES; i++) {
        const entries = elements[i].getElementsByTagNameNS(RDF, 'li');
        const texts = entries.length ? Array.from({ length: entries.length }, (_, j) => entries[j].textContent) : [elements[i].textContent];
        for (const text of texts) if (text.trim() && values.length < MAX_VALUES) values.push(text.trim().slice(0, MAX_LENGTH));
      }
      if (values.length) result.xmpProperties[field] = values;
    }
  } catch (e) { result.xmpError = e.message; }
  return result;
}
