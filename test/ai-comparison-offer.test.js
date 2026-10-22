import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { it, expect, vi } from 'vitest';
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
