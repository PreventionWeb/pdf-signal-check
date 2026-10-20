import { normalizeTitle, publicationCandidates } from './titles.js';

/**
 * Consistency advisories: places where a PDF disagrees with itself.
 * Each item carries a severity: 'concern' (likely wrong or out of date) or 'minor' (a small difference to tidy up).
 * Pairs the rules cannot classify are left 'unresolved' for optional AI screening. Profile acceptance is unaffected.
 */
export const CONSISTENCY_LIMITS = Object.freeze({ runningMinPages: 3, runningMaxNames: 4, staleStatements: 5, placeholders: 8,
  languageCharacters: 30_000, languageMinHits: 30, decorativeImageShare: 0.12, decorativePaths: 150, decorativePages: 30 });

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const monthIndex = name => MONTHS.findIndex(month => month.startsWith(name.toLowerCase().slice(0, 3)));

/** Letters and numbers only: case, punctuation, dashes and "&"/"and" no longer count as differences. */
export const fold = text => String(text || '').normalize('NFKC').toLocaleLowerCase('en').replace(/&/g, ' and ')
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const tokens = text => fold(text).split(' ').filter(Boolean);
const yearsIn = text => [...new Set(String(text || '').match(/\b(?:19|20)\d{2}\b/g) || [])].sort();
const withoutYears = list => list.filter(word => !/^(?:19|20)\d{2}$/.test(word));
const editDistance = (a, b) => {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) { const kept = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1)); previous = kept; }
  }
  return row[b.length];
};
const FUNCTION_WORDS = new Set(['a', 'an', 'the', 'and', 'of', 'to', 'in', 'on', 'for', 'by', 'with', 'from', 'at', 'as',
  'le', 'la', 'les', 'l', 'd', 'de', 'des', 'du', 'et', 'en', 'pour', 'sur', 'au', 'aux', 'el', 'los', 'las', 'del', 'y', 'para', 'con', 'der', 'die', 'das', 'und', 'für', 'von']);
const contentWords = list => withoutYears(list).filter(word => !FUNCTION_WORDS.has(word));
/** Share of the shorter name's content words that the longer name also uses. */
export const overlap = (a, b) => {
  const x = contentWords(tokens(a)), y = contentWords(tokens(b));
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length ? short.filter(word => long.includes(word)).length / short.length : 0;
};

/**
 * Compare two names for the same publication.
 * Returns { kind, severity }: severity 'none' (same), 'minor', 'concern', or 'unresolved' (rules cannot tell).
 */
export function compareNames(a, b, { ignorePunctuation = false } = {}) {
  if (normalizeTitle(a) === normalizeTitle(b)) return { kind: 'same', severity: 'none' };
  const ta = tokens(a), tb = tokens(b);
  if (ta.join(' ') === tb.join(' ')) return ignorePunctuation ? { kind: 'same', severity: 'none' } : { kind: 'punctuation', severity: 'minor' };
  const ya = yearsIn(a), yb = yearsIn(b);
  if (ya.length && yb.length && ya.join() !== yb.join() && overlap(a, b) >= 0.6) return { kind: 'year', severity: 'concern', years: [ya, yb] };
  if (ta.length === tb.length && [...ta].sort().join(' ') === [...tb].sort().join(' ')) return { kind: 'order', severity: 'minor' };
  if (ta.length === tb.length && ta.length >= 3) {
    const changed = ta.map((word, i) => [word, tb[i]]).filter(([x, y]) => x !== y);
    if (changed.length && changed.every(([x, y]) => x.length >= 5 && editDistance(x, y) <= 2 && !/\d/.test(x + y))) {
      // Outside Latin script, small differences usually come from text extraction (ligatures, letter order), not the document.
      return changed.every(([x, y]) => /^\p{Script=Latin}+$/u.test(x + y)) ? { kind: 'spelling', severity: 'minor', words: changed } : { kind: 'same', severity: 'none' };
    }
    if (changed.length === 1 && ta.length >= 4) return { kind: 'substitution', severity: 'concern', words: changed };
  }
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  if (short.length >= 3 && short.every(word => long.includes(word))) return { kind: 'shortened', severity: 'minor' };
  return { kind: overlap(a, b) >= 0.6 ? 'reworded' : 'different', severity: 'unresolved' };
}

