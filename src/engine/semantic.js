import { selectTopicEvidence } from './topic-retrieval.js';
import { compareTitles, normalizeTitle, publicationCandidates } from './titles.js';

import { getSemanticModel, supportsLanguage, resolveScreeningLanguage } from './models.js';
export const SEMANTIC_MODEL = getSemanticModel('minilm');
export const SEMANTIC_LIMITS = Object.freeze({ titleCandidates: 8, excerptCount: 6,
  excerptCharacters: 800, metadataCharacters: 350, keywordCount: 12, sectionCount: 6, titleLow: 0.35, titleHigh: 0.75,
  topicLow: 0.20, topicHigh: 0.45 });
const uncertain = reason => ({ status: 'uncertain', reason, evidence: [] });
const words = text => normalizeTitle(text).match(/[\p{L}\p{N}]+/gu) || [];


export function prepareSemanticInput(input) {
  const metadata = input.metadata || { infoTitle: input.title, language: input.language };
  const candidates = publicationCandidates(input.candidates || []).filter((c, i, all) =>
    all.findIndex(x => normalizeTitle(x.text) === normalizeTitle(c.text)) === i).slice(0, SEMANTIC_LIMITS.titleCandidates);
  // Preserve geometry references while grouping adjacent opening blocks into bounded excerpts.
  const opening = (input.openingEvidence || []).filter(e => [1, 2].includes(e.page) && typeof e.text === 'string' && e.text.trim());
  const excerpts = [];
  for (const block of opening.slice(0, 100)) {
    let excerpt = excerpts.at(-1);
    if (!excerpt || excerpt.page !== block.page || excerpt.text.length + block.text.length + 1 > SEMANTIC_LIMITS.excerptCharacters) {
      if (excerpts.length >= SEMANTIC_LIMITS.excerptCount) break;
      excerpt = { page: block.page, source: 'opening excerpt', text: '', blockIds: [], keys: [] }; excerpts.push(excerpt);
    }
    const text = block.text.slice(0, SEMANTIC_LIMITS.excerptCharacters);
    excerpt.text += `${excerpt.text ? ' ' : ''}${text}`;
    if (block.blockId != null || block.id != null) excerpt.blockIds.push(block.blockId ?? block.id);
    if (block.key) excerpt.keys.push(block.key);
  }
  return { metadata, candidates, excerpts: excerpts.filter(e => e.text.length >= 80),
    deterministicTitle: input.deterministicTitle };
}

function identityWarnings(metadata, candidates, deterministicTitle) {
  const rule = compareTitles(metadata, candidates);
  const warnings = [];
  for (const result of [rule, deterministicTitle]) {
    if (result?.status === 'suspected-mismatch' && !warnings.includes(result.reason)) warnings.push(result.reason);
  }
  const title = rule.title;
  if (!title) return warnings;
  for (const candidate of candidates) {
    const a = words(title), b = words(candidate.text);
    const common = a.filter(w => b.includes(w)).length / Math.max(a.length, b.length, 1);
    const nums = s => (s.match(/\b\d+[A-Za-z]?\b/g) || []).join('|');
    if (common >= 0.5 && nums(title) && nums(candidate.text) && nums(title) !== nums(candidate.text)) {
      warnings.push('A closely worded title candidate has different numbers, years, or edition identifiers.');
    }
  }
  return [...new Set(warnings)];
}
const cosine = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || !a.length || a.length !== b.length) throw new Error('Invalid embedding dimensions.');
  const dot = a.reduce((n, x, i) => n + x * b[i], 0);
  const norm = Math.sqrt(a.reduce((n, x) => n + x * x, 0) * b.reduce((n, x) => n + x * x, 0));
  if (!Number.isFinite(dot) || !Number.isFinite(norm) || !norm) throw new Error('Invalid embedding values.');
  return Math.max(-1, Math.min(1, dot / norm));
};


export function sectionEvidence(pages = []) {
  const sections = [];
  for (const page of pages.slice(0,3)) {
    let current = null;
    for (const block of (page.logicalBlocks || []).slice(0,200)) {
      if (/^H[1-6]?$/.test(block.role || '')) {
        if (current?.body.text.length >= 80) sections.push(current);
        current = { heading: { ...block, page: page.number, keys: block.key ? [block.key] : [] },
          body: { page: page.number, text: '', keys: [], source: 'following tagged section text' } };
      } else if (current && block.text?.trim() && current.body.text.length < 800) {
        current.body.text += `${current.body.text ? ' ' : ''}${block.text}`;
        if (block.key) current.body.keys.push(block.key);
        current.body.text = current.body.text.slice(0,800);
      }
    }
    if (current?.body.text.length >= 80) sections.push(current);
  }
  return sections.slice(0, SEMANTIC_LIMITS.sectionCount);
}

