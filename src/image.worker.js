import { inspectCropPixels } from './runtime/image-pixels.js';
import { IMAGE_MODEL } from './engine/image-model.js';
import { createAssetFetch } from './runtime/asset-fetch.js';
import { screenImages, prepareImageDescriptions } from './runtime/image-screening.js';

/** One image encoder per worker; the controller terminates the worker to cancel. Crops arrive as PNG blobs. */
let runtime = null, processor = null, vision = null, tokenizer = null, text = null;
const unit = vector => { const norm = Math.hypot(...vector); if (!vector.length || !Number.isFinite(norm) || !norm) throw new Error('The image model returned an invalid result.'); return vector.map(value => value / norm); };
/** The text half is loaded only when there are descriptions to compare with their pictures. */
async function ensureText(post) {
  if (text) return;
  post({ type: 'progress', message: 'Preparing to compare descriptions with images.', progress: { substage: 'descriptions', stage: 'model-init', state: 'started', completed: null, total: null, unit: null } });
  try {
    tokenizer = await runtime.AutoTokenizer.from_pretrained(IMAGE_MODEL.id, { revision: IMAGE_MODEL.revision });
    text = await runtime.CLIPTextModelWithProjection.from_pretrained(IMAGE_MODEL.id, { revision: IMAGE_MODEL.revision, dtype: IMAGE_MODEL.dtype, device: IMAGE_MODEL.device,
      progress_callback: p => { if (p.status === 'progress') post({ type: 'progress', message: `Loading ${p.file}.`, progress: { substage: 'descriptions', stage: 'asset-download', state: 'progress', asset: p.file,
        completed: Number.isFinite(p.loaded) ? p.loaded : null, total: Number.isFinite(p.total) ? p.total : null, unit: 'bytes', scope: 'current asset only' } }); } });
  } catch (error) { const failure = error instanceof Error ? error : new Error(String(error)); failure.stage = 'model-init'; failure.code ||= 'MODEL_INIT_FAILED'; throw failure; }
}
const embedImage = async blob => unit((await vision(await processor(await runtime.RawImage.fromBlob(blob)))).image_embeds.tolist()[0]);
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
    const imageScreening = await screenImages(data, {
      inspectPixels: inspectCropPixels,
      encodeImage: async blob => { await ensure(post); return embedImage(blob); },
      encodeDescriptions: async descriptions => {
        await ensureText(post);
        const { tokens, inputs } = prepareImageDescriptions(descriptions, tokenizer);
        return { inputs, vectors: (await text(tokens)).text_embeds.tolist().map(unit) };
      },
      progress: (done, total) => post({ type: 'progress', message: `Looked at ${done} of ${total} images.`, progress: { stage: 'inference', state: done === total ? 'completed' : 'progress', completed: done, total, unit: 'images' } }),
    });
    post({ type: 'result', imageScreening });
  } catch (error) {
    post({ type: 'error', message: error.message, stage: error.stage || null, code: error.code || null });
  }
};
