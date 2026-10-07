import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { analyzePdf } from '../src/engine/analyze.js';
import { inspectCrossReferences, inspectDetachedValues, inspectOutline } from '../src/engine/travel.js';

const load = async name => analyzePdf(new Uint8Array(await readFile(new URL(`../public/samples/${name}.pdf`, import.meta.url))), { fileName: `${name}.pdf` });
const REQUIRED = ['load', 'title', 'language', 'text', 'structure', 'coverage', 'supported-content', 'content-integrity', 'completion'];

describe('travel-further advisories on the story samples', () => {
  it('reports the failure demo’s unlinked Map 2, missing bookmarks, chart without data and detached headline number', async () => {
    const report = await load('image-chart-scrambled-text');
    expect(report.crossReferences.status).toBe('requires-review');
    expect(report.crossReferences.references).toEqual([expect.objectContaining({ page: 2, text: 'Map 2', linked: false })]);
    // The estimated region sits inside its sentence, so a pin lands on the reference rather than an invented spot.
    const [reference] = report.crossReferences.references;
    const sentence = report.pages[1].blocks.find(block => block.id === reference.blockId);
    const xs = quad => quad.map(point => point[0]);
    expect(Math.min(...xs(reference.quad))).toBeGreaterThan(Math.min(...xs(sentence.quad)));
    expect(Math.max(...xs(reference.quad))).toBeLessThan(Math.max(...xs(sentence.quad)));
    expect(report.links.count).toBe(0);
    expect(report.outline).toMatchObject({ status: 'opportunity', count: 0 });
    expect(report.figureData.status).toBe('opportunity');
    expect(report.figureData.items.every(item => !item.hasEquivalent)).toBe(true);
    expect(report.machineMetadata.structuredData).toEqual([]);
    expect(report.detachedValues.findings).toEqual([expect.objectContaining({ page: 2, value: '+0.7 m' })]);
  });

  it('reports the exemplar’s link, bookmarks, JSON-LD and the data behind its figure', async () => {
    const report = await load('built-to-travel');
    expect(report.links.links).toEqual([expect.objectContaining({ page: 2, target: 'uri', url: 'https://example.org/harbor-observatory/2025/annex#map-2' })]);
    expect(report.crossReferences).toMatchObject({ status: 'present', unlinked: 0, linked: 1 });
    expect(report.outline.status).toBe('present');
    expect(report.outline.count).toBeGreaterThanOrEqual(5);
    expect(report.machineMetadata.status).toBe('present');
    expect(report.machineMetadata.structuredData.map(file => file.name)).toEqual(['harbor-observatory-2025-report.jsonld']);
    expect(report.figureData.status).toBe('present');
    expect(report.figureData.tables).toEqual([expect.objectContaining({ pages: [2], headerCells: true })]);
    expect(report.figureData.dataFiles).toEqual([expect.objectContaining({ name: 'harbor-observatory-2025-station-visibility.csv', relationship: 'Data' })]);
    expect(report.detachedValues.findings).toEqual([]);
  });

  it('keeps the advisories out of the required profile checks', async () => {
    for (const name of ['image-chart-scrambled-text', 'built-to-travel']) {
      const report = await load(name);
      expect(report.checks.map(check => check.id).every(id => REQUIRED.includes(id))).toBe(true);
    }
  });

  it('does not count a figure caption as a cross-reference', async () => {
    const report = await load('well-prepared');
    expect(report.pages.some(page => page.blocks.some(block => /^Figure 1\./.test(block.text)))).toBe(true);
    expect(report.crossReferences.references).toEqual([]);
  });
});

const page = (texts, extra = {}) => ({ number: 1, blocks: texts.map((text, id) => ({ id, text, key: `1:${id}`, role: 'P',
  quad: [[50, 100 - id * 20], [350, 100 - id * 20], [350, 112 - id * 20], [50, 112 - id * 20]] })), ...extra });

describe('cross-reference matching', () => {
  it('finds report-style references and ignores ordinary words', () => {
    const result = inspectCrossReferences([page(['The values are in Annex IV and in Table 3.2; see page 14.', 'The team maps a route each year.', 'Section headings help readers.'])], [{ page: 1, links: [] }]);
    expect(result.references.map(reference => reference.text)).toEqual(['Annex IV', 'Table 3.2', 'see page 14']);
  });

  it('only treats a link as covering the reference when it overlaps the reference itself', () => {
    const pages = [page(['Station locations are shown in Map 2 in the annex.'])];
    const elsewhere = inspectCrossReferences(pages, [{ page: 1, links: [{ rect: [50, 100, 90, 112], target: 'uri' }] }]);
    expect(elsewhere.references[0].linked).toBe(false);
    // "Map 2" sits at characters 31-36 of 51, which is about x 232-262 in this 300-unit block.
    const over = inspectCrossReferences(pages, [{ page: 1, links: [{ rect: [228, 98, 262, 114], target: 'goto' }] }]);
    expect(over.references[0]).toMatchObject({ linked: true, linkTarget: 'goto' });
  });

  it('leaves the reference unplaced when the text comes from a reused Form XObject', () => {
    const result = inspectCrossReferences([page(['See Figure 2 for detail.'], { formXObjectInvocations: 1 })], [{ page: 1, links: [] }]);
    expect(result.references[0]).toMatchObject({ quad: null, linked: null });
    expect(result.unlinked).toBe(1);
  });

  it('is not assessed when annotations could not be read', () => {
    expect(inspectCrossReferences([page(['See Figure 2.'])], null).status).toBe('not-assessed');
  });
});

describe('outline and detached values', () => {
  it('asks for bookmarks only when headings or length make them useful', () => {
    const headings = n => [{ number: 1, candidates: Array.from({ length: n }, (_, i) => ({ source: 'tagged H2', text: `Heading ${i}` })) }];
    expect(inspectOutline(null, headings(2)).status).toBe('opportunity');
    expect(inspectOutline(null, headings(1)).status).toBe('not-needed');
    expect(inspectOutline([{ title: 'Heading 0', dest: 'a', items: [{ title: 'Heading 1', dest: 'b', items: [] }] }], headings(2)))
      .toMatchObject({ status: 'present', count: 2, depth: 2, headingsInOutline: 2 });
  });

  it('flags a value only when its tagged label is drawn apart from it, and never a bare year or table cell', () => {
    const logical = [{ key: '1:0', text: '+12%', role: 'P' }, { key: '1:1', text: 'more households reached this year', role: 'P' }, { key: '1:2', text: 'Unrelated closing paragraph text here.', role: 'P' }];
    const drawn = order => order.map((key, id) => ({ id, key, text: '' }));
    expect(inspectDetachedValues([{ number: 1, logicalBlocks: logical, blocks: drawn(['1:0', '1:1', '1:2']) }]).findings).toEqual([]);
    expect(inspectDetachedValues([{ number: 1, logicalBlocks: logical, blocks: drawn(['1:1', '1:2', '1:0']) }]).findings)
      .toEqual([expect.objectContaining({ value: '+12%' })]);
    const year = [{ ...logical[0], text: '2024' }, ...logical.slice(1)];
    expect(inspectDetachedValues([{ number: 1, logicalBlocks: year, blocks: drawn(['1:1', '1:2', '1:0']) }]).findings).toEqual([]);
    const cell = [{ ...logical[0], role: 'TD' }, ...logical.slice(1)];
    expect(inspectDetachedValues([{ number: 1, logicalBlocks: cell, blocks: drawn(['1:1', '1:2', '1:0']) }]).findings).toEqual([]);
  });
});
