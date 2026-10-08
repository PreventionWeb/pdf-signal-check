import { afterEach, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { PDFDocument, PDFName, PDFArray, PDFDict, PDFRef, decodePDFRawStream } from 'pdf-lib';
import { createPdfReport } from '../src/export/report.js';
import { captureSnapshot } from '../src/export/snapshot.js';
import { createReportStructure } from '../src/export/tagged-pdf.js';
import { pdfjs } from '../src/engine/analyze.js';

afterEach(() => vi.unstubAllGlobals());
const snapshot = () => captureSnapshot({ report: {
  file: { name: 'source.pdf', pages: 1 }, appVersion: 'test', schemaVersion: 1,
  profile: 'text-actionability-0.3', analyzedAt: '2026-10-08', accepted: false,
  analysisComplete: true, metadata: { infoTitle: 'Example' }, pages: [], limitations: [],
  checks: [{ id: 'language', status: 'fail', summary: 'Missing language' }],
}, file: null });

it('exports real marked content whose ownership and order survive serialization in both report variants', async () => {
  vi.stubGlobal('FontFace', class { async load() { return this; } });
  vi.stubGlobal('document', { fonts: { add() {}, delete() {} } });
  const fontBytes = new Uint8Array(await readFile(new URL('../public/fonts/NotoSans-Regular.ttf', import.meta.url)));
  const exports = [];
  for (const includeTechnical of [false, true]) {
    const blob = await createPdfReport(snapshot(), { fontBytes, includeTechnical });
    const pdf = await PDFDocument.load(await blob.arrayBuffer());
    expect(pdf.catalog.lookup(PDFName.of('Lang')).decodeText()).toBe('en');
    expect(pdf.catalog.lookup(PDFName.of('MarkInfo')).get(PDFName.of('Marked')).asBoolean()).toBe(true);
    const root = pdf.catalog.lookup(PDFName.of('StructTreeRoot'));
    const doc = pdf.context.lookup(root.lookup(PDFName.of('K'), PDFArray).get(0));
    expect(doc.get(PDFName.of('S')).decodeText()).toBe('Document');
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false });
    const reader = await loadingTask.promise;
    try {
      const structure = await (await reader.getPage(1)).getStructTree();
      const roles = [];
      const walk = node => { if (node.role) roles.push(node.role); for (const child of node.children || []) walk(child); };
      walk(structure);
      expect(roles).toContain('H1');
      expect(roles).toContain('H2');
      expect(roles).toContain('H3');
    } finally { await loadingTask.destroy(); }
    const children = doc.lookup(PDFName.of('K'), PDFArray);
    expect(pdf.context.lookup(children.get(0)).get(PDFName.of('S')).decodeText()).toBe('H1');
    const tree = root.lookup(PDFName.of('ParentTree')).lookup(PDFName.of('Nums'), PDFArray);
    for (const [index, page] of pdf.getPages().entries()) {
      expect(page.node.get(PDFName.of('StructParents')).asNumber()).toBe(index);
      const parents = pdf.context.lookup(tree.get(index * 2 + 1), PDFArray);
      const streams = page.node.lookup(PDFName.of('Contents'), PDFArray).asArray();
      const content = streams.map(ref => new TextDecoder().decode(decodePDFRawStream(pdf.context.lookup(ref)).decode())).join('\n');
      const ids = [...content.matchAll(/\/MCID (\d+)/g)].map(match => Number(match[1]));
      expect(ids).toEqual(Array.from({ length: parents.size() }, (_, i) => i));
      expect(content).toContain('/Artifact BMC');
      for (const id of ids) {
        const owner = parents.get(id);
        expect(owner).toBeInstanceOf(PDFRef);
        const mcrs = pdf.context.lookup(owner).lookup(PDFName.of('K'), PDFArray).asArray();
        expect(mcrs.some(entry => entry instanceof PDFDict && entry.get(PDFName.of('Pg'))?.toString() === page.ref.toString() && entry.get(PDFName.of('MCID'))?.asNumber() === id)).toBe(true);
      }
    }
    exports.push(pdf);
  }
  expect(exports[1].getPageCount()).toBeGreaterThan(exports[0].getPageCount());
  expect(exports[0].getTitle()).toContain('fix list');
  expect(exports[1].getTitle()).toContain('full report');
});

it('retains image alternatives, list hierarchy and Unicode replacement text independently of the drawn glyphs', async () => {
  const pdf = await PDFDocument.create(), page = pdf.addPage(), structure = createReportStructure(pdf);
  const list = structure.element('L'), item = structure.element('LI', { parent: list });
  const body = structure.element('LBody', { parent: item });
  const span = structure.element('Span', { parent: body, actualText: '水質 💧' });
  structure.mark(page, span, () => page.drawRectangle({ x: 10, y: 10, width: 10, height: 10 }));
  const figure = structure.element('Figure', { alt: 'Source chart: South is highest.' });
  structure.mark(page, figure, () => page.drawRectangle({ x: 40, y: 10, width: 10, height: 10 }));
  structure.finish();
  const saved = await PDFDocument.load(await pdf.save());
  expect(saved.context.lookup(span).lookup(PDFName.of('ActualText')).decodeText()).toBe('水質 💧');
  expect(saved.context.lookup(figure).lookup(PDFName.of('Alt')).decodeText()).toBe('Source chart: South is highest.');
  expect(saved.context.lookup(item).get(PDFName.of('P')).toString()).toBe(list.toString());
  expect(saved.context.lookup(body).get(PDFName.of('P')).toString()).toBe(item.toString());
});

// Optional reader-integration check: Poppler is used for local export QA, not a runtime dependency.
it.skipIf(spawnSync('pdftotext', ['-v']).status !== 0)('extracts unsupported-font filenames once from the real raster fallback with Poppler', async () => {
  vi.stubGlobal('FontFace', class { async load() { return this; } });
  // Raster pixels do not determine text extraction; retain a valid PNG while exercising the production fallback.
  const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  vi.stubGlobal('document', { fonts: { add() {}, delete() {} }, createElement: () => ({
    getContext: () => ({ measureText: text => ({ width: Array.from(text).length * 12 }), fillRect() {}, fillText() {} }),
    toDataURL: () => pixel,
  }) });
  const captured = snapshot();
  captured.source.name = captured.report.file.name = '水質💧.pdf';
  const fontBytes = new Uint8Array(await readFile(new URL('../public/fonts/NotoSans-Regular.ttf', import.meta.url)));
  const blob = await createPdfReport(captured, { fontBytes });
  const extracted = execFileSync('pdftotext', ['-', '-'], { input: Buffer.from(await blob.arrayBuffer()), encoding: 'utf8' });
  expect(extracted.match(/水質💧\.pdf/g)).toHaveLength(1);
  expect(extracted).toContain('1 thing to fix');
});
