/** Model assets only. Abort requests after 30 seconds without receiving data. */
export function createAssetFetch(fetcher, { idleMs = 30_000 } = {}) {
  return async (input, options = {}) => {
    const abort = new AbortController();
    const failure = Object.assign(new Error('The model download stopped responding. Check your connection and try again.'), { stage: 'model-init', code: 'MODEL_ASSET_TIMEOUT' });
    let timer, reader;
    const clear = () => clearTimeout(timer);
    const reset = () => { clear(); timer = setTimeout(() => { abort.abort(failure); reader?.cancel(failure).catch(() => {}); }, idleMs); };
    const externalAbort = () => abort.abort(options.signal.reason);
    options.signal?.addEventListener('abort', externalAbort, { once: true });
    const cleanup = () => { clear(); options.signal?.removeEventListener('abort', externalAbort); };
    const errorFor = error => abort.signal.reason === failure ? failure : Object.assign(error instanceof Error ? error : new Error(String(error)), { stage: 'model-init', code: 'MODEL_ASSET_NETWORK_ERROR' });
    const wait = promise => new Promise((resolve, reject) => {
      const stopped = () => reject(abort.signal.reason);
      if (abort.signal.aborted) { reject(abort.signal.reason); return; }
      abort.signal.addEventListener('abort', stopped, { once: true });
      promise.then(resolve, reject).finally(() => abort.signal.removeEventListener('abort', stopped));
    });
    try {
      if (options.signal?.aborted) externalAbort();
      reset();
      const response = await wait(fetcher(input, { ...options, signal: abort.signal }));
      if (!response.ok || !response.body) { cleanup(); return response; }
      reader = response.body.getReader();
      reset();
      const body = new ReadableStream({
        async pull(controller) {
          try {
            const chunk = await wait(reader.read());
            if (chunk.done) { cleanup(); controller.close(); }
            else { if (chunk.value.byteLength) reset(); controller.enqueue(chunk.value); }
          } catch (error) { cleanup(); controller.error(errorFor(error)); }
        },
        async cancel(reason) { cleanup(); abort.abort(reason); await reader.cancel(reason); },
      });
      return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
    } catch (error) { cleanup(); throw errorFor(error); }
  };
}
