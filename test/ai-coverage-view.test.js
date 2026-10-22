import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { it, expect } from 'vitest';
import { Checks } from '../src/app/Checks.jsx';
import { checkedWith } from '../src/review/provenance.js';
it('missing saved metadata does not hide completed consistency coverage or controls', () => {
  const html = renderToStaticMarkup(React.createElement(Checks, { state: {
    report: { analysisComplete: true, metadata: { language: 'en' }, semantic: { model: { id: 'm' }, inferencePerformed: true,
      requestedChecks: ['title'], figureCoverage: { candidates: 3, evaluated: 2, skipped: 1 }, figureItems: [{}, {}] } },
    selectedModel: 'minilm', aiEnabled: true, checks: ['title'],
  }, controller: {}, coverage: [] }));
  expect(html).toContain('Some saved document details are missing');
  expect(html).toContain('aria-label="AI coverage"');
  expect(html).toContain('2 of 3 eligible image descriptions');
});
it('reports actual image execution separately from usable judgments, without changing old receipts', () => {
  expect(checkedWith({ imageScreening: { inferencePerformed: true, judgmentsPerformed: false } })).toContain('ran, but produced no usable image judgments');
  expect(checkedWith({ imageScreening: { inferencePerformed: true } })).not.toContain('no usable');
});
