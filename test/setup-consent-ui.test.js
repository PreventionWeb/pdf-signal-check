import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
vi.mock('../src/help/Help.jsx', () => ({ Help: ({ children }) => children || null }));
import { Setup } from '../src/app/Setup.jsx';
import { CalibrationPanel } from '../src/calibration/CalibrationPanel.jsx';
import { Checks } from '../src/app/Checks.jsx';

it('renders Granite-only consent with visible costs and image opt-in before any action', () => {
  const controller = { getSnapshot: () => ({ checks: [], pendingSetupLabel: 'report.pdf' }), completeSetup: vi.fn(), skipSetupForCurrentIntake: vi.fn() };
  const ref = { current: { start: vi.fn() } };
  const html = renderToStaticMarkup(React.createElement(Setup, { controller, calibrationRef: ref }));
  expect(html).toContain('123.16 MB');
  expect(html).toContain('89.12 MB');
  expect(html).toContain('64.50 MB');
  expect(html).toContain('52 supported languages');
  expect(html).toMatch(/id="setup-image-ai"[^>]*checked=""/);
  expect(html).toContain('Allow downloads');
  expect(html).toContain('Skip AI this time');
  expect(html).not.toMatch(/MiniLM|compact model|type="radio"|Expected · not benchmarked/);
  expect(ref.current.start).not.toHaveBeenCalled();
  expect(controller.completeSetup).not.toHaveBeenCalled();
});

it('does not invent a speed rating when no device receipt exists', () => {
  const html = renderToStaticMarkup(React.createElement(CalibrationPanel, { modelId: 'granite-r2', showStartAction: false }));
  expect(html).toContain('Test speed on your device');
  expect(html).not.toContain('Your device:');
  expect(html).not.toContain('Measured benchmark times');
});

it('discloses experimental number scope before download permission without starting work', () => {
  const controller = { getSnapshot: () => ({ checks: [], pendingSetupLabel: 'report.pdf' }), completeSetup: vi.fn() };
  const ref = { current: { start: vi.fn() } };
  const html = renderToStaticMarkup(React.createElement(Setup, { controller, calibrationRef: ref }));
  for (const warning of [
    'Number comparisons are experimental evidence only',
    'AI cannot check whether those numbers are true',
    'only in Technical details and the full report',
    'do not add things to fix or check, change headline counts or affect scores',
  ]) {
    expect(html).toContain(warning);
    expect(html.indexOf(warning)).toBeLessThan(html.indexOf('Allow downloads'));
  }
  expect(ref.current.start).not.toHaveBeenCalled();
  expect(controller.completeSetup).not.toHaveBeenCalled();
});

it('retains real AI retry controls without suggesting a compact model', () => {
  const html = renderToStaticMarkup(React.createElement(Checks, { state: {
    report: { analysisComplete: true, metadata: { language: 'en', subject: 'Flood preparation' }, pages: [{ number: 1, blocks: [{ text: 'Flood preparation helps local responders protect communities with timely warnings and planning.' }] }] },
    checks: ['subject'], selectedModel: 'granite-r2', aiEnabled: true,
    screeningAttempt: { status: 'error', message: 'Worker failed', code: 'WORKER_ERROR' },
  }, controller: {}, showSettings: false }));
  expect(html).toContain('Try AI checks again');
  expect(html).toContain('another device');
  expect(html).not.toContain('compact model');
});
