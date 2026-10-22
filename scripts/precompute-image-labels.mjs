// Embeds the image-type label wording with the pinned CLIP text model, so the browser needs only the image model.
// Run once after changing IMAGE_LABELS or the model: node scripts/precompute-image-labels.mjs (downloads the text model).
import { writeFile } from 'node:fs/promises';
import { AutoTokenizer, CLIPTextModelWithProjection } from '@huggingface/transformers';
import { IMAGE_MODEL, IMAGE_LABELS } from '../src/engine/image-model.js';
const tokenizer = await AutoTokenizer.from_pretrained(IMAGE_MODEL.id, { revision: IMAGE_MODEL.revision });
const text = await CLIPTextModelWithProjection.from_pretrained(IMAGE_MODEL.id, { revision: IMAGE_MODEL.revision, dtype: IMAGE_MODEL.dtype });
const prompts = [...IMAGE_LABELS.content, ...IMAGE_LABELS.decoration].map(label => `a picture of ${label}`);
const vectors = (await text(tokenizer(prompts, { padding: true, truncation: true }))).text_embeds.tolist()
  .map(vector => { const norm = Math.hypot(...vector); return vector.map(value => Math.round(value / norm * 1e6) / 1e6); });
await writeFile(new URL('../src/engine/image-labels.json', import.meta.url), `${JSON.stringify({ model: IMAGE_MODEL.id, revision: IMAGE_MODEL.revision, prompts, vectors })}\n`);
console.log(`Wrote ${vectors.length} label vectors.`);
