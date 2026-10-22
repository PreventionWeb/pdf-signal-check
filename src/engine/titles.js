export function normalizeTitle(text = '') {
  return text.normalize('NFKC').toLocaleLowerCase('en').replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, ' ').trim();
}

/** Cover titles often wrap across lines; join adjacent large cover lines, top to bottom. */
export function coverSpans(candidates = []) {
  const lines = candidates.filter(c => c.source === 'cover text candidate' && c.page === 1 && Number.isFinite(c.y) &&
    c.height > 0 && c.maxHeight > 0 && c.height / c.maxHeight >= 0.5).sort((a, b) => b.y - a.y);
  const spans = [];
  for (let start = 0; start < lines.length; start++) for (let end = start + 2; end <= Math.min(lines.length, start + 4); end++) {
    const part = lines.slice(start, end);
    if (!part.some(c => c.height / c.maxHeight >= 0.85)) continue;
    spans.push({ text: part.map(c => c.text).join(' '), page: 1, source: 'joined cover lines', height: Math.max(...part.map(c => c.height)),
      maxHeight: part[0].maxHeight, blockIds: part.flatMap(c => c.blockIds || []), node: null });
  }
  return spans;
}

export function publicationCandidates(candidates = []) {
  return [...candidates, ...coverSpans(candidates)].filter(c => c.page === 1 && typeof c.text === 'string' &&
    c.text.trim().length >= 5 && c.text.length <= 200 &&
    (c.text.match(/[\p{L}\p{N}]+/gu) || []).length <= 25 &&
    (/^tagged H1?$/.test(c.source || '') || (/^(cover text candidate|joined cover lines)$/.test(c.source) &&
      c.height > 0 && c.maxHeight > 0 && c.height / c.maxHeight >= 0.85)));
}

export function compareTitles(metadata, candidates = []) {
  const allCandidates = candidates; candidates = publicationCandidates(candidates);
  const info = metadata.infoTitle?.trim();
  const xmp = metadata.xmpTitles || [];
  const preferred = xmp.find(t => t.lang === 'x-default')?.text || xmp[0]?.text || info;
  const result = { status: 'uncertain', method: 'title-rules-v1', title: preferred || null,
    candidates: allCandidates, publicationCandidates: candidates, reason: 'No sufficiently strong title evidence. Semantic similarity is not title identity.' };
  const defaultXmp = xmp.find(t => t.lang === 'x-default')?.text;
  if (info && defaultXmp && normalizeTitle(info) !== normalizeTitle(defaultXmp)) {
    return { ...result, status: 'suspected-mismatch', reason: 'The Info title and default XMP title disagree.' };
  }
  if (!preferred) return { ...result, reason: 'The document has no metadata title to compare.' };
  if (candidates.some(c => normalizeTitle(c.text) === normalizeTitle(preferred))) {
    return { ...result, status: 'match', reason: 'The metadata title matches an extracted title candidate after typography and whitespace normalization.' };
  }
  const years = s => s.match(/\b(?:19|20)\d{2}\b/g) || [];
  const withoutYears = s => normalizeTitle(s).replace(/\b(?:19|20)\d{2}\b/g, '').replace(/\s+/g, ' ').trim();
  const differentYear = candidates.find(c => years(preferred).length && years(c.text).length &&
    withoutYears(preferred) === withoutYears(c.text) && years(preferred).join() !== years(c.text).join());
  if (differentYear) return { ...result, status: 'suspected-mismatch', reason: 'The title wording matches a candidate, but its year differs.' };
  const words = s => normalizeTitle(s).match(/[\p{L}\p{N}]+/gu) || [];
  const titleWords = words(preferred);
  const substitution = candidates.find(c => {
    const candidateWords = words(c.text);
    return titleWords.length >= 5 && titleWords.length === candidateWords.length &&
      titleWords.filter((w, i) => w !== candidateWords[i]).length === 1;
  });
  if (substitution) return { ...result, status: 'suspected-mismatch', reason: 'A title candidate has nearly identical wording but one changed term. Inspect whether it names a different entity or edition.' };
  return result;
}
