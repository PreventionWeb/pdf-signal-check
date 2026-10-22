// Synthetic smoke cases, fixed before inference. Not a validation corpus.
export const MODEL = Object.freeze({
  id: 'HuggingFaceTB/SmolVLM-256M-Instruct',
  revision: '7e3e67edbbed1bf9888184d9df282b700a323964',
  dtype: { embed_tokens: 'q8', vision_encoder: 'q8', decoder_model_merged: 'q4' },
  graphBytes: 209196694, tokenizerBytes: 3548256,
});
const read = 'Read the labels and printed values in this image. Reply only with a JSON object mapping each label to its number, without units. If there are no printed values, reply {}. Do not estimate or invent values.';
const judge = description => `Does this description give the correct labels, values and main comparison in the image? Description: ${JSON.stringify(description)}. Reply with exactly one word: MATCH, MISMATCH, or UNCERTAIN. A description with no values is UNCERTAIN. Do not write a replacement description.`;
export const CASES = [
  { id: 'chart-original', image: 'chart', task: 'read', prompt: read, expected: { North: 2.8, Central: 3.1, South: 3.4 } },
  { id: 'chart-permuted', image: 'permuted', task: 'read', prompt: read, expected: { North: 3.4, Central: 2.8, South: 3.1 } },
  { id: 'table', image: 'table', task: 'read', prompt: read, expected: { North: 2.8, Central: 3.1, South: 3.4 } },
  { id: 'no-data', image: 'panel', task: 'read', prompt: read, expected: {} },
  { id: 'good-description', image: 'chart', task: 'judge', prompt: judge('North 2.8 m, Central 3.1 m, South 3.4 m. South has the highest value.'), expected: 'MATCH' },
  { id: 'wrong-values', image: 'chart', task: 'judge', prompt: judge('North 3.4 m, Central 3.1 m, South 2.8 m. North has the highest value.'), expected: 'MISMATCH' },
  { id: 'vague-description', image: 'chart', task: 'judge', prompt: judge('A chart comparing three stations.'), expected: 'UNCERTAIN' },
  { id: 'good-permuted', image: 'permuted', task: 'judge', prompt: judge('North 3.4 m, Central 2.8 m, South 3.1 m. North has the highest value.'), expected: 'MATCH' },
];

// Strict scoring: malformed output is unassessed, never a successful check or a false flag.
export function scoreCase(test, output) {
  if (test.task === 'judge') {
    const verdict = output.trim();
    return { valid: ['MATCH', 'MISMATCH', 'UNCERTAIN'].includes(verdict), correct: verdict === test.expected,
      falseFlag: test.expected === 'MATCH' && verdict === 'MISMATCH',
      falseReassurance: test.expected === 'MISMATCH' && verdict === 'MATCH' };
  }
  let parsed;
  try { parsed = JSON.parse(output); } catch { return { valid: false, correct: false, valuesCorrect: 0, valuesExpected: Object.keys(test.expected).length, extraLabels: null }; }
  const valid = parsed !== null && !Array.isArray(parsed) && typeof parsed === 'object' && Object.values(parsed).every(value => typeof value === 'number' && Number.isFinite(value));
  const expected = Object.entries(test.expected), valuesCorrect = valid ? expected.filter(([key, value]) => parsed[key] === value).length : 0;
  const extraLabels = valid ? Object.keys(parsed).filter(key => !Object.hasOwn(test.expected, key)).length : null;
  return { valid, correct: valid && valuesCorrect === expected.length && extraLabels === 0,
    valuesCorrect, valuesExpected: expected.length, extraLabels };
}
