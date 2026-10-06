import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const script = readFileSync(new URL('../public/vendor/pdf-a-go-go/1.9.0/viewer.js', import.meta.url), 'utf8');
function harness() {
  const handlers = {}, pending = [];
  const parent = { postMessage: vi.fn() };
  const registry = { destroyInstance: vi.fn(), destroyAll: vi.fn() };
  const root = { replaceChildren: vi.fn(), append: vi.fn(), addEventListener: vi.fn() };
  const api = { registry, initializeContainer: vi.fn((container, options) => new Promise((resolve, reject) => pending.push({ container, options, resolve, reject }))) };
  runInNewContext(script, { pdfagogo: { default: api }, parent, location: { origin: 'http://local.test', href: 'http://local.test/pdf-signal-check/vendor/viewer.html' }, URL,
    document: { getElementById: () => root, createElement: () => ({}) }, addEventListener: (type, callback) => handlers[type] = callback });
  const message = (data, patch = {}) => handlers.message({ source: parent, origin: 'http://local.test', data: { type: 'pdf-signal-viewer', ...data }, ...patch });
  const viewer = () => ({ goToPage: vi.fn(), getPageCount: () => 2 });
  return { api, registry, parent, pending, handlers, message, viewer };
}
describe('local PDF-A-go-go frame bridge', () => {
  it('rejects other windows, other origins and remote PDF URLs', async () => {
    const h = harness();
    await h.message({ action: 'load', url: 'blob:http://local.test/pdf' }, { source: {} });
    await h.message({ action: 'load', url: 'blob:http://local.test/pdf' }, { origin: 'http://other.test' });
    await h.message({ action: 'load', url: 'https://other.test/pdf' });
    expect(h.api.initializeContainer).not.toHaveBeenCalled();
  });
  it('loads the local source once and clamps page navigation', async () => {
    const h = harness();
    const loading = h.message({ action: 'load', url: 'blob:http://local.test/pdf', page: 2 });
    await h.message({ action: 'load', url: 'blob:http://local.test/pdf', page: 2 });
    expect(h.pending).toHaveLength(1);
    expect(h.pending[0].options.workerUrl).toBe('http://local.test/pdf-signal-check/vendor/pdf-a-go-go.worker.js');
    const instance = h.viewer(); h.pending[0].resolve(instance); await loading;
    expect(instance.goToPage).toHaveBeenLastCalledWith(2);
    await h.message({ action: 'page', page: 200 });
    expect(instance.goToPage).toHaveBeenLastCalledWith(2);
    await h.message({ action: 'dispose' });
    expect(h.registry.destroyInstance).toHaveBeenCalledWith(instance);
  });
  it('disposes a late source without unregistering the replacement viewer', async () => {
    const h = harness();
    const first = h.message({ action: 'load', url: 'blob:http://local.test/old' });
    const second = h.message({ action: 'load', url: 'blob:http://local.test/new' });
    expect(h.pending[0].container.id).not.toBe(h.pending[1].container.id);
    const current = h.viewer(); h.pending[1].resolve(current); await second;
    const stale = h.viewer(); h.pending[0].resolve(stale); await first;
    expect(h.registry.destroyInstance).toHaveBeenCalledWith(stale);
    expect(stale.goToPage).not.toHaveBeenCalled();
    expect(h.parent.postMessage.mock.calls.filter(([m]) => m.state === 'loaded').map(([m]) => m.url)).toEqual(['blob:http://local.test/new']);
    h.handlers.pagehide();
    expect(h.registry.destroyAll).toHaveBeenCalled();
  });
  it('cleans a failed initialization and reports no stale error', async () => {
    const h = harness(); const loading = h.message({ action: 'load', url: 'blob:http://local.test/pdf' });
    await h.message({ action: 'dispose' });
    h.pending[0].reject(new Error('canceled')); await loading;
    expect(h.registry.destroyInstance).toHaveBeenCalledWith(h.pending[0].container);
    expect(h.parent.postMessage.mock.calls.some(([m]) => m.state === 'error')).toBe(false);
  });
});
