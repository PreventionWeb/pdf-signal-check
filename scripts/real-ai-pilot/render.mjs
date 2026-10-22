// Local-only review artifacts. Uses the production geometry/budget helpers, with PDF.js's Node canvas backend.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { localDirectory } from './local.mjs';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { pdfjs } from '../../src/engine/analyze.js';
import { evidenceCropBounds } from '../../src/evidence/geometry.js';
import { boundedRenderScale } from '../../src/evidence/render-budget.js';
const directory = await localDirectory(process.argv[2]);
await mkdir(`${directory}/crops`, { recursive: true }); await mkdir(`${directory}/pages`, { recursive: true });
const inventory = JSON.parse(await readFile(`${directory}/inventory.json`));
const cases = JSON.parse(await readFile(`${directory}/cases-unlabelled.json`));
const photoInputs = [];
for (const source of inventory) {
  const report = JSON.parse(await readFile(source.reportPath));
  const task = pdfjs.getDocument({ data: new Uint8Array(await readFile(source.sourcePath)),
    standardFontDataUrl: new URL('../../node_modules/pdfjs-dist/standard_fonts/', import.meta.url).pathname,
    wasmUrl: new URL('../../node_modules/pdfjs-dist/wasm/', import.meta.url).pathname });
  const doc = await task.promise;
  let renderedPages = 0;
  try {
    const photos = source.photos.map((item, index) => ({ ...item, index }));
    const selected = cases.filter(c => c.sourceId === source.id).flatMap(c => c.page ? [c.page] : c.pages || []);
    const pages = [...new Set([...photos.map(item => item.page), ...selected])].sort((a, b) => a - b);
    renderedPages = pages.length;
    for (const number of pages) {
      const page = await doc.getPage(number), unit = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: boundedRenderScale(unit.width, unit.height, 1.6) });
      const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      await writeFile(`${directory}/pages/${source.id}-${number}.png`, canvas.toBuffer('image/png'));
      for (const item of photos.filter(item => item.page === number)) {
        const target = { page: item.page, quads: [item.quad], clean: true };
        const bounds = evidenceCropBounds(report, target, viewport);
        if (!bounds || bounds.pageContext) { photoInputs.push({ sourceId: source.id, id: item.id, page: item.page, unavailable: true }); continue; }
        const scale = Math.min(1, 1000 / Math.max(bounds.width, bounds.height), Math.sqrt(1_000_000 / (bounds.width * bounds.height)));
        const crop = createCanvas(Math.max(1, Math.floor(bounds.width * scale)), Math.max(1, Math.floor(bounds.height * scale)));
        crop.getContext('2d').drawImage(canvas, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, crop.width, crop.height);
        const path = `${directory}/crops/${source.id}-${item.index}.png`;
        await writeFile(path, crop.toBuffer('image/png'));
        photoInputs.push({ sourceId: source.id, id: item.id, page: item.page, alt: item.alt, cropPath: path, expected: null, reviewNote: '' });
        crop.width = crop.height = 1;
      }
      canvas.width = canvas.height = 1; page.cleanup();
    }
  } finally { await task.destroy(); }
  console.log(`${source.id}: ${renderedPages} pages rendered`);
}
await writeFile(`${directory}/photos-unlabelled.json`, JSON.stringify(photoInputs, null, 2));
for (const source of inventory) {
  const items = photoInputs.filter(item => item.sourceId === source.id && item.cropPath);
  if (!items.length) continue;
  const sheet = createCanvas(1200, Math.ceil(items.length / 2) * 360), ctx = sheet.getContext('2d');
  ctx.fillStyle = 'white'; ctx.fillRect(0, 0, sheet.width, sheet.height);
  for (const [i, item] of items.entries()) {
    const image = await loadImage(await readFile(item.cropPath)), scale = Math.min(570 / image.width, 310 / image.height);
    const x = i % 2 * 600, y = Math.floor(i / 2) * 360;
    ctx.drawImage(image, x, y, image.width * scale, image.height * scale);ctx.fillStyle = 'black';ctx.font = '16px sans-serif';ctx.fillText(`${i}: page ${item.page} / ${item.id}`, x + 8, y + 340);
  }
  await writeFile(`${directory}/${source.id}-photos.png`, sheet.toBuffer('image/png'));
}
