/**
 * Basic prompt-injection screening for text that readers cannot see but AI tools can read: invisible, tiny,
 * white or off-page text, document properties and image descriptions. Visible page text is not scanned, so a
 * document that discusses prompt injection openly is not flagged. Pattern matching is a screening heuristic:
 * it can miss reworded or encoded instructions and does not prove intent.
 */
export const HIDDEN_INSTRUCTION_LIMITS = Object.freeze({ maxMatches: 20, snippetCharacters: 220, maxScanCharacters: 200_000 });

const PATTERNS = [
  ['override', 'Tells an AI to ignore its instructions',
    /\b(?:ignore|disregard|forget|override|bypass)\b[^.!?\n]{0,40}?\b(?:all|any|previous|prior|above|earlier|preceding|other|your|the)\b[^.!?\n]{0,30}?\b(?:instructions?|prompts?|rules|directions|guidelines|context)\b/i],
  ['role', 'Addresses an AI system directly',
    /\b(?:you are (?:now )?(?:an?|the) (?:ai|assistant|language model|llm|chatbot|reviewer|grader)|as an? (?:ai|large language model|llm)\b|system prompt|new instructions?:)/i],
  ['template', 'Contains chat-model control markup',
    /<\|(?:im_start|im_end|system|user|assistant)\|>|\[\/?INST\]|<<\/?SYS>>|^\s*#{2,}\s*(?:system|instruction)s?\b/im],
  ['review', 'Asks for a favourable review, rating or ranking',
    /\b(?:give|write|provide|output|produce|return)\b[^.!?\n]{0,30}?\b(?:positive|favou?rable|glowing|excellent|high(?:est)?|perfect|top)\b[^.!?\n]{0,20}?\b(?:review|rating|score|grade|evaluation|assessment|recommendation)s?\b/i],
  ['select', 'Asks an AI to select or recommend this document or person',
    /\b(?:hire|shortlist|select|recommend|rank|prioriti[sz]e|accept|approve)\b[^.!?\n]{0,20}?\b(?:this|the)\s+(?:candidate|applicant|paper|document|submission|proposal|vendor|bid|report)\b/i],
  ['conceal', 'Asks an AI to hide or omit information',
    /\b(?:do not|don't|never)\b[^.!?\n]{0,25}?\b(?:mention|reveal|disclose|highlight|point out|report|tell)\b[^.!?\n]{0,40}?\b(?:weakness(?:es)?|flaws?|limitations?|negative|errors?|this (?:instruction|text|prompt|message))\b/i],
  ['respond', 'Dictates what an AI should answer',
    /\b(?:respond|reply|answer)\b[^.!?\n]{0,15}?\b(?:only|exclusively|always)\b[^.!?\n]{0,15}?\bwith\b|\b(?:summari[sz]e|describe)\b[^.!?\n]{0,25}?\b(?:this|the) (?:document|paper|report|pdf)\b[^.!?\n]{0,15}?\bas\b/i],
];

/** NFKC, zero-width characters removed and whitespace collapsed, so simple obfuscation does not hide a match. */
export const normalizeForScreening = text => String(text || '').normalize('NFKC').replace(/[​-‍⁠﻿­]/g, '').replace(/\s+/g, ' ').trim();

export function screenText(text) {
  const normalized = normalizeForScreening(text).slice(0, HIDDEN_INSTRUCTION_LIMITS.maxScanCharacters);
  const hits = [];
  for (const [id, label, pattern] of PATTERNS) {
    const match = pattern.exec(normalized);
    if (match) hits.push({ id, label, index: match.index, text: match[0] });
  }
  return { normalized, hits };
}

const snippetAround = (text, index, length) => {
  const room = HIDDEN_INSTRUCTION_LIMITS.snippetCharacters;
  const start = Math.max(0, Math.min(index - 40, text.length - room));
  const value = text.slice(start, start + Math.max(room, length));
  return `${start > 0 ? '…' : ''}${value}${start + value.length < text.length ? '…' : ''}`;
};

const HIDING = { invisible: 'invisible text', tiny: 'text too small to read', white: 'white or near-white text', offpage: 'text placed off the page' };
export const hidingLabel = reasons => reasons.map(reason => HIDING[reason] || reason).join(', ');

/** Screen every hidden channel; report each channel once, with every pattern it matched. */
export function inspectHiddenInstructions({ pages = [], metadata = {}, figures = [], attachments = [] } = {}) {
  const channels = [];
  for (const page of pages) {
    // Join runs that share a hiding method so instructions split across text operations still match.
    const byReason = new Map();
    for (const run of Array.isArray(page.hiddenText) ? page.hiddenText : []) {
      const key = run.reasons.join('+');
      if (!byReason.has(key)) byReason.set(key, []);
      byReason.get(key).push(run);
    }
    for (const runs of byReason.values()) channels.push({ kind: 'page', page: page.number, reasons: runs[0].reasons,
      text: runs.map(run => run.text).join(' '), quads: runs.flatMap(run => run.quad ? [run.quad] : []) });
  }
  const fields = [['Title', metadata.infoTitle], ...(metadata.xmpTitles || []).map(item => ['Title', item.text]), ['Description (Subject)', metadata.subject],
    ['Keywords', metadata.keywords], ['Author', metadata.author], ...(metadata.xmpAuthors || []).map(name => ['Author', name])];
  for (const [field, value] of fields) if (typeof value === 'string' && value.trim()) channels.push({ kind: 'property', field, text: value });
  for (const figure of figures) if (figure.alt?.trim()) channels.push({ kind: 'image-description', page: figure.page, text: figure.alt });
  for (const file of attachments) if (file.description?.trim()) channels.push({ kind: 'attachment-description', field: file.unicodeFilename || file.filename, text: file.description });
  const matches = [];
  for (const channel of channels) {
    const { normalized, hits } = screenText(channel.text);
    if (!hits.length || matches.length >= HIDDEN_INSTRUCTION_LIMITS.maxMatches) continue;
    const first = hits[0];
    matches.push({ kind: channel.kind, page: channel.page ?? null, field: channel.field ?? null, reasons: channel.reasons || [],
      patterns: hits.map(hit => hit.id), labels: hits.map(hit => hit.label), text: snippetAround(normalized, first.index, first.text.length), quads: channel.quads || [] });
  }
  const hiddenCharacters = pages.reduce((sum, page) => sum + (Array.isArray(page.hiddenText) ? page.hiddenText : []).reduce((n, run) => n + run.text.length, 0), 0);
  return matches.length
    ? { status: 'requires-review', reason: `${matches.length} hidden passage${matches.length === 1 ? '' : 's'} look${matches.length === 1 ? 's' : ''} like instructions to an AI system.`, matches, scanned: { channels: channels.length, hiddenCharacters } }
    : { status: 'none-detected', reason: 'No instruction-like text was found in hidden text, document properties or image descriptions. This basic check can miss reworded or encoded instructions.', matches: [], scanned: { channels: channels.length, hiddenCharacters } };
}
