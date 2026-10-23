import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { it, expect, vi } from 'vitest';
import { screeningAvailability } from '../src/runtime/screening-availability.js';
import { AIComparisonOffer } from '../src/app/AIComparisonOffer.jsx';

const report = () => ({ analysisComplete: true, metadata: { subject: 'Flood preparedness' }, metadataConsistency: { candidates: [] }, pages: [{ number: 1, logicalBlocks: [], blocks: [{ id: 0, text: 'Flood preparedness includes monitoring water levels, preparing local responders and protecting communities against disasters.' }] }] });
const waiting = () => ({ report: report(), aiEnabled: true, setupComplete: true, selectedModel: 'granite-r2', checks: ['subject'], languageAssumption: null });
const actions = () => ({ promptLanguageDecision: vi.fn(), requestAIComparisons: vi.fn(), openSetup: vi.fn(), setLanguageAssumption: vi.fn(), runScreening: vi.fn() });
const render = (state, controller = actions()) => renderToStaticMarkup(React.createElement(AIComparisonOffer, { state, controller }));

it('recovers a dismissed missing-language decision without assuming English or starting AI', () => {
  const state = waiting(), saved = structuredClone(state), controller = actions();
  expect(screeningAvailability(state.report, { modelId: state.selectedModel, checks: state.checks })).toMatchObject({ textAvailable: true, missingLanguage: true });
  const html = render(state, controller);
  expect(html).toContain('This PDF has no saved language');
  expect(html).toContain('confirm whether it is in English');
  expect(html).toContain('Confirm PDF language');
  expect(html.match(/<button/g)).toHaveLength(1);
  expect(html).not.toMatch(/Optional:|Run local AI|Choose AI|download|<details|<select/i);
  for (const action of Object.values(controller)) expect(action).not.toHaveBeenCalled();

  const element = AIComparisonOffer({ state, controller });
  const button = React.Children.toArray(element.props.children).find(child => child.props.onClick);
  button.props.onClick();
  expect(controller.promptLanguageDecision).toHaveBeenCalledExactlyOnceWith();
  for (const name of ['requestAIComparisons', 'openSetup', 'setLanguageAssumption', 'runScreening']) expect(controller[name]).not.toHaveBeenCalled();
  expect(state).toEqual(saved);
});

it.each([
  ['AI skipped for intake', { aiEnabled: false }],
  ['setup incomplete', { setupComplete: false }],
  ['standard-only source despite saved consent', { selectedModel: null }],
  ['historical model permission', { selectedModel: 'minilm' }],
  ['retained batch report', { batchId: 'retained-1' }],
  ['language decision already open', { awaitingLanguageDecision: true }],
  ['analysis running', { analysisBusy: true }],
  ['model running', { modelBusy: true }],
  ['calibration running', { calibrationBusy: true }],
  ['batch running', { batchBusy: true }],
  ['prior completed attempt', { screeningAttempt: { status: 'completed' } }],
  ['prior failed attempt', { screeningAttempt: { status: 'error' } }],
  ['prior canceled attempt', { screeningAttempt: { status: 'canceled' } }],
  ['prior no-work attempt', { screeningAttempt: { status: 'not-run' } }],
  ['explicit English assumption', { languageAssumption: 'en' }],
  ['no report', { report: null }],
])('suppresses recovery for %s', (_name, patch) => {
  const controller = actions();
  expect(render({ ...waiting(), ...patch }, controller)).toBe('');
  for (const action of Object.values(controller)) expect(action).not.toHaveBeenCalled();
});

it('suppresses recovery for declared languages, incomplete analysis and historical inference', () => {
  const source = report();
  for (const modified of [
    { ...source, metadata: { ...source.metadata, language: 'en' } },
    { ...source, metadata: { ...source.metadata, language: 'zz' } },
    { ...source, analysisComplete: false },
    { ...source, semantic: { inferencePerformed: true } },
    { ...source, imageScreening: { inferencePerformed: true } },
  ]) {
    const saved = structuredClone(modified);
    expect(render({ ...waiting(), report: modified })).toBe('');
    expect(modified).toEqual(saved);
  }
});

it('suppresses the generic offer when no text work exists, including image-only sources', () => {
  const source = { ...report(), metadata: {} };
  const images = { ...source, decorative: { items: [{ kind: 'unclear', page: 1, share: 0.3, letters: 0, quad: [[0,0],[20,0],[20,20],[0,20]] }] } };
  expect(screeningAvailability(source, { modelId: 'granite-r2', checks: ['subject'] }).textAvailable).toBe(false);
  expect(screeningAvailability(images, { modelId: 'granite-r2', checks: ['subject'] })).toMatchObject({ textAvailable: false, imagesAvailable: true });
  for (const modified of [source, images]) for (const imageAI of [true, false]) {
    expect(render({ ...waiting(), report: modified, imageAI })).toBe('');
  }
});

it('keeps experimental numerical availability separate from the language recovery action', () => {
  const source = { analysisComplete: true, metadata: {}, metadataConsistency: { candidates: [] }, pages: [
    { number: 1, logicalBlocks: [], blocks: [{ id: 1, text: 'The regional flood programme reached 1200 households in Kenya.' }] },
    { number: 2, logicalBlocks: [], blocks: [{ id: 2, text: 'In Kenya, 1800 households were reached by the flood programme.' }] },
  ] };
  const saved = structuredClone(source);
  const available = screeningAvailability(source, { modelId: 'granite-r2', checks: ['title'] });
  expect(available.experimentalNumericalSentences).toBe(2);
  expect(available.text).toEqual([{ label: 'statements with numbers (experimental)', count: 2 }]);
  expect(available).toMatchObject({ textAvailable: true, missingLanguage: true });
  expect(render({ ...waiting(), report: source, checks: ['title'] })).toContain('Confirm PDF language');
  expect(render({ ...waiting(), report: { ...source, metadata: { language: 'en' } }, checks: ['title'] })).toBe('');
  expect(source).toEqual(saved);
  expect(screeningAvailability({ analysisComplete: false }).experimentalNumericalSentences).toBe(0);
});