const words = text => tokens(text).length;
/** The cover title, or the joined cover lines that best match a reference name. */
function coverTitle(candidates, reference) {
  const cover = publicationCandidates(candidates).filter(c => /cover|tagged H1?$/.test(c.source || '') && withoutYears(tokens(c.text)).length >= 2);
  if (!cover.length) return null;
  const score = c => (reference ? overlap(reference, c.text) : 0) + c.height / (c.maxHeight || c.height || 1) / 10 + Math.min(words(c.text), 12) / 200;
  return [...cover].sort((a, b) => score(b) - score(a))[0];
}

const boilerplate = /^(contents|table of contents|page|chapter|section|annex|appendix|references|notes|foreword|preface|introduction|executive summary)\b/i;
/** Header and footer lines repeated across pages, stripped of page numbers and copyright tails. */
export function runningNames(pages, limits = CONSISTENCY_LIMITS) {
  const seen = new Map();
  for (const page of pages) {
    const onPage = new Set();
    for (const line of page.marginLines || []) for (const segment of line.segments || []) {
      const text = segment.replace(/^[\s|•·]*(?:page\s*)?(?:\d{1,3}(?!\d))?[\s|•·–—-]*/i, '').replace(/(?<![\d–—-])[\s|•·]*(?:page\s*)?\d{1,3}\s*$/i, '')
        .replace(/\s*(?:©|\(c\)|copyright).*$/i, '').trim();
      const key = fold(text);
      if (words(text) < 3 || boilerplate.test(text) || /https?:|www\.|@/.test(text) || onPage.has(key)) continue;
      onPage.add(key);
      const entry = seen.get(key) || { text, pages: [] };
      entry.pages.push(page.number); seen.set(key, entry);
    }
  }
  return [...seen.values()].filter(entry => entry.pages.length >= limits.runningMinPages)
    .sort((a, b) => b.pages.length - a.pages.length).slice(0, limits.runningMaxNames);
}

/** Every place the PDF names itself, compared pairwise against the saved title and the cover. */
function nameConsistency(report, limits) {
  const saved = report.metadataConsistency?.title || null;
  const candidates = report.metadataConsistency?.candidates || [];
  const cover = coverTitle(candidates, saved);
  const running = runningNames(report.pages || [], limits);
  const items = [];
  // Joined cover lines lose the punctuation a line break stood for, so punctuation-only differences with the cover are ignored.
  const compare = (left, right) => compareNames(left.text, right.text, { ignorePunctuation: [left.role, right.role].includes('cover') });
  const push = (left, right, result) => items.push({ id: `name:${left.role}:${right.role}:${fold(right.text).slice(0, 60)}`, ...result, left, right });
  const coverName = cover && { role: 'cover', text: cover.text, page: 1, blockIds: cover.blockIds || [], keys: cover.keys || [] };
  const savedName = saved && { role: 'saved', text: saved };
  // The saved title against the cover. Title identity rules already flag year and term changes, so only report what they leave open.
  if (savedName && coverName && report.metadataConsistency?.status === 'uncertain' && !placeholderTitle(report)) {
    const result = compare(savedName, coverName);
    if (result.severity !== 'none' && !(result.kind === 'order')) push(savedName, coverName, result);
  }
  for (const [index, entry] of running.entries()) {
    const name = { role: 'running', text: entry.text, pages: entry.pages };
    for (const reference of [savedName, coverName].filter(Boolean)) {
      const result = compare(reference, name);
      // A shortened running title is normal; a header sharing few words with the title is a chapter name, not a second name.
      if (result.severity === 'none' || result.kind === 'shortened') break;
      // Only the most frequent header is treated as the running title; other repeated headers are usually chapter names.
      if (result.severity !== 'unresolved' || (result.kind === 'reworded' && index === 0)) { push(reference, name, result); break; }
    }
  }
  return { cover: coverName, saved, running, items };
}

