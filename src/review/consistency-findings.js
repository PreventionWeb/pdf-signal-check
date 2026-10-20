/**
 * Normalize consistency advisories into findings. Severity is carried through: 'minor' items stay in Check but rank last.
 * Name pairs the rules left open use a completed AI comparison when one is recorded, otherwise they stay undecided.
 */
const ROLE = { saved: 'saved title', cover: 'cover', running: 'page header or footer' };
export const roleLabel = role => ROLE[role] || role;

/** The recorded AI outcome for an unresolved name pair, if the model actually compared it. */
function aiOutcome(report, item) {
  const semantic = report.semantic;
  if (semantic?.inferencePerformed !== true) return null;
  const result = item.kind === 'contents-wording' ? (semantic.contentItems || []).find(entry => entry.contentsId === item.id)
    : (semantic.nameItems || []).find(entry => entry.nameId === item.id);
  return result?.inferencePerformed === true ? result : null;
}
const sentenceEvidence = sentence => ({ page: sentence.page, blockIds: sentence.blockIds || [], text: sentence.text });

const nameEvidence = name => name.role === 'cover' ? name.blockIds?.length || name.keys?.length ? [{ page: 1, blockIds: name.blockIds || [], keys: name.keys || [], text: name.text }] : [`Cover: ${name.text}`]
  : name.role === 'running' ? [`Page header or footer on ${name.pages.length} pages (${name.pages.slice(0, 8).join(', ')}${name.pages.length > 8 ? ', …' : ''}): ${name.text}`]
    : [`Saved title: ${name.text}`];

const TITLES = { 'contents-page': item => `Contents: ${item.entry.text}`, 'contents-conflict': item => `Contents: ${item.entry.text}`,
  'contents-wording': item => `Contents: ${item.entry.text}`, 'same-fact': () => 'Same figure given differently', decorative: item => `Page ${item.page}: graphic marked as decoration`, draft: () => 'Draft label', leftovers: () => 'Leftover placeholder text',
  stale: () => 'Figures older than the first-page date', language: () => 'Declared language', 'title-language': () => 'Saved title language',
  title: () => 'Placeholder saved title', keywords: () => 'Keywords with internal codes', 'subject-link': () => 'Description is only a link' };
export function addConsistencyFindings(report, add) {
  const consistency = report.consistency;
  if (!consistency?.items) return;
  for (const item of consistency.items) {
    const base = { id: `consistency:${item.id}`, source: { path: `consistency.${item.id}` }, kind: 'consistency', outcome: item.severity,
      method: 'consistency-rules', comparison: { consistency: item } };
    if (item.left) {
      const ai = item.severity === 'unresolved' ? aiOutcome(report, item) : null;
      const severity = !ai ? item.severity : ai.status === 'semantically-related' ? 'minor' : ai.status === 'suspected-mismatch' ? 'concern' : 'unresolved';
      add({ ...base, title: 'Title written differently', outcome: ai?.status || item.severity, severity: severity === 'unresolved' ? undefined : severity,
        category: severity === 'unresolved' ? 'uncertain' : 'advisory-concern', method: ai ? 'embedding-screening' : 'consistency-rules',
        summary: `The ${roleLabel(item.left.role)} reads “${item.left.text}” and the ${roleLabel(item.right.role)} reads “${item.right.text}”.`,
        evidence: [...nameEvidence(item.left), ...nameEvidence(item.right), ...(ai?.evidence?.[0] ? [`AI similarity: ${ai.evidence[0].similarity.toFixed(2)}`] : [])],
        comparison: { consistency: item, ai } });
      continue;
    }
    if (item.kind === 'contents-wording') {
      const ai = aiOutcome(report, item);
      const severity = !ai ? 'unresolved' : ai.status === 'semantically-related' ? 'minor' : ai.status === 'suspected-mismatch' ? 'concern' : 'unresolved';
      add({ ...base, title: TITLES[item.kind](item), outcome: ai?.status || 'unresolved', severity: severity === 'unresolved' ? undefined : severity,
        category: severity === 'unresolved' ? 'uncertain' : 'advisory-concern', method: ai ? 'embedding-screening' : 'consistency-rules',
        summary: '', evidence: [{ page: item.entry.contentsPage, blockIds: item.entry.blockIds, text: item.entry.text }, `Headings on page ${item.expected}: ${item.headings.join(' · ') || 'none recovered'}`],
        comparison: { consistency: item, ai } });
      continue;
    }
    const evidence = item.kind === 'contents-page' || item.kind === 'contents-conflict' ? [{ page: item.entry.contentsPage, blockIds: item.entry.blockIds, text: item.entry.text },
        ...(item.other ? [{ page: item.other.contentsPage, blockIds: item.other.blockIds, text: item.other.text }] : [])]
      : item.kind === 'same-fact' ? [sentenceEvidence(item.a), sentenceEvidence(item.b)]
      : item.kind === 'decorative' ? [{ page: item.page, quads: item.quads, text: 'Graphic marked as decoration' }, ...item.captions, ...(item.source ? [item.source] : [])]
      : item.evidence ? item.evidence.map(entry => ({ ...entry }))
        : item.kind === 'draft' ? item.blockIds?.length ? [{ page: item.pages[0], blockIds: item.blockIds, text: item.text || item.label }] : [`“${item.label}” on page ${item.pages.slice(0, 5).join(', ')}`]
          : item.value ? [`Saved value: ${item.value}`] : [];
    add({ ...base, title: TITLES[item.kind] ? TITLES[item.kind](item) : item.kind, category: 'advisory-concern', severity: item.severity, summary: '', evidence });
  }
  // Sentences the AI found to say the same thing with different numbers.
  const semantic = report.semantic;
  if (semantic?.inferencePerformed === true) for (const pair of semantic.factPairs || []) {
    if (!pair.inferencePerformed) continue;
    const item = { id: `fact:ai:${pair.a.page}:${pair.b.page}:${pair.values[0].a}:${pair.values[0].b}`, kind: 'same-fact', severity: 'concern', ...pair };
    add({ id: `consistency:${item.id}`, source: { path: `consistency.${item.id}` }, kind: 'consistency', outcome: 'suspected-mismatch', method: 'embedding-screening',
      title: TITLES['same-fact'](item), category: 'advisory-concern', severity: 'concern', summary: '', evidence: [sentenceEvidence(pair.a), sentenceEvidence(pair.b),
        `AI similarity: ${pair.similarity.toFixed(2)}`], comparison: { consistency: item, ai: { inferencePerformed: true, similarity: pair.similarity } } });
  }
}
