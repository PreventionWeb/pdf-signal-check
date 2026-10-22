const terms = text => [...new Set(String(text || '').normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || [])];
const spread = (items, count) => count <= 0 ? [] : count === 1 ? items.slice(Math.floor((items.length - 1) / 2), Math.floor((items.length - 1) / 2) + 1) : items.length <= count ? items : Array.from({ length: count }, (_, i) => items[Math.round(i * (items.length - 1) / (count - 1))]);
const bounded = (value, fallback, minimum = 0) => Number.isFinite(value) ? Math.max(minimum, Math.min(fallback, Math.floor(value))) : fallback;
export const TOPIC_RETRIEVAL_LIMITS = Object.freeze({ passages: 240, characters: 800, queries: 13, queryCharacters: 350, lexicalPerQuery: 4, selected: 8 });

// Yield one bounded excerpt at a time. Re-scanning the existing report avoids keeping a second full-text index.
function* originalPassages(pages, characters) {
  let index = 0;
  for (const page of pages) {
    let passage = null;
    for (const block of page.blocks || []) {
      if (!block.text?.trim()) continue;
      for (let offset = 0; offset < block.text.length; offset += characters) {
        const chunk = block.text.slice(offset, offset + characters);
        if (!passage || passage.text.length + chunk.length + 1 > characters) {
          if (passage?.text.trim()) yield { ...passage, passageIndex: index++ };
          passage = { page: page.number, text: '', keys: [], blockIds: [], source: 'document excerpt' };
        }
        passage.text += `${passage.text ? ' ' : ''}${chunk}`;
        if (block.key && !passage.keys.includes(block.key)) passage.keys.push(block.key);
        if (block.id != null && !passage.blockIds.includes(block.id)) passage.blockIds.push(block.id);
      }
    }
    if (passage?.text.trim()) yield { ...passage, passageIndex: index++ };
  }
}

/** Bounded lexical candidates are found before spread sampling; neither scan is an embedding or a semantic index. */
export function buildDocumentEvidence(pages, { maxPassages = 240, characters = 800, queries = [] } = {}) {
  maxPassages = bounded(maxPassages, TOPIC_RETRIEVAL_LIMITS.passages);
  characters = bounded(characters, TOPIC_RETRIEVAL_LIMITS.characters, 1);
  const uniqueQueries = [...new Set(queries.filter(query => typeof query === 'string' && query.trim()))];
  const eligibleQueries = uniqueQueries.filter(query => query.length <= TOPIC_RETRIEVAL_LIMITS.queryCharacters);
  const searches = eligibleQueries.slice(0, TOPIC_RETRIEVAL_LIMITS.queries).map(query => ({ query, terms: terms(query), matchedPassages: 0, best: [] }));
  const frequencies = new Map(searches.flatMap(search => search.terms).map(term => [term, 0]));
  let scannedPassages = 0;
  for (const passage of originalPassages(pages, characters)) {
    scannedPassages++;
    const words = new Set(terms(passage.text));
    for (const term of frequencies.keys()) if (words.has(term)) frequencies.set(term, frequencies.get(term) + 1);
  }
  // Same evenly spread indices as the original pool, held without materializing all original passages.
  const spreadIndices = new Set();
  for (let i = 0; i < Math.min(maxPassages, scannedPassages); i++) spreadIndices.add(maxPassages === 1 ? Math.floor((scannedPassages - 1) / 2) : scannedPassages <= maxPassages ? i : Math.round(i * (scannedPassages - 1) / (maxPassages - 1)));
  const diverse = [];
  for (const passage of originalPassages(pages, characters)) {
    if (spreadIndices.has(passage.passageIndex)) diverse.push(passage);
    const words = new Set(terms(passage.text));
    for (const search of searches) {
      const matched = search.terms.filter(term => words.has(term));
      if (!matched.length) continue;
      search.matchedPassages++;
      const weight = matched.reduce((sum, term) => sum + 1 + Math.log((scannedPassages + 1) / (1 + frequencies.get(term))), 0);
      search.best.push({ passage, weight, matchedWords: matched });
      search.best.sort((a, b) => b.weight - a.weight || a.passage.passageIndex - b.passage.passageIndex);
      search.best.length = Math.min(search.best.length, TOPIC_RETRIEVAL_LIMITS.lexicalPerQuery);
    }
  }
  const retained = new Map();
  const retain = passage => { if (retained.size < maxPassages) retained.set(passage.passageIndex, passage); };
  // Round robin preserves query diversity even for explicitly smaller pools.
  for (let rank = 0; rank < TOPIC_RETRIEVAL_LIMITS.lexicalPerQuery; rank++) for (const search of searches) if (search.best[rank]) retain(search.best[rank].passage);
  for (const passage of spread(diverse.filter(passage => !retained.has(passage.passageIndex)), maxPassages - retained.size)) retain(passage);
  const passages = [...retained.values()].sort((a, b) => a.passageIndex - b.passageIndex);
  return { passages, lexicalQueries: searches.map(search => ({ query: search.query, matchedPassages: search.matchedPassages,
    retainedPassageIndices: search.best.filter(item => retained.has(item.passage.passageIndex)).map(item => item.passage.passageIndex) })),
  coverage: { totalPages: pages.length, scannedPassages, retainedPassages: passages.length,
    omittedPassages: scannedPassages - passages.length, retainedPages: [...new Set(passages.map(p => p.page))],
    selectionPolicy: 'lexical-before-spread-v2', passageCharacters: characters, passageLimit: maxPassages,
    lexicalQueryCount: searches.length, omittedQueries: uniqueQueries.length - searches.length,
    queryLimit: TOPIC_RETRIEVAL_LIMITS.queries, queryCharacters: TOPIC_RETRIEVAL_LIMITS.queryCharacters,
    lexicalPerQuery: TOPIC_RETRIEVAL_LIMITS.lexicalPerQuery } };
}

