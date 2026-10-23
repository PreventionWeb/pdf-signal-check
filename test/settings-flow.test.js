import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { it, expect, vi } from 'vitest';
import { createAppController } from '../src/app/controller.js';
import { Settings } from '../src/app/Settings.jsx';
import { buildLabel } from '../src/build-info.js';

it('keeps settings separate from intake consent without starting work', () => {
  const workerFactory = vi.fn(), fetcher = vi.fn();
  const app = createAppController({ preferences: { load: () => null }, workerFactory, fetcher });
  app.openSettings('document');
  expect(app.getSnapshot()).toMatchObject({ stage: 'setup', setupMode: 'settings', pendingSetupLabel: null });
  app.cancelSetup();
  app.selectFiles([{ name: 'held.pdf', arrayBuffer: vi.fn() }]);
  expect(app.getSnapshot()).toMatchObject({ stage: 'setup', setupMode: 'intake', pendingSetupLabel: 'held.pdf' });
  expect(workerFactory).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});

it('opens explicit consent from settings and resets saved permissions without downloads', () => {
  const preferences = { load: () => ({ modelId: 'granite-r2', imageAI: true }), clear: vi.fn(() => true) };
  const devicePreferences = { clear: vi.fn(() => true) }, workerFactory = vi.fn();
  const app = createAppController({ preferences, devicePreferences, workerFactory });
  app.openSettings('review');
  app.openSetup(app.getSnapshot().setupDestination);
  expect(app.getSnapshot()).toMatchObject({ setupMode: 'intake', setupDestination: 'review' });
  app.cancelSetup();
  app.openSettings('review');
  expect(app.resetSetup()).toBe(true);
  expect(preferences.clear).toHaveBeenCalledOnce();
  expect(devicePreferences.clear).toHaveBeenCalledOnce();
  expect(app.getSnapshot()).toMatchObject({ setupMode: 'settings', setupComplete: false, aiEnabled: false });
  app.cancelSetup();
  expect(app.getSnapshot().stage).toBe('review');
  expect(workerFactory).not.toHaveBeenCalled();
});

it('renders settings without starting calibration or resetting permissions', () => {
  const controller = { calibrationBusy: vi.fn(), resetSetup: vi.fn(), openSetup: vi.fn() };
  const html = renderToStaticMarkup(React.createElement(Settings, { controller, state: { setupComplete: true, imageAI: true }, calibrationRef: { current: null } }));
  expect(controller.calibrationBusy).not.toHaveBeenCalled();
  expect(controller.resetSetup).not.toHaveBeenCalled();
});

it('formats the captured build timestamp explicitly in UTC', () => {
  expect(buildLabel('2026-10-23T12:13:00.000Z')).toBe('Build: 23 Oct 2026, 12:13 UTC');
  expect(buildLabel(null)).toBe('Local development');
});

it('applies one-time consent without saving or silently reusing it for another PDF', () => {
  const preferences = { load: () => null, save: vi.fn(() => true), clear: vi.fn(() => true) };
  const workerFactory = vi.fn();
  const app = createAppController({ preferences, workerFactory });
  app.completeSetup('granite-r2', { imageAI: true, remember: false });
  expect(app.getSnapshot()).toMatchObject({ setupComplete: true, reuseSettings: false, settingsSaved: false, aiEnabled: true });
  expect(preferences.save).not.toHaveBeenCalled();
  expect(preferences.clear).toHaveBeenCalledOnce();
  app.setChecks(['title']);
  expect(preferences.save).not.toHaveBeenCalled();
  const file = { name: 'next.pdf', arrayBuffer: vi.fn() };
  app.selectFiles([file]);
  expect(app.getSnapshot()).toMatchObject({ stage: 'setup', pendingSetupLabel: 'next.pdf' });
  expect(file.arrayBuffer).not.toHaveBeenCalled();
  expect(workerFactory).not.toHaveBeenCalled();
});

it('removes AI permission from settings without discarding benchmarks or report evidence', () => {
  const preferences = { load: () => ({ modelId: 'granite-r2', imageAI: true }), clear: vi.fn(() => true) };
  const devicePreferences = { clear: vi.fn() }, workerFactory = vi.fn(), fetcher = vi.fn();
  const app = createAppController({ preferences, devicePreferences, workerFactory, fetcher });
  const report = { analysisComplete: true, checks: [], pages: [], metadata: {} };
  app.openCompletedReport(report, { name: 'review.pdf' }, 'batch-source');
  const original = app.getSnapshot().report;
  app.openSettings('review');
  app.openSetup('review');
  expect(app.removeAIPermission()).toBe(true);
  expect(app.getSnapshot()).toMatchObject({ stage: 'setup', setupMode: 'settings', setupDestination: 'review', aiEnabled: false, imageAI: false, setupComplete: false, reuseSettings: false, settingsSaved: false });
  expect(app.getSnapshot().report).toBe(original);
  expect(preferences.clear).toHaveBeenCalledOnce();
  expect(devicePreferences.clear).not.toHaveBeenCalled();
  expect(workerFactory).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
  app.cancelSetup();
  expect(app.getSnapshot().stage).toBe('review');
  app.selectFiles([{ name: 'next.pdf', arrayBuffer: vi.fn() }]);
  expect(app.getSnapshot().pendingSetupLabel).toBe('next.pdf');
  expect(app.removeAIPermission()).toBe(false);
  expect(preferences.clear).toHaveBeenCalledOnce();
  app.dispose();
});

it('reports failed storage accurately for saving and removing AI permission', () => {
  const preferences = { load: () => null, save: () => false, clear: () => false };
  const app = createAppController({ preferences });
  app.completeSetup('granite-r2', { remember: true });
  const html = renderToStaticMarkup(React.createElement(Settings, { controller: app, state: app.getSnapshot(), calibrationRef: { current: null } }));
  expect(html).not.toContain('Settings saved');
  expect(html).toContain('This session only');
  expect(html).toContain('each PDF in this session');
  app.openSettings();
  app.openSetup('document');
  expect(app.removeAIPermission()).toBe(true);
  expect(app.getSnapshot().message).toContain('saved permission may return after reload');
  expect(app.getSnapshot()).toMatchObject({ aiEnabled: false, settingsSaved: false, reuseSettings: false });
  app.dispose();
});
