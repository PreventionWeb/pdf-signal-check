import React from 'react';
import { renderToString } from 'react-dom/server';
import { expect, it } from 'vitest';
import { PreviewGate } from '../src/app/PreviewGate.jsx';
import { previewAccess, previewScope } from '../src/app/preview-access.js';

const memory = () => { const values = new Map(); return { values, getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }; };

it('does not render or initialize application children before successful PIN entry', () => {
  const storage = memory(), access = previewAccess({ storage, scope: 'test' });
  let starts = 0;
  const App = () => { starts++; return React.createElement('main', null, 'Application started'); };
  const render = () => renderToString(React.createElement(PreviewGate, { access }, React.createElement(App)));
  expect(render()).toContain('Preview access required');
  expect(starts).toBe(0);
  expect(access.unlock('0000')).toBe(false);
  expect(storage.values.size).toBe(0);
  expect(render()).not.toContain('Application started');
  expect(starts).toBe(0);
  expect(access.unlock('5498')).toBe(true);
  expect(render()).toContain('Application started');
  expect(starts).toBe(1);
  expect([...storage.values.values()]).toEqual(['unlocked']);
});

it('shares unlock between the app and legacy story in one base path, while isolating other tabs and deployments', () => {
  const scope = previewScope('https://example.org/pdf-signal-check/?scene=8#about-video');
  expect(previewScope('https://example.org/pdf-signal-check/story.html?scene=8')).toBe(scope);
  const storage = memory();
  previewAccess({ storage, scope }).unlock('5498');
  expect(previewAccess({ storage, scope }).isUnlocked()).toBe(true);
  expect(previewAccess({ storage: memory(), scope }).isUnlocked()).toBe(false);
  expect(previewAccess({ storage, scope: previewScope('https://example.org/other/') }).isUnlocked()).toBe(false);
});

it('allows correct PIN entry for the current mount when session storage is denied', () => {
  const denied = { getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); } };
  const access = previewAccess({ storage: denied, scope: 'test' });
  expect(access.isUnlocked()).toBe(false);
  expect(access.unlock('0000')).toBe(false);
  expect(access.unlock('5498')).toBe(true);
  expect(access.isUnlocked()).toBe(false);
});