const DRAFT = /\b(draft|for review|not for (?:circulation|distribution|citation)|do not (?:cite|circulate|distribute)|embargoed|work in progress|for internal use)\b/i;
const LEFTOVERS = [
  [/Error! (?:Reference source not found|Bookmark not defined)\.?/i, 'a broken cross-reference left by the word processor'],
  [/\blorem ipsum\b/i, 'placeholder text (lorem ipsum)'],
  [/\[(?:insert|tbc|tbd|add|xx+)\b[^\]]{0,60}\]/i, 'a placeholder in square brackets'],
  [/\b(?:XX|xx)\s?%|\bXX(?:,XXX)+\b/, 'a placeholder number'],
];
const pageText = page => (page.blocks || []).map(block => block.text).join(' ').replace(/\s+/g, ' ');
/** Page text split into sentences, each remembering the text fragments it came from. */
function sentences(page) {
  let text = '';
  const spans = [];
  for (const block of page.blocks || []) { spans.push([text.length, text.length + block.text.length, block.id]); text += `${block.text} `; }
  const result = [];
  for (const match of text.matchAll(/[^.!?•\n]+(?:[.!?]+|$)/g)) {
    const start = match.index, end = start + match[0].length;
    const sentence = match[0].replace(/\s+/g, ' ').trim();
    if (sentence) result.push({ text: sentence, blockIds: spans.filter(([from, to]) => to > start && from < end).map(([, , id]) => id) });
  }
  return result;
}

/** Draft labels, leftover placeholders and data statements older than the date the cover promises. */
function dateConsistency(report, running, limits) {
  const pages = report.pages || [];
  const items = [];
  const coverLines = (report.metadataConsistency?.candidates || []).filter(c => c.page === 1).map(c => c.text);
  const draftCover = [...coverLines, pageText(pages[0] || {}).slice(0, 600)].map(text => text.match(DRAFT)?.[0]).find(Boolean);
  const draftRunning = running.find(entry => DRAFT.test(entry.text));
  const draftBlock = draftCover && (pages[0]?.blocks || []).find(block => DRAFT.test(block.text));
  if (draftCover || draftRunning) items.push({ id: 'date:draft', kind: 'draft', severity: 'concern',
    label: draftCover || draftRunning.text.match(DRAFT)[0], pages: draftCover ? [1] : draftRunning.pages,
    text: draftBlock?.text.trim().slice(0, 160) || draftRunning?.text || null, blockIds: draftBlock ? [draftBlock.id] : [] });
  const leftovers = [];
  for (const page of pages) for (const block of page.blocks || []) for (const [pattern, label] of LEFTOVERS) {
    const match = block.text.match(pattern);
    if (match && leftovers.length < limits.placeholders) leftovers.push({ page: page.number, blockIds: [block.id], text: match[0], label });
  }
  if (leftovers.length) items.push({ id: 'date:leftovers', kind: 'leftovers', severity: 'concern', evidence: leftovers });
  // "Data as of April 2026" on the first page sets the date that body figures should agree with.
  const first = pages.slice(0, 2).map(pageText).join(' ');
  const asOf = new RegExp(`\\b(?:as of|as at|updated|valid as of)\\s+(?:\\d{1,2}\\s+)?${MONTH}\\.?\\s+((?:19|20)\\d{2})`, 'i').exec(first);
  if (asOf) {
    const promised = Number(asOf[2]) * 12 + monthIndex(asOf[1]);
    const statement = new RegExp(`\\b(?:as of|as at|by|through|until|up to)\\s+(?:the end of\\s+|end\\s+)?(?:\\d{1,2}\\s+)?${MONTH}\\.?\\s+((?:19|20)\\d{2})`, 'gi');
    const stale = [];
    for (const page of pages) for (const sentence of sentences(page)) {
      for (const match of sentence.text.matchAll(statement)) {
        const when = Number(match[2]) * 12 + monthIndex(match[1]);
        // Only data claims: a number other than the date itself in the same sentence.
        const rest = sentence.text.replace(match[0], '');
        if (when < promised && /\d/.test(rest.replace(/\b(?:19|20)\d{2}\b/g, '')) && stale.length < limits.staleStatements)
          stale.push({ page: page.number, blockIds: sentence.blockIds, text: sentence.text.slice(0, 240), date: match[0].trim() });
      }
    }
    if (stale.length) items.push({ id: 'date:stale', kind: 'stale', severity: 'concern', promised: asOf[0].trim(), evidence: stale });
  }
  return items;
}

