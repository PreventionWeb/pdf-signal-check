import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { analyzePdf } from '../src/engine/analyze.js';
import { normalizeFindings } from '../src/review/findings.js';
import { findingGroups, groupFigureFindings, groupHeadingFindings, reviewSummary, fixCard } from '../src/review/workspace.js';
import { pagePins } from '../src/review/page-pins.js';

const load = async name => analyzePdf(new Uint8Array(await readFile(new URL(`../public/samples/${name}.pdf`, import.meta.url))), { fileName: `${name}.pdf` });
const review = report => reviewSummary(report, groupFigureFindings(groupHeadingFindings(findingGroups(normalizeFindings(report).findings))));

describe('travel-further presentation', () => {
  it('pins the unlinked cross-reference under Check and keeps opportunities out of Fix and Check', async () => {
    const report = await load('image-chart-scrambled-text');
    const { buckets, headline } = review(report);
    const reference = buckets.check.find(item => item.source?.path === 'crossReferences');
    expect(fixCard(reference, report)).toMatchObject({ title: '“Map 2” isn’t a link', where: 'Page 2' });
    const entries = [...buckets.fix, ...buckets.check].map((item, index) => ({ number: index + 1, item }));
    const { pages, unlocated } = pagePins(entries, report);
    expect(unlocated.map(entry => entry.item.id)).not.toContain(reference.id);
    expect(pages.find(page => page.page === 2).pins.map(pin => pin.item.id)).toContain(reference.id);
    expect(buckets.check.some(item => item.source?.path === 'detachedValues')).toBe(true);

    expect(buckets.travel.map(item => item.source.path).sort()).toEqual(['figureData', 'machineMetadata', 'outline']);
    expect([...buckets.fix, ...buckets.check].some(item => item.category === 'opportunity')).toBe(false);
    // Opportunities never inflate the headline count of things to fix or check.
    expect(headline).toBe(`${buckets.fix.length} thing${buckets.fix.length === 1 ? '' : 's'} to fix, ${buckets.check.length} to check`);
    expect(fixCard(buckets.travel.find(item => item.source.path === 'outline'), report).title).toBe('Add bookmarks for the headings');
  });

  it('has nothing to add for the exemplar, and no unlinked reference to check', async () => {
    const report = await load('built-to-travel');
    const { buckets } = review(report);
    expect(buckets.travel).toEqual([]);
    expect(buckets.check.some(item => ['crossReferences', 'detachedValues'].includes(item.source?.path))).toBe(false);
    const successes = normalizeFindings(report).findings.filter(item => item.category === 'success').map(item => item.id);
    expect(successes).toEqual(expect.arrayContaining(['travel:cross-references', 'travel:links', 'travel:outline', 'travel:metadata', 'travel:figure-data']));
  });

  it('keeps an older report without these fields free of travel items', () => {
    const report = { analysisComplete: true, accepted: false, checks: [], pages: [], metadata: {} };
    expect(normalizeFindings(report).findings.some(item => item.id.startsWith('travel:'))).toBe(false);
  });
});

it('treats untagged links as a travel-further suggestion, and the exemplar tags its link', async () => {
  const { readFile } = await import('node:fs/promises');
  const { analyzePdf } = await import('../src/engine/analyze.js');
  const { normalizeFindings } = await import('../src/review/findings.js');
  const { fixBucket, fixCard } = await import('../src/review/workspace.js');
  const report = await analyzePdf(new Uint8Array(await readFile(new URL('../public/samples/built-to-travel.pdf', import.meta.url))), { fileName: 'built-to-travel.pdf' });
  expect(report.links.linksTagged).toBe('all');
  const untagged = { ...report, links: { ...report.links, linksTagged: 'none', taggedLinkElements: 0 } };
  const finding = normalizeFindings(untagged).findings.find(item => item.id === 'travel:links');
  expect(fixBucket(finding)).toBe('travel');
  expect(fixCard(finding, untagged).title).toBe('Tag your links so screen readers announce them');
});
