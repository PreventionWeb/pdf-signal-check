import { afterEach, expect, it, vi } from 'vitest';
import { createAssetFetch } from '../src/runtime/asset-fetch.js';
afterEach(() => vi.useRealTimers());

it('aborts a request that never returns headers instead of waiting for the browser network reset', async () => {
  vi.useFakeTimers();
  let signal;
  const fetcher = createAssetFetch((_url, options) => { signal = options.signal; return new Promise(() => {}); }, { idleMs: 100 });
  const result = expect(fetcher('https://example.test/model')).rejects.toMatchObject({ code: 'MODEL_ASSET_TIMEOUT' });
  await vi.advanceTimersByTimeAsync(100);
  await result;
  expect(signal.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});

it('times out a stalled body but lets a continuously progressing download finish', async () => {
  vi.useFakeTimers();
  let stream;
  const fetcher = createAssetFetch(async () => new Response(new ReadableStream({ start(controller) { stream = controller; } })), { idleMs: 100 });
  const response = await fetcher('https://example.test/model');
  const reading = expect(response.arrayBuffer()).rejects.toMatchObject({ code: 'MODEL_ASSET_TIMEOUT' });
  await vi.advanceTimersByTimeAsync(100); await reading;
  const next = await fetcher('https://example.test/model');
  const complete = next.text();
  stream.enqueue(new TextEncoder().encode('one'));
  await vi.advanceTimersByTimeAsync(70);
  stream.enqueue(new TextEncoder().encode('two'));
  await vi.advanceTimersByTimeAsync(70);
  stream.close();
  expect(await complete).toBe('onetwo');
  expect(vi.getTimerCount()).toBe(0);
});

it('reports immediate network errors and releases timers on unsuccessful optional-file responses', async () => {
  const fetcher = createAssetFetch(async () => { throw new TypeError('Failed to fetch'); });
  await expect(fetcher('https://example.test/model')).rejects.toMatchObject({ code: 'MODEL_ASSET_NETWORK_ERROR' });
  vi.useFakeTimers();
  const optional = createAssetFetch(async () => new Response('Not found', { status: 404 }));
  expect((await optional('https://example.test/optional')).status).toBe(404);
  expect(vi.getTimerCount()).toBe(0);
});