/** embed(texts, model) returns vectors or {vectors, provenance}. Policy is separate from inference. */
export async function assessSemantic(input, embed) {
  const model = getSemanticModel(input.modelId);
  const limits = { ...SEMANTIC_LIMITS, ...model.thresholds };
  const { metadata, candidates, excerpts, deterministicTitle } = prepareSemanticInput(input);
  const languageContext = resolveScreeningLanguage(metadata.language, input.languageAssumption);
  const checks = [...new Set(input.checks || ['title','subject','keywords','sections'])];
  const allowed = ['title','subject','keywords','sections'];
  if (checks.some(c => !allowed.includes(c))) throw new Error('Unknown semantic check requested.');
  const requested = field => checks.includes(field);
  const rules = compareTitles(metadata, candidates);
  const warnings = identityWarnings(metadata, candidates, deterministicTitle);
  const result = { schemaVersion: 2, model, languageContext, requireInference: input.requireInference === true, thresholds: model.thresholds, limits, requestedChecks: checks,
    assessedAt: new Date().toISOString(), inferencePerformed: false, embeddedTextCount: 0,
    inferenceProvenance: [], skippedChecks: [], keywordItems: [], sectionItems: [],
    title: uncertain('No credible cover or first-page title evidence.'),
    subject: uncertain('No subject metadata or sufficient opening text.'),
    keywords: uncertain('No delimited keywords or sufficient opening text.'),
    sections: uncertain('No sufficiently specific tagged headings with bounded following text.'), ranked: [],
    note: 'Experimental local hybrid screening. Deterministic identity rules remain independent. Model-specific thresholds are provisional; cosine scores are not probabilities or comparable confidence across models. Related text does not establish identity or change compliance.' };
  for (const field of allowed) if (!requested(field)) { result[field] = { ...uncertain('This check was not requested.'), method: 'not-requested', inferencePerformed: false }; result.skippedChecks.push(field); }
  const titleSettled = requested('title') && (warnings.length || rules.status === 'match');
  if (titleSettled) result.title = { status: warnings.length ? 'suspected-mismatch' : 'match',
    reason: warnings.length ? warnings.join(' ') : rules.reason, evidence: warnings.length ? candidates : candidates.filter(c => normalizeTitle(c.text) === normalizeTitle(rules.title)),
    identityWarnings: warnings, method: 'deterministic-rules', inferencePerformed: false };
  if (!supportsLanguage(model, languageContext.screening)) {
    for (const field of allowed) if (requested(field) && !(field === 'title' && titleSettled)) result[field] = {
      ...uncertain(`The declared language is missing or outside ${model.label}'s explicit language coverage. No language detection or multilingual accuracy guarantee is provided.`), method: 'unsupported-language', inferencePerformed: false };
    result.notRun = { code: "unsupported-language", reason: "The document language is missing or unsupported by the selected model.", checks: [] };
    return { ...result, assessment: result.title };
  }
  const texts = [], indices = new Map();
  const add = text => { if (!indices.has(text)) { indices.set(text,texts.length); texts.push(text); } return indices.get(text); };
  const tasks = [];
  const addTask = (field, query, evidence, extra = {}) => {
    if (!query?.trim() || query.length > limits.metadataCharacters || !evidence.length) return;
    tasks.push({ field, query, queryIndex: add(query), evidence: evidence.map(e => ({...e, embeddingIndex: add(e.text)})), ...extra });
  };
  if (requested('title') && words(rules.title || '').length >= 2 && (!titleSettled || input.requireInference)) addTask(titleSettled ? 'title-support' : 'title',rules.title,candidates);
  const topicTask = (field, query, extra = {}) => {
    const selected = input.documentEvidence && query?.trim() ? selectTopicEvidence(query, input.documentEvidence, excerpts) : { evidence: excerpts, receipt: null };
    addTask(field, query, selected.evidence, { ...extra, retrieval: selected.receipt });
  };
  if (requested('subject')) topicTask('subject',metadata.subject);
  const rawKeywords = typeof metadata.keywords === 'string' ? metadata.keywords.split(/[,;\n]/).map(s=>s.trim()).filter(Boolean) : [];
  const keywordTerms = [...new Set(rawKeywords)];
  const selectedKeywords = keywordTerms.slice(0,limits.keywordCount);
  result.keywordCoverage = { totalTerms: keywordTerms.length, evaluatedTerms: 0, skippedTerms: Math.max(0,keywordTerms.length-limits.keywordCount),
    delimitation: /[,;\n]/.test(metadata.keywords || '') ? 'explicit separators' : 'undelimited metadata treated as one phrase' };
  if (requested('keywords')) for (const keyword of selectedKeywords) topicTask('keyword',keyword,{keyword});
  const availableSections = input.sections || sectionEvidence(input.pages);
  const sections = availableSections.slice(0,limits.sectionCount);
  result.sectionCoverage = { suppliedPairs: availableSections.length, evaluatedPairs: 0, skippedPairs: availableSections.length };
  if (requested('sections')) for (const section of sections) {
    const h = section.heading, body = section.body;
    if (!h || !body || typeof h.text !== 'string' || typeof body.text !== 'string' || !/^H[1-6]?$/.test(h.role || '') || h.page !== body.page || !body.keys?.length || body.text?.length < 80 || words(h.text || '').length < 2) continue;
    if (/^(executive overview|introduction|conclusion|summary|references|results|discussion|methods)$/i.test(h.text.trim())) continue;
    addTask('section',h.text,[{...body,text:body.text.slice(0,800)}],{heading:h});
  }
  if (!tasks.length) {
    const queryReason = (query, evidence, missing) => !query?.trim() ? missing : query.length > limits.metadataCharacters
      ? `The metadata value exceeds the ${limits.metadataCharacters}-character screening limit.`
      : !evidence.length ? 'No sufficient opening-page text was recovered for comparison.' : 'No eligible comparison was prepared.';
    result.notRun = { code: 'no-comparable-inputs', reason: 'None of the selected checks had enough comparable input to run the AI model.', checks: checks.map(check => ({ check,
      reason: check === 'title' ? titleSettled && !input.requireInference ? 'Title identity was settled by deterministic rules; model inference was not requested for this comparison.' : !rules.title ? 'The PDF has no title metadata to compare.' : words(rules.title).length < 2 ? 'The metadata title is too short for AI comparison.' : queryReason(rules.title, candidates, 'No title metadata was found.')
        : check === 'subject' ? queryReason(metadata.subject, excerpts, 'The PDF has no subject description in its metadata.')
        : check === 'keywords' ? !keywordTerms.length ? 'The PDF has no keyword metadata to compare.' : !excerpts.length ? 'No sufficient opening-page text was recovered for keyword comparison.' : 'No keyword fits the bounded screening limits.'
        : 'No eligible tagged heading and following text were recovered. Generic or very short headings cannot be screened.'
    })) };
  }
  if (tasks.length) {
    const embedded = await embed(texts,model);
    const vectors = Array.isArray(embedded) ? embedded : embedded.vectors;
    if (!Array.isArray(vectors) || vectors.length !== texts.length) throw new Error('The model returned incomplete embeddings.');
    result.inferencePerformed = true; result.embeddedTextCount = texts.length;
    result.inferenceProvenance = Array.isArray(embedded.provenance) ? embedded.provenance : [];
    for (const task of tasks) {
      const evidence = task.evidence.map(e => ({...e, similarity:cosine(vectors[task.queryIndex],vectors[e.embeddingIndex]),
        modelInput:result.inferenceProvenance[e.embeddingIndex] || null})).sort((a,b)=>b.similarity-a.similarity);
      const best = evidence[0].similarity;
      const low = task.field.startsWith('title') ? limits.titleLow : limits.topicLow;
      const high = task.field.startsWith('title') ? limits.titleHigh : limits.topicHigh;
      const assessment = { status:best>=high?'semantically-related':best<low?'suspected-mismatch':'uncertain',
        retrieval: task.retrieval || undefined, method:'embedding-screening',inferencePerformed:true,evidence, queryInput:result.inferenceProvenance[task.queryIndex] || null,
        reason:best>=high?'The bounded evidence is topically related; identity and factual correctness remain unconfirmed.':best<low?'The query is weakly related to the bounded evidence. Inspect the text; later sections, generic headings or alternate wording may supply missing context.':'Similarity falls in this model’s provisional review range.' };
      if(task.field==='title'){result.title=assessment;result.ranked=evidence;}
      else if(task.field==='title-support')result.titleAI=assessment;
      else if(task.field==='subject')result.subject=assessment;
      else if(task.field==='keyword')result.keywordItems.push({...assessment,keyword:task.keyword});
      else result.sectionItems.push({...assessment,heading:task.heading});
    }
  }
  const aggregate = (items, reason, incomplete=false) => ({ status:items.some(i=>i.status==='suspected-mismatch')?'suspected-mismatch':items.length&&!incomplete&&items.every(i=>i.status==='semantically-related')?'semantically-related':'uncertain',
    reason,method:'embedding-screening',inferencePerformed:items.length>0,evidence:items.flatMap(i=>i.evidence).slice(0,6) });
  if(requested('keywords')) {
    result.keywordCoverage.evaluatedTerms=result.keywordItems.length;
    result.keywordCoverage.skippedTerms=keywordTerms.length-result.keywordItems.length;
    result.keywords=aggregate(result.keywordItems,`${result.keywordItems.length} of ${keywordTerms.length} keyword terms/phrases screened individually against ${input.documentEvidence ? 'selected document excerpts' : 'opening text'}. Terms are screened separately; related terms do not average away flagged terms. Unscreened terms remain unassessed.`,result.keywordCoverage.skippedTerms>0);
  }
  if(requested('sections')) {
    result.sectionCoverage.evaluatedPairs = result.sectionItems.length; result.sectionCoverage.skippedPairs = availableSections.length - result.sectionItems.length;
    result.sections=aggregate(result.sectionItems,`${result.sectionItems.length} of ${availableSections.length} supplied tagged heading/body pairs screened for topical relatedness. This does not validate assigned roles, reading order or factual claims.`,result.sectionCoverage.skippedPairs>0);
  }
  for (const field of allowed) {
    if (!Object.hasOwn(result[field],'inferencePerformed')) result[field].inferencePerformed=false;
    if (!result[field].method) result[field].method='insufficient-evidence';
  }
  return {...result,assessment:result.title};
}
