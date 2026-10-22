/**
 * Optional on-device image model for graphics marked as decoration that the rules can't place.
 * It only sorts a cropped graphic into broad types; it never describes images or drafts alt text.
 * Label wording is embedded ahead of time (scripts/precompute-image-labels.mjs), so the browser downloads only the
 * image half of the model.
 */
import labels from './image-labels.json' with { type: 'json' };

export const IMAGE_MODEL = Object.freeze({ key: 'clip', label: 'CLIP · image types', id: 'Xenova/clip-vit-base-patch32',
  revision: 'd15189d7028b43f1d3e65039190477f6af591c2a', dtype: 'q8', device: 'wasm', dimensions: 512, graphBytes: 89117001, textBytes: 64504507,
  download: '89.12 MB', descriptionDownload: '64.50 MB', budget: 40, descriptionBudget: 30,
  tradeoff: 'Sorts graphics into broad types (chart, map, photo, panel, line…). It cannot read text in images, and text on top of a graphic confuses it.' });

export const IMAGE_LABELS = Object.freeze({
  content: ['a bar chart or line graph', 'a map', 'a photograph', 'a diagram or infographic', 'a table of data'],
  decoration: ['a thin decorative line', 'a plain coloured background or panel', 'a logo', 'a small icon', 'an empty box or border'],
});
export const IMAGE_POLICY = Object.freeze({ contentHigh: 0.85, contentLow: 0.2, maxLetters: 120, minShare: 0.01, contentMinShare: 0.05, contentMaxLetters: 40 });

/**
 * Which "can't tell" graphics to show the model: little text on them (text confuses it) and big enough to see.
 * The rules stay in charge of text-heavy areas.
 */
export function imageCandidates(report, policy = IMAGE_POLICY, budget = IMAGE_MODEL.budget) {
  return (report.decorative?.items || []).map((item, index) => ({ ...item, index }))
    .filter(item => item.kind === 'unclear' && (item.letters ?? 0) <= policy.maxLetters && item.share >= policy.minShare)
    .sort((a, b) => b.share - a.share).slice(0, budget);
}

/**
 * What a model result means for one graphic. Its "decoration" calls proved reliable on real reports; its "content" calls
 * mistook table rows with numbers for bar charts, so content counts only for a sizeable graphic with almost no text on it.
 */
export function imageVerdict(result, item, policy = IMAGE_POLICY) {
  if (!result || !item) return 'unclear';
  if (result.verdict === 'content') return item.share >= policy.contentMinShare && (item.letters ?? 0) <= policy.contentMaxLetters ? 'content' : 'unclear';
  return result.verdict;
}
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
/** Compare one normalized image vector with the label vectors: a softmax over CLIP's scaled similarities. */
export function judgeImage(vector, policy = IMAGE_POLICY, vectors = labels.vectors) {
  const names = [...IMAGE_LABELS.content, ...IMAGE_LABELS.decoration];
  const logits = vectors.map(label => dot(vector, label) * 100), max = Math.max(...logits);
  const exp = logits.map(value => Math.exp(value - max)), sum = exp.reduce((a, b) => a + b, 0), probs = exp.map(value => value / sum);
  const best = probs.indexOf(Math.max(...probs));
  const content = probs.slice(0, IMAGE_LABELS.content.length).reduce((a, b) => a + b, 0);
  const verdict = content >= policy.contentHigh && best < IMAGE_LABELS.content.length ? 'content' : content <= policy.contentLow ? 'decoration' : 'unclear';
  return { label: names[best], contentScore: Math.round(content * 1000) / 1000, verdict };
}

/**
 * Image descriptions to check against their pictures. CLIP compares meaning between a picture and a short text, so it
 * is only shown real descriptions of well-cropped images: not placeholders the rules already flagged, not slivers (the
 * PDF's tag covers part of the picture), and not descriptions of text graphics (charts, diagrams, infographics), which it
 * cannot read. Ranking a description among the report's others needs enough of them, so fewer than five means no check.
 */
export const DESCRIPTION_POLICY = Object.freeze({ minDescribed: 5, maxRatio: 4, minShare: 0.01, flagRank: 3,
  textual: /\b(graphic|diagram|infographic|chart|graph|table|titled|timeline|flowchart|logo|map)\b/i });
