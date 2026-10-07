import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { DocumentProperties } from '../src/review/DocumentProperties.jsx';
const render = metadata => renderToStaticMarkup(React.createElement(DocumentProperties, { metadata }));
it('merges saved values from both sources and missing properties without substituting page text', () => {
  const markup = render({ infoTitle: ' ', subject: null, keywords: '', author: '<Publisher>', language: 'en-GB', xmpTitles: [{ lang: 'de', text: 'Titel' }, { lang: 'en', text: 'Title' }], xmpAuthors: ['Other publisher'] });
  expect(markup).toContain('Title</th><td><strong>Set');
  expect(markup).toContain('&lt;Publisher&gt;');
  expect(markup).toContain('de: Titel\nen: Title');
  expect(markup).toContain('en-GB');
  expect(markup).toContain('Other publisher');
});
it('distinguishes unreadable XMP from confirmed missing saved fields', () => {
  const markup = render({ xmpError: 'Malformed XML' });
  expect(markup).toContain('Title</th><td><strong>Could not read');
  expect(markup).toContain('Author</th><td><strong>Could not read');
  expect(markup).toContain('Description (Subject)</th><td><strong>Missing');
});
