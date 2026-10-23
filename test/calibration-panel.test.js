import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { WORKLOAD } from '../src/calibration/workload.js';

const fixture = vi.hoisted(() => ({ state: null }));
vi.mock('../src/calibration/controller.js', () => ({ CalibrationController: class {
  subscribe = () => () => {};
  getSnapshot = () => fixture.state;
} }));
import { CalibrationPanel } from '../src/calibration/CalibrationPanel.jsx';

function renderReceipt(change = {}) {
  fixture.state = { busy: false, saved: false, receipt: {
    workloadId: WORKLOAD.id, model: { label: 'Actual measured model' },
    fixture: { pages: 2, parseMs: 240 }, load: { loadAndInitMs: 15880, state: 'ready', assetSource: 'unknown' },
    warm: { medianMs: 2420, minimumMs: 2100, maximumMs: 2700 },
    workload: { tokenCap: 512 }, conditions: {}, ...change,
  } };
  return renderToStaticMarkup(React.createElement(CalibrationPanel, { showStartAction: false }));
}

it('leads with comparison speed and durations, while exact evidence stays in closed details', () => {
  const html = renderReceipt();
  const [primary, details] = html.split('<details');
  expect(primary).toContain('Sample text speed: OK');
  for (const text of ['Took less than 1 second', 'Took about 16 seconds', 'About 2 seconds per sample run', 'Actual measured model']) expect(primary).toContain(text);
  expect(primary).not.toMatch(/benchmark-timing-(track|fill)|up to 30 seconds|median per sample run/);
  expect(details).not.toMatch(/^[^>]*\bopen[=>\s]/);
  for (const text of ['2.42 seconds (2420 ms)', 'median per sample run', 'Our responsiveness guide', 'Download device timing receipt', 'four fixed text inputs per run', '512-token cap']) expect(details).toContain(text);
});

it('rates raw comparisons independently from slow startup and avoids hiding a threshold crossing', () => {
  expect(renderReceipt({ load: { loadAndInitMs: 90000 }, warm: { medianMs: 1500 } })).toContain('Sample text speed: Fast');
  const html = renderReceipt({ warm: { medianMs: 5001 } });
  expect(html).toContain('Sample text speed: Slow');
  expect(html).toContain('Just over 5 seconds per sample run');
  expect(html).toContain('5.001 seconds (5001 ms)');
});

it('retains unrated conditions and safely represents missing measurements', () => {
  for (const conditions of [{ startedHidden: true }, { visibilityChanges: 1 }, { possibleSleepOrSchedulingGap: true }]) {
    const html = renderReceipt({ conditions });
    expect(html).toContain('Sample text speed: Check again');
    expect(html).toContain('Timing conditions changed');
  }
  for (const warm of [undefined, {}, { medianMs: NaN }, { medianMs: -1 }]) {
    const html = renderReceipt({ fixture: undefined, load: undefined, warm });
    expect(html).toContain('Sample text speed: Check again');
    expect(html).toContain('Not measured');
    expect(html).not.toMatch(/NaN|undefined|Infinity/);
  }
});
