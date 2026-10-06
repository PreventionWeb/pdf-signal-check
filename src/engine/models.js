const common = { dtype: 'q8', device: 'wasm', normalize: true, prefix: '', dimensions: 384, calibrated: false };
export const SEMANTIC_MODELS = Object.freeze([
  Object.freeze({ ...common, key: 'minilm', label: 'MiniLM · compact English', id: 'Xenova/all-MiniLM-L6-v2',
    revision: '751bff37182d3f1213fa05d7196b954e230abad9', pooling: 'mean', maxTokens: 256,
    language: 'English', languages: ['en'], graphBytes: 22972370, tokenizerBytes: 711661,
    tradeoff: 'Smallest shipped download; English-only screening with short context.',
    thresholds: { titleLow: 0.35, titleHigh: 0.75, topicLow: 0.20, topicHigh: 0.45 } }),
  Object.freeze({ ...common, key: 'granite-r2', label: 'Granite R2 · multilingual',
    id: 'onnx-community/granite-embedding-97m-multilingual-r2-ONNX',
    revision: '536a9f241cb3f02a9c5995a1e708c784bd274859', pooling: 'cls', maxTokens: 512,
    language: '52 explicitly supported languages', languages: 'sq ar az bn bg ca zh hr cs da nl en et fi fr ka de el he hi hu is id it ja kk km ko lv lt ms mr no fa pl pt ro ru sr sk sl es sw sv tl te th tr uk ur uz vi'.split(' '),
    graphBytes: 97858099, tokenizerBytes: 25301671,
    tradeoff: 'About 123 MB model/tokenizer; multilingual comparison, more memory and first-load time. Application uses 512 tokens, not the full 32K context.',
    thresholds: { titleLow: 0.50, titleHigh: 0.90, topicLow: 0.45, topicHigh: 0.80 } }),
]);
export function getSemanticModel(key = 'minilm') {
  const model = SEMANTIC_MODELS.find(m => m.key === key);
  if (!model) throw new Error(`Unknown semantic model: ${key}`);
  return model;
}
export function supportsLanguage(model, language) {
  if (typeof language !== 'string' || !language.trim()) return false;
  let canonical;
  try { canonical = Intl.getCanonicalLocales(language)[0]; } catch { return false; }
  const primary = canonical.split('-')[0].toLowerCase();
  return model.languages.includes(primary) || (model.key === 'granite-r2' && ['nb','nn'].includes(primary));
}
