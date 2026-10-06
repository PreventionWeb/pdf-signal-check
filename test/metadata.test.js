import { expect, it } from 'vitest';
import { readMetadata } from '../src/engine/metadata.js';

it('preserves XMP title language alternatives with arbitrary namespace prefixes and CDATA', () => {
  const xmp = `<x:xmpmeta xmlns:x="adobe:ns:meta/"><r:RDF xmlns:r="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><r:Description xmlns:d="http://purl.org/dc/elements/1.1/"><d:title><r:Alt><r:li xml:lang="x-default">Flood &amp; risk 2026</r:li><r:li xml:lang="de"><![CDATA[Hochwasser & Risiko 2026]]></r:li></r:Alt></d:title></r:Description></r:RDF></x:xmpmeta>`;
  const metadata = readMetadata({ Title: 'Info title' }, xmp);
  expect(metadata.infoTitle).toBe('Info title');
  expect(metadata.xmpError).toBe(null);
  expect(metadata.xmpTitles).toEqual([{ lang: 'x-default', text: 'Flood & risk 2026' }, { lang: 'de', text: 'Hochwasser & Risiko 2026' }]);
});

it('does not treat malformed XML or DTD-based metadata as a completed parse', () => {
  expect(readMetadata({}, '<root><broken></root>').xmpError).toBeTruthy();
  expect(readMetadata({}, '<!DOCTYPE root><root/>').xmpError).toBeTruthy();
});
