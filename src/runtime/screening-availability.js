import { prepareSemanticWork } from '../engine/semantic.js';
import { getSemanticModel, supportsLanguage } from '../engine/models.js';
import { imageCandidates, descriptionCandidates } from '../engine/image-model.js';
import { buildScreeningRequest } from './screening-request.js';

/** Same bounded preparation as the worker, before any asset download. Counts are potential comparisons, not success. */
export function screeningAvailability(report, { modelId = 'minilm', checks = ['title', 'subject', 'keywords', 'sections'], languageAssumption = null, requireInference = true } = {}) {
  const empty = { text: [], textAvailable: false, languageSupported: false, graphics: 0, photos: 0, imagesAvailable: false };
  if (!report?.analysisComplete) return empty;
  const model = getSemanticModel(modelId || 'minilm'), language = languageAssumption || report.metadata?.language;
  // A potential English workload can be described before an explicit language decision; never used to start inference.
  const missing = !String(report.metadata?.language || '').trim();
  const alternative = !missing && !supportsLanguage(model, language) && supportsLanguage(getSemanticModel('granite-r2'), language) ? getSemanticModel('granite-r2') : null;
  const request = buildScreeningRequest(report, { modelId: alternative?.key || model.key, checks, requireInference, languageAssumption: languageAssumption || (missing ? 'en' : null) });
  const work = prepareSemanticWork(request), actual = supportsLanguage(model, language) ? work : prepareSemanticWork(buildScreeningRequest(report, { modelId: model.key, checks, languageAssumption, requireInference })), tasks = work.tasks || [], facts = work.factIndices?.length || 0;
  const names = { title: 'publication title', 'title-support': 'publication title', name: 'pair of title versions', subject: 'saved description', keyword: 'keyword', section: 'heading and following text', figure: 'image description and caption', contents: 'contents entry and heading' };
  const counts = new Map();
  for (const task of tasks) counts.set(names[task.field], (counts.get(names[task.field]) || 0) + 1);
  if (facts >= 2) counts.set('sentences with numbers', facts);
  const plurals = { 'publication title': 'publication titles', 'pair of title versions': 'pairs of title versions', 'saved description': 'saved descriptions', keyword: 'keywords', 'heading and following text': 'headings and following text', 'image description and caption': 'image descriptions and captions', 'contents entry and heading': 'contents entries and headings' };
  const graphics = imageCandidates(report).length, photos = descriptionCandidates(report).length;
  return { text: [...counts].map(([label, count]) => ({ label: count > 1 ? plurals[label] || label : label, count })), textAvailable: Boolean(work.texts?.length),
    languageSupported: supportsLanguage(model, language), alternativeModel: alternative?.label || null, missingLanguage: missing && !languageAssumption,
    noInputResult: actual.texts?.length ? null : actual.result,
    graphics, photos, imagesAvailable: graphics > 0 || photos >= 5 };
}
