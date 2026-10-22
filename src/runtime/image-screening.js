import { IMAGE_MODEL, DESCRIPTION_POLICY, judgeImage, rankDescriptions, duplicateImages } from '../engine/image-model.js';

/** Preserve tokenizer scope just as the text encoder does; these are inputs, not accuracy judgments. */
export function prepareImageDescriptions(descriptions, tokenizer) {
  const texts = descriptions.map(item => item.alt);
  const tokens = tokenizer(texts, { padding: true, truncation: true, max_length: 77 });
  const masks = tokens.attention_mask.tolist(), ids = tokens.input_ids.tolist();
  const inputs = descriptions.map((item, i) => {
    const full = tokenizer.encode(item.alt).length, consumed = ids[i].filter((_, j) => Number(masks[i][j]) !== 0);
    return { id: item.id, page: item.page, inputTokens: full, consumedTokens: consumed.length,
      truncated: full > consumed.length, consumedText: tokenizer.decode(consumed, { skip_special_tokens: true }) };
  });
  return { tokens, inputs };
}

/** Worker-owned inference, with injected encoders so execution/retention contracts can be tested without downloads. */
export async function screenImages(data, { encodeImage, encodeDescriptions, progress = () => {} }) {
  const items = data.items || [], descriptions = data.descriptions || [], results = [], images = [], crops = [];
  const total = items.length + descriptions.length;
  for (const item of items) {
    const vector = await encodeImage(item.blob);
    results.push({ index: item.index, page: item.page, ...judgeImage(vector) });
    crops.push({ kind: 'graphic', index: item.index, page: item.page, encoded: true });
    progress(crops.length, total);
  }
  for (const item of descriptions) {
    const vector = await encodeImage(item.blob), blank = judgeImage(vector).label === 'a plain coloured background or panel';
    images.push({ id: item.id, page: item.page, alt: item.alt, vector, blank });
    crops.push({ kind: 'description', id: item.id, page: item.page, encoded: true, usable: !blank, reason: blank ? 'blank-panel-classification' : null });
    progress(crops.length, total);
  }
  let ranked = [], descriptionInputs = [];
  const usable = images.filter(item => !item.blank).length;
  // Don't download the text half when a relative ranking cannot be produced.
  if (usable >= DESCRIPTION_POLICY.minDescribed) {
    const encoded = await encodeDescriptions(descriptions);
    descriptionInputs = encoded.inputs;
    ranked = rankDescriptions(images, encoded.vectors);
  }
  const duplicates = duplicateImages(images);
  return { schemaVersion: 2, model: IMAGE_MODEL, inferencePerformed: crops.length > 0,
    judgmentsPerformed: results.length + ranked.length + duplicates.length > 0, items: results, descriptions: ranked, duplicates,
    execution: { attemptedCrops: total, encodedCrops: crops.length, descriptionCandidates: descriptions.length,
      usableDescriptions: usable, comparedDescriptions: ranked.length, textInputs: descriptionInputs.length,
      descriptionSkipReason: descriptions.length && usable < DESCRIPTION_POLICY.minDescribed ? 'not-enough-usable-descriptions' : null },
    crops, descriptionInputs, assessedAt: new Date().toISOString() };
}
