const terms = text => [...new Set(String(text || '').normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || [])];
const spread = (items, count) => count <= 0 ? [] : count === 1 ? items.slice(Math.floor((items.length - 1) / 2), Math.floor((items.length - 1) / 2) + 1) : items.length <= count ? items : Array.from({ length: count }, (_, i) => items[Math.round(i * (items.length - 1) / (count - 1))]);

/** Experimental bounded candidate pool; receipt distinguishes scanned text from retained passages. */
export function buildDocumentEvidence(pages, { maxPassages = 240, characters = 800 } = {}) {
  const passages = [];
  for (const page of pages) {
    let passage = null;
    for (const block of page.blocks || []) {
      if (!block.text?.trim()) continue;
      for (let offset = 0; offset < block.text.length; offset += characters) {
        const chunk = block.text.slice(offset, offset + characters);
        if (!passage || passage.text.length + chunk.length + 1 > characters) {
          passage = { page: page.number, text: '', keys: [], blockIds: [], source: 'document excerpt' };
          passages.push(passage);
        }
        passage.text += `${passage.text ? ' ' : ''}${chunk}`;
        if (block.key) passage.keys.push(block.key);
        if (block.id != null) passage.blockIds.push(block.id);
      }
    }
  }
  const eligible = passages.filter(p => p.text.trim());
  const retained = spread(eligible, maxPassages);
  return { passages: retained, coverage: { totalPages: pages.length, scannedPassages: eligible.length,
    retainedPassages: retained.length, retainedPages: [...new Set(retained.map(p => p.page))] } };
}

/** Word matching selects candidates; embeddings still decide topical relatedness. */
export function selectTopicEvidence(query, documentEvidence, opening = [], { limit = 8 } = {}) {
  const passages = documentEvidence.passages;
  const queryTerms = terms(query);
  const indexed = passages.map(p => ({ passage: p, words: new Set(terms(p.text)) }));
  const weights = new Map(queryTerms.map(term => [term, 1 + Math.log((indexed.length + 1) / (1 + indexed.filter(p => p.words.has(term)).length))]));
  const ranked = indexed.map(({ passage, words }, index) => ({ passage, index,
    matchedWords: queryTerms.filter(term => words.has(term)),
    weight: queryTerms.reduce((sum, term) => sum + (words.has(term) ? weights.get(term) : 0), 0),
  })).sort((a,b) => b.weight - a.weight || a.index - b.index);
  const lexical = ranked.filter(p => p.matchedWords.length).slice(0, 4);
  const candidates = [...lexical.map(p => p.passage), ...opening.slice(0, 2), ...spread(passages, 4)];
  const evidence = candidates.filter((p, i) => candidates.findIndex(other => other.page === p.page && other.text === p.text) === i).slice(0, limit);
  return { evidence, receipt: { mode: 'document-evidence-v1', ...documentEvidence.coverage,
    selectedPages: [...new Set(evidence.map(p => p.page))], selectedPassages: evidence.length,
    baseline: lexical[0] ? { ...lexical[0].passage, matchedWords: lexical[0].matchedWords, queryWordCount: queryTerms.length } : null,
  } };
}
