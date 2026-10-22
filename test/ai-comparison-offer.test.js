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
