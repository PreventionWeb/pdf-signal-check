import { expect, it } from 'vitest';
import { identitySavedValues } from '../src/review/identity-values.js';
it('combines identical titles once while retaining every store and language source', () => {
 const report = { metadata: { infoTitle: 'Annual report', xmpTitles: [{ lang: 'x-default', text: 'Annual report' }, { lang: 'en-GB', text: 'Annual report' }] } };
 const result = identitySavedValues('title', report);
 expect(result.values).toHaveLength(1); expect(result.values[0].sources).toHaveLength(3);
 expect(report.metadata.xmpTitles).toHaveLength(2);
});
it('preserves conflicting and translated titles without selecting a canonical version', () => {
 const result = identitySavedValues('title', { metadata: { infoTitle: 'Report 2024', xmpTitles: [{ lang: 'x-default', text: 'Report 2025' }, { lang: 'fr', text: 'Rapport 2025' }] } });
 expect(result.values.map(item => item.value)).toEqual(['Report 2024', 'Report 2025', 'Rapport 2025']);
 expect(result.values[2].sources[0].source).toContain('fr');
});
it('preserves missing author stores and distinct author values', () => {
 expect(identitySavedValues('authors', { metadata: { author: 'Maya Chen', xmpAuthors: ['Leo Martin'] } }).values.map(item => item.value)).toEqual(['Maya Chen', 'Leo Martin']);
 expect(identitySavedValues('authors', { metadata: { author: 'Maya Chen', xmpAuthors: [] } }).missing).toHaveLength(1);
});
