import { describe, expect, it } from 'vitest';
import { wordDiff } from '../src/review/diff.js';
import { findingPlaces, samePlace } from '../src/review/places.jsx';

describe('word diff', () => {
  it('marks only the words that differ, ignoring case', () => {
    const diff = wordDiff('Mountain Observatory annual report 2024', 'Harbor Observatory Annual Report 2025');
    expect(diff.left.filter(token => token.changed).map(token => token.text)).toEqual(['Mountain', '2024']);
    expect(diff.right.filter(token => token.changed).map(token => token.text)).toEqual(['Harbor', '2025']);
  });
  it('marks a dropped colon and keeps the original spacing', () => {
    const diff = wordDiff('Risk: a review', 'Risk a review');
    expect(diff.left.map(token => `${token.space ? ' ' : ''}${token.text}`).join('')).toBe('Risk: a review');
    expect(diff.left.find(token => token.text === ':').changed).toBe(true);
    expect(wordDiff('Same title', 'same Title').changed).toBe(false);
  });
});

describe('places an issue points at', () => {
  const quad = [[0, 0], [1, 0], [1, 1], [0, 1]];
  it('lists hidden passages with a position, labelled, and skips ones without', () => {
    const finding = { source: { path: 'hiddenInstructions' }, comparison: { matches: [{ kind: 'page', page: 1, quads: [quad], text: 'x' }, { kind: 'property', field: 'Subject', text: 'y' }] } };
    expect(findingPlaces(finding, [], null)).toEqual([expect.objectContaining({ page: 1, label: expect.stringMatching(/hidden/i) })]);
  });
  it('treats a spread copy of a target as the same place, and another page as different', () => {
    const target = { page: 2, quads: [quad] };
    expect(samePlace(target, { ...target, focusRegion: true })).toBe(true);
    expect(samePlace(target, { page: 3, quads: [quad] })).toBe(false);
  });
  it('has no places for reading order, which shows its own view', () => {
    expect(findingPlaces({ targets: [{ page: 1 }] }, [{ page: 1 }], 'order')).toEqual([]);
  });
});

describe('when to mark differences', () => {
  it('does not mark two unrelated values end to end', () => {
    expect(wordDiff('Iris Hale; Owen Brooks', 'Authors: Maya Chen; Leo Martin').comparable).toBe(false);
    expect(wordDiff('Mountain Observatory Annual Report 2024', 'Harbor Observatory Annual Report 2025').comparable).toBe(true);
  });
});

describe('very large pages', () => {
  it('builds findings for a page with hundreds of thousands of graphics without overflowing the stack', async () => {
    const { normalizeFindings } = await import('../src/review/findings.js');
    const graphics = Array.from({ length: 200000 }, (_, i) => ({ label: `graphic ${i}` }));
    const report = { analysisComplete: true, metadata: {}, pages: [{ number: 1, blocks: [], graphics }],
      checks: [{ id: 'supported-content', status: 'indeterminate', label: 'Supported content', summary: '' }] };
    expect(() => normalizeFindings(report)).not.toThrow();
  });
});
