import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
import { analyzePdf, pdfjs } from './engine/analyze.js';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
// The PDF.js display API assumes a window when it creates its own worker.
// An explicit nested worker port keeps analysis entirely off the UI thread.
pdfjs.GlobalWorkerOptions.workerPort = new Worker(workerUrl, { type: 'module' });
self.onmessage = async ({ data: { buffer, fileName } }) => {
  try {
    const assetBase = new URL('../pdfjs/', self.location.href);
    const report = await analyzePdf(buffer, { fileName,
      pdfjsOptions: { useWorkerFetch: true, disableFontFace: true, standardFontDataUrl: new URL('standard_fonts/', assetBase).href,
        cMapUrl: new URL('cmaps/', assetBase).href, cMapPacked: true, wasmUrl: new URL('wasm/', assetBase).href },
      onProgress: progress => self.postMessage({ type: 'progress', progress }) });
    self.postMessage({ type: 'result', report });
  } catch (error) { self.postMessage({ type: 'error', message: error.message }); }
};
