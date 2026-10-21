import { IMAGE_MODEL, judgeImage } from './engine/image-model.js';
import { createAssetFetch } from './runtime/asset-fetch.js';

/** One image encoder per worker; the controller terminates the worker to cancel. Crops arrive as PNG blobs. */
let runtime = null, processor = null, vision = null;
async function ensure(post) {
  if (vision) return;
  post({ type: 'progress', message: `Preparing ${IMAGE_MODEL.label}.`, progress: { stage: 'model-init', state: 'started', completed: null, total: null, unit: null } });
  try {
    runtime = await import('@huggingface/transformers');
    runtime.env.allowLocalModels = false;
    if (runtime.env.fetch) runtime.env.fetch = createAssetFetch(runtime.env.fetch);
    const options = { revision: IMAGE_MODEL.revision };
    processor = await runtime.AutoProcessor.from_pretrained(IMAGE_MODEL.id, options);
    vision = await runtime.CLIPVisionModelWithProjection.from_pretrained(IMAGE_MODEL.id, { ...options, dtype: IMAGE_MODEL.dtype, device: IMAGE_MODEL.device,
      progress_callback: p => { if (p.status === 'progress') post({ type: 'progress', message: `Loading ${p.file}.`, progress: { stage: 'asset-download', state: 'progress', asset: p.file,
        completed: Number.isFinite(p.loaded) ? p.loaded : null, total: Number.isFinite(p.total) ? p.total : null, unit: 'bytes', scope: 'current asset only' } }); } });
  } catch (error) { const failure = error instanceof Error ? error : new Error(String(error)); failure.stage = 'model-init'; failure.code ||= 'MODEL_INIT_FAILED'; throw failure; }
}
self.onmessage = async ({ data }) => {
  const post = message => self.postMessage({ ...message, requestId: data.requestId });
  try {
    await ensure(post);
    const results = [];
    for (const [done, item] of data.items.entries()) {
      const image = await runtime.RawImage.fromBlob(item.blob);
      const output = await vision(await processor(image));
      const raw = output.image_embeds.tolist()[0], norm = Math.hypot(...raw);
      if (!raw.length || !Number.isFinite(norm) || !norm) throw new Error('The image model returned an invalid result.');
      results.push({ index: item.index, page: item.page, ...judgeImage(raw.map(value => value / norm)) });
      post({ type: 'progress', message: `Looked at ${done + 1} of ${data.items.length} graphics.`, progress: { stage: 'inference', state: done + 1 === data.items.length ? 'completed' : 'progress', completed: done + 1, total: data.items.length, unit: 'graphics' } });
    }
    post({ type: 'result', imageScreening: { model: IMAGE_MODEL, inferencePerformed: results.length > 0, items: results, assessedAt: new Date().toISOString() } });
  } catch (error) {
    post({ type: 'error', message: error.message, stage: error.stage || null, code: error.code || null });
  }
};
