import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { it, expect, vi } from 'vitest';
import { screeningAvailability } from '../src/runtime/screening-availability.js';
import { AIComparisonOffer } from '../src/app/AIComparisonOffer.jsx';
const report = () => ({ analysisComplete: true, metadata: { language: 'en', subject: 'Flood preparedness' }, metadataConsistency: { candidates: [] }, pages: [{ number: 1, logicalBlocks: [], blocks: [{ id: 0, text: 'Flood preparedness includes monitoring water levels, preparing local responders and protecting communities against disasters.' }] }] });
it('offers recovered work without invoking a controller, and states why an empty PDF has no download action', () => {
  const controller = { requestAIComparisons: vi.fn(), openSetup: vi.fn() };
  const render = source => renderToStaticMarkup(React.createElement(AIComparisonOffer, { state: { report: source, checks: ['subject'], selectedModel: 'minilm' }, controller }));
  expect(render(report())).toContain('Choose AI comparisons');
  const empty = render({ ...report(), metadata: { language: 'en' } });
  expect(empty).toContain('No AI download is needed');
  expect(empty).not.toContain('<button');
  expect(controller.requestAIComparisons).not.toHaveBeenCalled();
  expect(controller.openSetup).not.toHaveBeenCalled();
});
it('requests configuration rather than claiming runnable work when only images are eligible and image consent is off', () => {
  const source = { ...report(), metadata: { language: 'en' }, decorative: { items: [{ kind: 'unclear', page: 1, share: 0.3, letters: 0, quad: [[0,0],[20,0],[20,20],[0,20]] }] } };
  const html = renderToStaticMarkup(React.createElement(AIComparisonOffer, { state: { report: source, aiEnabled: true, imageAI: false, selectedModel: 'minilm', checks: ['subject'] }, controller: {} }));
  expect(html).toContain('separate image-model consent');
  expect(html).toContain('Choose AI comparisons');
  expect(html).not.toContain('Run local AI comparisons');
});

it('discloses numerical-only work as experimental technical evidence before consent or running', () => {
  const source = { analysisComplete: true, metadata: { language: 'en' }, metadataConsistency: { candidates: [] }, pages: [
    { number: 1, logicalBlocks: [], blocks: [{ id: 1, text: 'The regional flood programme reached 1200 households in Kenya.' }] },
    { number: 2, logicalBlocks: [], blocks: [{ id: 2, text: 'In Kenya, 1800 households were reached by the flood programme.' }] },
  ] };
  const saved = structuredClone(source), controller = { requestAIComparisons: vi.fn(), openSetup: vi.fn() };
  const available = screeningAvailability(source, { modelId: 'minilm', checks: ['title'] });
  expect(available.experimentalNumericalSentences).toBe(2);
  expect(available.text).toEqual([{ label: 'statements with numbers (experimental)', count: 2 }]);
  expect(available.textAvailable).toBe(true);
  for (const aiEnabled of [false, true]) {
    const html = renderToStaticMarkup(React.createElement(AIComparisonOffer, { state: { report: source, checks: ['title'], selectedModel: 'minilm', aiEnabled }, controller }));
    expect(html).toContain('Number comparisons are experimental');
    expect(html).toContain('only in Technical details and the full report');
    expect(html).toContain('does not add things to fix or check');
    expect(html.indexOf('Number comparisons are experimental')).toBeLessThan(html.indexOf('<button'));
    expect(html).toContain(aiEnabled ? 'Run local AI comparisons' : 'Choose AI comparisons');
  }
  expect(source).toEqual(saved);
  expect(controller.requestAIComparisons).not.toHaveBeenCalled();
  expect(controller.openSetup).not.toHaveBeenCalled();
  expect(screeningAvailability({ analysisComplete: false }).experimentalNumericalSentences).toBe(0);
});
