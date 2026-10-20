import React from 'react';
import { renderToString } from 'react-dom/server';
import { expect, it } from 'vitest';
import { PreviewGate } from '../src/app/PreviewGate.jsx';
import { pinFingerprint, previewAccess, previewScope } from '../src/app/preview-access.js';

const memory = () => { const values = new Map(); return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };
const denied = { getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); }, removeItem() { throw Error('denied'); } };
const DAY = 86400000;

it('does not render or initialize application children before successful PIN entry', () => {
  const storage = memory(), local = memory(), access = previewAccess({ storage, local, scope: 'test' });
  let starts = 0;
  const App = () => { starts++; return React.createElement('main', null, 'Application started'); };
  const render = () => renderToString(React.createElement(PreviewGate, { access }, React.createElement(App)));
  expect(render()).toContain('aria-labelledby="preview-access-title"');
  expect(starts).toBe(0);
  expect(access.unlock('0000')).toBe(false);
  expect(storage.values.size + local.values.size).toBe(0);
  expect(render()).not.toContain('Application started');
  expect(starts).toBe(0);
  expect(access.unlock('5498')).toBe(true);
  expect(render()).toContain('Application started');
  expect(starts).toBe(1);
  const [record] = local.values.values();
  expect(record).not.toContain('5498');
  expect(storage.values.size).toBe(0);
});

it('shares unlock between the app and legacy story in one base path, while isolating other tabs and deployments', () => {
  const scope = previewScope('https://example.org/pdf-signal-check/?scene=8#about-video');
  expect(previewScope('https://example.org/pdf-signal-check/story.html?scene=8')).toBe(scope);
  const local = memory();
  previewAccess({ storage: memory(), local, scope }).unlock('5498');
  // A later visit or another tab has a fresh session store but shares local storage.
  expect(previewAccess({ storage: memory(), local, scope }).isUnlocked()).toBe(true);
  expect(previewAccess({ storage: memory(), local: memory(), scope }).isUnlocked()).toBe(false);
  expect(previewAccess({ storage: memory(), local, scope: previewScope('https://example.org/other/') }).isUnlocked()).toBe(false);
});

it('relocks and removes local unlocks that expired, are future-dated, malformed or made with another PIN', () => {
  let time = 1000 * DAY;
  const local = memory(), now = () => time, scope = 'test';
  previewAccess({ storage: memory(), local, scope, now }).unlock('5498');
  time += 29 * DAY;
  expect(previewAccess({ storage: memory(), local, scope, now }).isUnlocked()).toBe(true);
  time += 2 * DAY;
  expect(previewAccess({ storage: memory(), local, scope, now }).isUnlocked()).toBe(false);
  expect(local.values.size).toBe(0);

  previewAccess({ storage: memory(), local, scope, now }).unlock('5498');
  expect(previewAccess({ storage: memory(), local, scope, now, pin: '1234' }).isUnlocked()).toBe(false);
  expect(local.values.size).toBe(0);

  const key = `mg-preview-access:${scope}`;
  for (const record of [JSON.stringify({ pin: pinFingerprint('5498'), at: time + DAY }), 'unlocked', '{"pin":1}']) {
    local.setItem(key, record);
    expect(previewAccess({ storage: memory(), local, scope, now }).isUnlocked(), record).toBe(false);
    expect(local.values.size).toBe(0);
  }
});

it('falls back to the tab session when local storage is denied, and honours an existing session unlock', () => {
  const storage = memory(), scope = 'test';
  expect(previewAccess({ storage, local: denied, scope }).unlock('5498')).toBe(true);
  expect([...storage.values.values()]).toEqual(['unlocked']);
  expect(previewAccess({ storage, local: denied, scope }).isUnlocked()).toBe(true);
  expect(previewAccess({ storage, local: memory(), scope }).isUnlocked()).toBe(true);
});

it('allows correct PIN entry for the current mount when browser storage is denied', () => {
  const access = previewAccess({ storage: denied, local: denied, scope: 'test' });
  expect(access.isUnlocked()).toBe(false);
  expect(access.unlock('0000')).toBe(false);
  expect(access.unlock('5498')).toBe(true);
  expect(access.isUnlocked()).toBe(false);
});