const STOPWORDS = {
  en: 'the and of to in is that for are with as on be this by from which or not have',
  fr: 'le la les des du et est une que dans pour qui sur pas par au aux avec ce sont',
  es: 'el la los las del y es una que en por con para se como al sus más pero',
  de: 'der die das und ist nicht mit von zu den des ein eine auf für sich dem auch',
  pt: 'o a os as do da dos das e é um uma que em para com não por se mais',
  it: 'il lo la gli le di e è un una che per con non del della sono anche',
  nl: 'de het een en van is dat op te zijn voor met niet aan er ook als',
};
const SCRIPTS = [['ar', /\p{Script=Arabic}/u, ['ar', 'fa', 'ur', 'ps', 'ku']], ['ru', /\p{Script=Cyrillic}/u, ['ru', 'uk', 'bg', 'sr', 'mk', 'be', 'kk', 'ky', 'mn', 'tg']],
  ['zh', /\p{Script=Han}/u, ['zh', 'ja']], ['ja', /[\p{Script=Hiragana}\p{Script=Katakana}]/u, ['ja']], ['ko', /\p{Script=Hangul}/u, ['ko']],
  ['el', /\p{Script=Greek}/u, ['el']], ['he', /\p{Script=Hebrew}/u, ['he', 'yi']], ['hi', /\p{Script=Devanagari}/u, ['hi', 'mr', 'ne', 'sa']], ['th', /\p{Script=Thai}/u, ['th']]];
const NAMES = { en: 'English', fr: 'French', es: 'Spanish', de: 'German', pt: 'Portuguese', it: 'Italian', nl: 'Dutch', ar: 'Arabic', ru: 'a Cyrillic-script language',
  zh: 'Chinese or Japanese', ja: 'Japanese', ko: 'Korean', el: 'Greek', he: 'Hebrew', hi: 'a Devanagari-script language', th: 'Thai' };

/** A conservative guess at the main language of the body text: script first, then common words for Latin-script languages. */
export function detectLanguage(text, limits = CONSISTENCY_LIMITS) {
  const sample = String(text || '').slice(0, limits.languageCharacters);
  const letters = sample.match(/\p{L}/gu) || [];
  if (letters.length < 200) return null;
  for (const [code, pattern, accepts] of SCRIPTS) {
    const share = letters.filter(letter => pattern.test(letter)).length / letters.length;
    if (share >= 0.6) return { code, accepts, name: NAMES[code], method: 'script' };
  }
  const counts = new Map();
  for (const word of sample.toLocaleLowerCase().match(/\p{L}+/gu) || []) counts.set(word, (counts.get(word) || 0) + 1);
  const scores = Object.entries(STOPWORDS).map(([code, list]) => [code, list.split(' ').reduce((sum, word) => sum + (counts.get(word) || 0), 0)])
    .sort((a, b) => b[1] - a[1]);
  const [[code, top], [, second]] = scores;
  if (top < limits.languageMinHits || top < second * 1.8) return null;
  return { code, accepts: [code], name: NAMES[code], method: 'common-words', hits: top };
}

function languageConsistency(report, limits) {
  const declared = report.metadata?.language;
  if (!declared) return [];
  const primary = String(declared).toLowerCase().split(/[-_]/)[0];
  const detected = detectLanguage((report.pages || []).slice(0, 40).map(pageText).join(' '), limits);
  if (!detected || detected.accepts.includes(primary)) return [];
  return [{ id: 'language:declared', kind: 'language', severity: 'concern', declared, detected }];
}
const latinShare = text => { const letters = String(text || '').match(/\p{L}/gu) || []; return letters.length ? letters.filter(l => /\p{Script=Latin}/u.test(l)).length / letters.length : null; };
/** A saved title in Latin script on a document written in another script, or the reverse: often a title left over from a template. */
function titleScript(report, limits) {
  const title = report.metadataConsistency?.title;
  const share = latinShare(title);
  if (share == null || (title.match(/\p{L}/gu) || []).length < 8) return [];
  const detected = detectLanguage((report.pages || []).slice(0, 40).map(pageText).join(' '), limits);
  if (!detected) return [];
  const bodyLatin = detected.method === 'common-words';
  if (bodyLatin ? share > 0.2 : share < 0.8) return [];
  return [{ id: 'language:title', kind: 'title-language', severity: 'concern', value: title, detected }];
}

