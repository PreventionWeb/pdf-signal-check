import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { analyzePdf } from '../src/engine/analyze.js';
import { normalizeFindings } from '../src/review/findings.js';
import { findingGroups, groupFigureFindings, groupHeadingFindings, reviewSummary, fixCard } from '../src/review/workspace.js';
import { orderComparisonData } from '../src/review/order-comparison.js';

const load = async name => analyzePdf(new Uint8Array(await readFile(new URL(`../public/samples/${name}.pdf`, import.meta.url))), { fileName: `${name}.pdf` });
const buckets = report => reviewSummary(report, groupFigureFindings(groupHeadingFindings(findingGroups(normalizeFindings(report).findings)))).buckets;

describe('story samples', () => {
  it('flags the picture-only chart and the drawing-order scramble, while the tags stay in order', async () => {
    const report = await load('image-chart-scrambled-text');
    expect(report.readingOrder.findings.map(finding => finding.detector)).toEqual(['numbered-step-drawing-order']);
    const data = orderComparisonData(report);
    expect(data.anomalyLane).toBe('drawing');
    expect(data.tagged.map(entry => entry.step)).toEqual([1, 2, 3, 4]);
    expect(data.drawing.map(entry => entry.step)).toEqual([3, 4, 1, 2]);
    const { fix, check } = buckets(report);
    expect(fix.map(item => fixCard(item, report).title)).toContain('Add descriptions for images (1)');
    expect(check.map(item => fixCard(item, report).title)).toContain('Text is drawn out of order');
    expect(report.figureAlternatives.items.some(item => item.tagged && !item.alt)).toBe(true);
  });

  it('finds nothing to fix in the exemplar, and lists its attached data and schema.org description', async () => {
    const report = await load('built-to-travel');
    const { fix } = buckets(report);
    expect(fix).toEqual([]);
    expect(report.readingOrder.findings).toEqual([]);
    expect(report.attachments.files.map(file => file.unicodeFilename || file.filename).sort())
      .toEqual(['harbor-observatory-2025-report.jsonld', 'harbor-observatory-2025-station-visibility.csv']);
    expect(report.checks.filter(check => check.status === 'fail')).toEqual([]);
  });
});