/** Word matches are retrieval clues only. Their absence never establishes metadata mismatch. */
export function selectTopicEvidence(query, documentEvidence, opening = [], { limit = 8 } = {}) {
  limit = bounded(limit, TOPIC_RETRIEVAL_LIMITS.selected);
  const passages = documentEvidence.passages;
  const queryTerms = terms(String(query || '').slice(0, TOPIC_RETRIEVAL_LIMITS.queryCharacters));
  const indexed = passages.map(p => ({ passage: p, words: new Set(terms(p.text)) }));
  const weights = new Map(queryTerms.map(term => [term, 1 + Math.log((indexed.length + 1) / (1 + indexed.filter(p => p.words.has(term)).length))]));
  const scannedQuery = documentEvidence.lexicalQueries?.find(search => search.query === query);
  const preferred = scannedQuery?.retainedPassageIndices || [];
  const ranked = indexed.map(({ passage, words }, index) => ({ passage, index,
    matchedWords: queryTerms.filter(term => words.has(term)),
    weight: queryTerms.reduce((sum, term) => sum + (words.has(term) ? weights.get(term) : 0), 0),
  })).sort((a, b) => {
    const aRank = preferred.indexOf(a.passage.passageIndex), bRank = preferred.indexOf(b.passage.passageIndex);
    return (aRank < 0 ? Infinity : aRank) - (bRank < 0 ? Infinity : bRank) || b.weight - a.weight || a.index - b.index;
  });
  const lexical = ranked.filter(p => p.matchedWords.length).slice(0, 4);
  const candidates = [...lexical.map(p => p.passage), ...opening.slice(0, 2).map(p => ({ ...p, text: p.text.slice(0, TOPIC_RETRIEVAL_LIMITS.characters) })), ...spread(passages, 4)];
  const evidence = candidates.filter((p, i) => candidates.findIndex(other => other.page === p.page && other.text === p.text) === i).slice(0, limit);
  return { evidence, receipt: { mode: 'document-evidence-v1', ...documentEvidence.coverage,
    lexicalScanScope: scannedQuery ? 'original document passages' : 'retained pool only',
    scannedLexicalMatches: scannedQuery?.matchedPassages ?? null,
    retainedLexicalMatches: ranked.filter(p => p.matchedWords.length).length,
    selectedLexicalPassages: lexical.filter(item => evidence.includes(item.passage)).length,
    selectedLimit: limit, selectedPages: [...new Set(evidence.map(p => p.page))], selectedPassages: evidence.length,
    baseline: lexical[0] && evidence.includes(lexical[0].passage) ? { ...lexical[0].passage, matchedWords: lexical[0].matchedWords, queryWordCount: queryTerms.length } : null,
  } };
}