/** A saved title that is a number, a file name or a template default rather than a publication title. */
function placeholderTitle(report) {
  const title = report.metadataConsistency?.title?.trim();
  return Boolean(title && (/^[\d\s._-]+$/.test(title) || /^[^\s]+[_-][^\s]+$/.test(title) ||
    /\.(docx?|indd|pptx?|xlsx?|pdf|ai|psd|qxp)$/i.test(title) || /^(untitled|document\d*|presentation\d*|title|slide \d+)$/i.test(title) || /^microsoft (word|powerpoint|excel) - /i.test(title)));
}
/** Saved values that look like file names, internal IDs or template leftovers. */
function placeholderMetadata(report) {
  const metadata = report.metadata || {};
  const items = [];
  const title = report.metadataConsistency?.title?.trim();
  if (placeholderTitle(report)) items.push({ id: 'placeholder:title', kind: 'title', severity: 'concern', value: title });
  const keywords = typeof metadata.keywords === 'string' ? metadata.keywords.split(/[,;\n]/).map(s => s.trim()).filter(Boolean) : [];
  const ids = keywords.filter(term => /\bdoc(?:ument)?id\s*:/i.test(term) || /^\d+$/.test(term) ||
    (/^[A-Za-z0-9_-]{8,}$/.test(term) && /\d/.test(term) && /[A-Z]/.test(term) && /[a-z]/.test(term)));
  if (ids.length) items.push({ id: 'placeholder:keywords', kind: 'keywords', severity: 'concern', value: metadata.keywords, terms: ids });
  const subject = String(metadata.subject || '').trim();
  if (subject && /^(?:https?:\/\/|doi:|www\.)\S+$/i.test(subject)) items.push({ id: 'placeholder:subject', kind: 'subject-link', severity: 'minor', value: subject });
  return items;
}

// A caption, not a sentence that mentions a figure: the number is followed by punctuation or ends the text.
const CAPTION = /^\s*(figure|fig\.|map|chart|graph|diagram|infographic)\s*\d+(?:\.\d+)*\s*(?:[.:–—-]|$)/i;
/** Large drawings marked as decoration on a page that also carries a figure, map or table caption or a "Source:" line. */
function decorativeContent(report, limits) {
  const figures = report.figureAlternatives?.items || [];
  const items = [];
  for (const page of report.pages || []) {
    const extent = page.decorativeExtent;
    if (!extent) continue;
    const captions = (page.blocks || []).filter(block => CAPTION.test(block.text) && block.text.length <= 240);
    const source = (page.blocks || []).find(block => /^\s*sources?\s*:/i.test(block.text));
    // A large decorative image beside a caption or source line, or many decorative drawing operations beside a figure caption.
    // Table borders are legitimately decorative, so table captions never count.
    const image = extent.largestImage >= limits.decorativeImageShare && (captions.length || source);
    const drawing = extent.paths >= limits.decorativePaths && captions.length;
    if (!image && !drawing) continue;
    const tagged = figures.filter(item => item.page === page.number && item.tagged).length;
    // A labelled figure on the same page may own the caption; then only a very large decorative drawing is suspicious.
    if (tagged && !(extent.largestImage >= 0.25 || extent.paths >= limits.decorativePaths * 4)) continue;
    items.push({ id: `decorative:${page.number}`, kind: 'decorative', severity: 'concern', page: page.number, extent, tagged,
      captions: captions.slice(0, 3).map(block => ({ page: page.number, blockIds: [block.id], text: block.text.trim().slice(0, 160) })),
      source: source ? { page: page.number, blockIds: [source.id], text: source.text.trim().slice(0, 160) } : null,
      quads: (page.decorativeGraphics || []).map(graphic => graphic.quad).filter(Boolean).slice(0, 16) });
    if (items.length >= limits.decorativePages) break;
  }
  return items;
}

export function inspectConsistency(report, limits = CONSISTENCY_LIMITS) {
  const names = nameConsistency(report, limits);
  const items = [...names.items, ...dateConsistency(report, names.running, limits), ...languageConsistency(report, limits), ...titleScript(report, limits),
    ...placeholderMetadata(report), ...decorativeContent(report, limits)];
  return { status: items.some(item => item.severity === 'concern') ? 'requires-review' : items.length ? 'minor' : 'consistent',
    method: 'consistency-rules-v1', names: { cover: names.cover, saved: names.saved, running: names.running }, items };
}