/**
 * The image model's text half only understands English, so descriptions are compared with pictures only in English PDFs:
 * the declared language, or, when none is declared, the language the text reads as. Unknown counts as not English.
 */
export function descriptionsInEnglish(report) {
  const declared = String(report.metadata?.language || '').toLowerCase().split(/[-_]/)[0];
  const code = declared || report.consistency?.language?.code || '';
  return code === 'en';
}
export function descriptionCandidates(report, policy = DESCRIPTION_POLICY, budget = IMAGE_MODEL.descriptionBudget) {
  if (!descriptionsInEnglish(report)) return [];
  const unusable = new Set((report.figureDescriptions?.items || []).filter(item => item.flags.some(flag => ['auto-generated', 'generic', 'file-name'].includes(flag))).map(item => item.id));
  const candidates = (report.figureAlternatives?.items || []).filter(figure => figure.tagged && figure.alt?.trim() && figure.quads?.length && !unusable.has(figure.id) && !policy.textual.test(figure.alt))
    .map(figure => {
      const points = figure.quads.flat(), xs = points.map(point => point[0]), ys = points.map(point => point[1]);
      const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], width = box[2] - box[0], height = box[3] - box[1];
      const [x0 = 0, y0 = 0, x1 = 612, y1 = 792] = report.pages?.[figure.page - 1]?.view || [];
      return { id: figure.id, page: figure.page, alt: figure.alt.trim(), quad: [[box[0], box[1]], [box[2], box[1]], [box[2], box[3]], [box[0], box[3]]],
        ratio: Math.max(width, height) / Math.max(1e-6, Math.min(width, height)), share: width * height / Math.abs((x1 - x0) * (y1 - y0) || 1) };
    }).filter(item => Number.isFinite(item.ratio) && item.ratio <= policy.maxRatio && item.share >= policy.minShare).slice(0, budget);
  return candidates.length >= policy.minDescribed ? candidates : [];
}
const words = text => new Set(String(text || '').toLocaleLowerCase().match(/\p{L}{3,}/gu) || []);
/**
 * The same picture saved with different descriptions: two image fingerprints almost identical (the same photo placed twice),
 * descriptions sharing under half their words. Logos and blank crops are left out; logos are repeated on purpose.
 */
export function duplicateImages(images, policy = { minSimilarity: 0.97, maxOverlap: 0.5, max: 12 }) {
  const usable = images.filter(image => !image.blank && image.vector && image.alt && !/\blogo\b/i.test(image.alt));
  const pairs = [];
  for (let i = 0; i < usable.length; i++) for (let j = i + 1; j < usable.length; j++) {
    const a = usable[i], b = usable[j], similarity = dot(a.vector, b.vector);
    if (similarity < policy.minSimilarity) continue;
    const wa = words(a.alt), wb = words(b.alt), shared = [...wa].filter(word => wb.has(word)).length;
    if (shared / Math.max(1, Math.min(wa.size, wb.size)) >= policy.maxOverlap) continue;
    pairs.push({ a: { id: a.id, page: a.page, alt: a.alt }, b: { id: b.id, page: b.page, alt: b.alt }, similarity: Math.round(similarity * 1000) / 1000 });
  }
  return pairs.sort((x, y) => y.similarity - x.similarity).slice(0, policy.max);
}
/**
 * For each image, where its own description ranks among all the checked descriptions (1 = best match).
 * Images the model sees as a blank panel (a crop that missed the picture) are left out.
 */
export function rankDescriptions(images, texts, policy = DESCRIPTION_POLICY) {
  const usable = images.map((image, index) => ({ ...image, index })).filter(image => !image.blank);
  if (usable.length < policy.minDescribed) return [];
  return usable.map(image => {
    const similarities = usable.map(other => dot(image.vector, texts[other.index]));
    const own = dot(image.vector, texts[image.index]);
    const rank = similarities.filter(value => value > own).length + 1;
    return { id: image.id, page: image.page, rank, of: usable.length, similarity: Math.round(own * 1000) / 1000, mismatch: rank > policy.flagRank };
  });
}
