import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { DocumentProperties, descriptionRepeatsTitle } from '../src/review/DocumentProperties.jsx';
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

it('does not repeat an author line that matches the XMP author list', () => {
  const markup = render({ author: 'Iris Hale; Owen Brooks', xmpAuthors: ['Iris Hale', 'Owen Brooks'] });
  expect(markup).toContain('<td>Iris Hale; Owen Brooks</td>');
});

it('explains the difference when the description only repeats the title', () => {
  const metadata = { infoTitle: 'UNDRR Strategic Framework 2026-2030', subject: 'UNDRR STRATEGIC FRAMEWORK, 2026-2030' };
  expect(descriptionRepeatsTitle(metadata)).toBe(true);
  expect(render(metadata)).toContain('The description repeats the title');
  expect(descriptionRepeatsTitle({ ...metadata, subject: 'Sets out priorities for reducing disaster risk from 2026 to 2030 for member states.' })).toBe(false);
  expect(descriptionRepeatsTitle({ infoTitle: 'Report', subject: '' })).toBe(false);
});
