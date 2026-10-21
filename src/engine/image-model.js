/**
 * Optional on-device image model for graphics marked as decoration that the rules can't place.
 * It only sorts a cropped graphic into broad types; it never describes images or drafts alt text.
 * Label wording is embedded ahead of time (scripts/precompute-image-labels.mjs), so the browser downloads only the
 * image half of the model.
 */
import labels from './image-labels.json' with { type: 'json' };

export const IMAGE_MODEL = Object.freeze({ key: 'clip', label: 'CLIP · image types', id: 'Xenova/clip-vit-base-patch32',
  revision: 'd15189d7028b43f1d3e65039190477f6af591c2a', dtype: 'q8', device: 'wasm', dimensions: 512, graphBytes: 89117001,
  download: '89.12 MB', budget: 40,
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
