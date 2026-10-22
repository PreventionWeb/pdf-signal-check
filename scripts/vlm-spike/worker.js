import { AutoProcessor, AutoModelForVision2Seq, RawImage, env } from '@huggingface/transformers';
import { createAssetFetch } from '../../src/runtime/asset-fetch.js';
import { MODEL, CASES, scoreCase } from './cases.js';

// Large readable text, no PDF content and no external image requests.
async function fixture(kind) {
  const canvas = new OffscreenCanvas(998, 400), ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 998, 400);
  ctx.font = '28px sans-serif'; ctx.fillStyle = '#1f3347';
  if (kind === 'panel') {
    ctx.fillStyle = '#066e74'; ctx.fillRect(100, 100, 798, 200);
  } else {
    const values = kind === 'permuted' ? [3.4, 2.8, 3.1] : [2.8, 3.1, 3.4];
    ['North', 'Central', 'South'].forEach((label, i) => {
      if (kind === 'table') {
        ctx.fillStyle = '#1f3347'; ctx.fillText(label, 150, 110 + i * 100); ctx.fillText(`${values[i]} m`, 600, 110 + i * 100);
        ctx.fillRect(120, 130 + i * 100, 700, 2);
      } else {
        const x = 100 + i * 280, h = values[i] * 65;
        ctx.fillStyle = '#066e74'; ctx.fillRect(x, 310 - h, 150, h);
        ctx.fillStyle = '#1f3347'; ctx.fillText(`${values[i]} m`, x + 20, 290 - h); ctx.fillText(label, x + 15, 355);
      }
    });
  }
  return RawImage.fromBlob(await canvas.convertToBlob({ type: 'image/png' }));
}

self.onmessage = async ({ data: { device, tiled = false } }) => {
  let model;
  try {
    if (!['wasm', 'webgpu'].includes(device)) throw new Error('Select wasm or webgpu explicitly.');
    env.allowLocalModels = false;
    env.fetch = createAssetFetch(env.fetch);
    const start = performance.now();
    const processor = await AutoProcessor.from_pretrained(MODEL.id, { revision: MODEL.revision });
    if (!tiled) {
      processor.image_processor.size = { longest_edge: 512 };
      processor.image_processor.do_image_splitting = false;
    }
    model = await AutoModelForVision2Seq.from_pretrained(MODEL.id, { revision: MODEL.revision, dtype: MODEL.dtype, device,
      progress_callback: event => { if (['initiate', 'done'].includes(event.status)) self.postMessage({ type: 'progress', event }); } });
    self.postMessage({ loadMs: performance.now() - start, model: MODEL, device,
      imagePolicy: tiled ? 'pinned processor defaults: 2048 longest edge, split into 512 tiles' : '512 longest edge, no splitting; processor resizes to one 512-square image' });
    for (const test of CASES) {
      const image = await fixture(test.image), started = performance.now();
      const prompt = processor.apply_chat_template([{ role: 'user', content: [{ type: 'image' }, { type: 'text', text: test.prompt }] }], { add_generation_prompt: true });
      const inputs = await processor(prompt, image);
      self.postMessage({ type: 'progress', event: { case: test.id, stage: 'generate', preprocessingMs: performance.now() - started, pixelShape: inputs.pixel_values?.dims } });
      const generated = await model.generate({ ...inputs, max_new_tokens: 96, do_sample: false });
      const tokens = generated.slice(null, [inputs.input_ids.dims.at(-1), null]);
      const output = processor.batch_decode(tokens, { skip_special_tokens: true })[0];
      self.postMessage({ type: 'row', row: { ...test, output, score: scoreCase(test, output), elapsedMs: performance.now() - started,
        inputTokens: inputs.input_ids.dims.at(-1), outputTokens: tokens.dims.at(-1), hitTokenLimit: tokens.dims.at(-1) >= 96,
        imageSize: image.size, pixelShape: inputs.pixel_values?.dims } });
    }
    self.postMessage({ state: 'done' });
  } catch (error) { self.postMessage({ state: 'error', error: error.message }); }
  finally { await model?.dispose(); }
};
