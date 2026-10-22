import { it, expect, vi } from 'vitest';
import { screenImages, prepareImageDescriptions } from '../src/runtime/image-screening.js';
import labels from '../src/engine/image-labels.json' with { type: 'json' };
const photos = Array.from({ length: 5 }, (_, i) => ({ id: `f${i}`, page: i + 1, alt: `Volunteers build a shelter ${i}`, blob: { local: true } }));
it('does not load encoders for an empty request', async () => {
  const encodeImage = vi.fn(), encodeDescriptions = vi.fn();
  expect(await screenImages({}, { encodeImage, encodeDescriptions })).toMatchObject({ inferencePerformed: false, judgmentsPerformed: false, execution: { attemptedCrops: 0, encodedCrops: 0 } });
  expect(encodeImage).not.toHaveBeenCalled(); expect(encodeDescriptions).not.toHaveBeenCalled();
});
it('records real execution for blank crops while skipping unusable judgments and the text-model download', async () => {
  const encodeDescriptions = vi.fn();
  const result = await screenImages({ descriptions: photos }, { encodeImage: async () => labels.vectors[6], encodeDescriptions });
  expect(result).toMatchObject({ inferencePerformed: true, judgmentsPerformed: false, descriptions: [], execution: { attemptedCrops: 5, encodedCrops: 5, usableDescriptions: 0, textInputs: 0, descriptionSkipReason: 'not-enough-usable-descriptions' } });
  expect(result.crops.map(item => [item.id, item.page, item.reason])).toEqual(photos.map(item => [item.id, item.page, 'blank-panel-classification']));
  expect(encodeDescriptions).not.toHaveBeenCalled();
  expect(JSON.stringify(result)).not.toContain('"local"'); expect(JSON.stringify(result)).not.toContain('"vector"');
});
it('distinguishes encoded candidates from usable and compared descriptions after blank filtering', async () => {
  let i = 0; const encodeDescriptions = vi.fn();
  const result = await screenImages({ descriptions: photos }, { encodeImage: async () => labels.vectors[i++ === 0 ? 6 : 2], encodeDescriptions });
  expect(result.execution).toMatchObject({ encodedCrops: 5, usableDescriptions: 4, comparedDescriptions: 0 });
  expect(encodeDescriptions).not.toHaveBeenCalled();
});
it('retains description identity and consumed token receipts when comparison is possible', async () => {
  const inputs = photos.map(item => ({ id: item.id, page: item.page, consumedText: 'Volunteers', truncated: true }));
  const result = await screenImages({ descriptions: photos }, { encodeImage: async () => labels.vectors[2], encodeDescriptions: async () => ({ vectors: photos.map(() => labels.vectors[2]), inputs }) });
  expect(result).toMatchObject({ inferencePerformed: true, judgmentsPerformed: true, execution: { usableDescriptions: 5, comparedDescriptions: 5, textInputs: 5 }, descriptionInputs: inputs });
});
it('records only unpadded consumed tokens and exposes truncation without changing the saved description', () => {
  const tokenizer = Object.assign(vi.fn(() => ({ input_ids: { tolist: () => [[1n, 2n, 0n]] }, attention_mask: { tolist: () => [[1n, 1n, 0n]] } })), { encode: () => [1, 2, 3, 4], decode: tokens => tokens.join(' ') });
  const input = [{ id: 'long', page: 9, alt: 'Original longer description' }];
  const result = prepareImageDescriptions(input, tokenizer);
  expect(tokenizer).toHaveBeenCalledWith(['Original longer description'], { padding: true, truncation: true, max_length: 77 });
  expect(result.inputs).toEqual([{ id: 'long', page: 9, inputTokens: 4, consumedTokens: 2, truncated: true, consumedText: '1 2' }]);
  expect(input[0].alt).toBe('Original longer description');
});
