import { expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { analyzePdf } from '../src/engine/analyze.js';
import { assessSemantic } from '../src/engine/semantic.js';
import { buildScreeningRequest } from '../src/runtime/screening-request.js';
import { needsDocumentInformation } from '../src/runtime/screening-recovery.js';

it('the fourth public sample requires document information and cannot provide AI comparison inputs', async () => {
  const report = await analyzePdf(new Uint8Array(await readFile(new URL('../public/samples/missing-document-information.pdf', import.meta.url))), {
    pdfjsOptions: { standardFontDataUrl: new URL('../node_modules/pdfjs-dist/standard_fonts/', import.meta.url).pathname },
  });
  expect(report.analysisComplete).toBe(true);
  expect(report.metadata.language).toBe('en-GB');
  expect(needsDocumentInformation(report)).toBe(true);
  const embed = vi.fn();
  const semantic = await assessSemantic(buildScreeningRequest(report, { modelId: 'minilm', checks: ['title', 'subject', 'keywords', 'sections'], requireInference: true }), embed);
  expect(semantic.notRun.code).toBe('no-comparable-inputs');
  expect(embed).not.toHaveBeenCalled();
  expect(report.accepted).toBe(false);
});

it('does not hide an incomplete analysis or a PDF with usable document information', () => {
  const report = { analysisComplete: true, metadata: {} };
  expect(needsDocumentInformation(report)).toBe(true);
  expect(needsDocumentInformation({ ...report, analysisComplete: false })).toBe(false);
  for (const metadata of [{ infoTitle: 'Annual report' }, { xmpTitles: [{ lang: 'x-default', text: 'Annual report' }] }, { subject: 'Water quality' }, { keywords: 'water quality' }]) {
    expect(needsDocumentInformation({ ...report, metadata })).toBe(false);
  }
});
