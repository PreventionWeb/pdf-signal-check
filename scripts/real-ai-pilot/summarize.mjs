// Aggregate only. Detailed case identities and text remain in ignored local artifacts.
import { readFile, writeFile } from 'node:fs/promises';
import { localDirectory, fingerprint, sameFingerprint } from './local.mjs';
const directory = await localDirectory(process.argv[2]), read = async name => JSON.parse(await readFile(`${directory}/${name}`));
const seal = await read('seal.json');
if (!sameFingerprint(seal.files, await fingerprint(directory))) throw new Error('Frozen inputs changed.');
const inventory = await read('inventory.json'), cases = await read('cases-labelled.json'), photos = await read('photos-labelled.json');
const spread = (values, budget) => values.length <= budget ? values : Array.from({ length: budget }, (_, i) => values[Math.floor(i * values.length / budget)]);
const totals = rows => ({ candidates: rows.length, inferred: rows.filter(r => r.inferred).length,
  notRun: rows.filter(r => !r.inferred).length, abstentionsAfterInference: rows.filter(r => r.inferred && r.outcome === 'uncertain').length,
  supportLabels: rows.filter(r => r.expected === 'support').length, mismatchLabels: rows.filter(r => r.expected === 'mismatch').length, uncertainLabels: rows.filter(r => r.expected === 'uncertain').length,
  concerns: rows.filter(r => r.flag).length, trueConcerns: rows.filter(r => r.flag && r.expected === 'mismatch').length,
  falseFlags: rows.filter(r => r.flag && r.expected === 'support').length, concernsOnUncertainInputs: rows.filter(r => r.flag && r.expected === 'uncertain').length,
  explicitSupportOnMismatch: rows.filter(r => r.expected === 'mismatch' && r.outcome === 'semantically-related').length });
const summary = { schemaVersion: 1, sourceVersions: inventory.length, pages: inventory.reduce((n, s) => n + s.coverage.pages, 0), inputCoverage: Object.fromEntries(['sections', 'facts', 'figurePairs', 'contents', 'names', 'savedDescriptions', 'photoCandidates', 'graphicCandidates'].map(key => [key, inventory.reduce((n, s) => n + s.coverage[key], 0)])), text: {}, photos: null };
for (const model of ['minilm', 'granite-r2']) {
  const run = await read(`${model}-observed.json`), rows = [];
  for (const c of cases) {
    const semantic = run.outputs.find(r => r.sourceId === c.sourceId)?.semantic, source = inventory.find(s => s.id === c.sourceId);
    if (!semantic) throw new Error('Missing completed document.');
    let assessment;
    if (c.field === 'section') assessment = semantic.sectionItems.find(item => item.heading.key === c.input.sections[0].heading.key);
    if (c.field === 'name') assessment = semantic.nameItems.find(item => item.nameId === c.targetId);
    if (c.field === 'fact') {
      const selected = spread(source.q.facts, semantic.model.budget.facts);
      const inferred = semantic.inferencePerformed && c.input.facts.every(f => selected.some(s => s.text === f.text && s.page === f.page));
      const pair = semantic.factPairs.find(p => [p.a.text, p.b.text].every(t => c.input.facts.some(f => f.text === t)));
      assessment = { inferencePerformed: inferred, status: inferred ? pair ? 'suspected-mismatch' : 'no-flag' : 'unassessed' };
    }
    const outcome = assessment?.status || 'unassessed';
    rows.push({ id: c.id, task: c.field, expected: c.expected, inferred: assessment?.inferencePerformed === true, outcome, flag: outcome === 'suspected-mismatch' });
  }
  await writeFile(`${directory}/${model}-labelled-outcomes.json`, JSON.stringify(rows, null, 2));
  summary.text[model] = { ...totals(rows), tasks: Object.fromEntries(['section', 'name', 'fact'].map(task => [task, totals(rows.filter(r => r.task === task))])),
    documentRuns: run.outputs.length, documentsInferred: run.outputs.filter(r => r.semantic.inferencePerformed).length,
    sectionsInferred: run.outputs.reduce((n, r) => n + r.semantic.sectionItems.length, 0),
    sectionConcernsInEntireWorkload: run.outputs.reduce((n, r) => n + r.semantic.sectionItems.filter(i => i.status === 'suspected-mismatch').length, 0),
    factsCompared: run.outputs.reduce((n, r) => n + (r.semantic.factCoverage?.compared || 0), 0),
    numericConcernsInEntireWorkload: run.outputs.reduce((n, r) => n + r.semantic.factPairs.length, 0),
    truncatedInputs: run.outputs.reduce((n, r) => n + r.semantic.inferenceProvenance.filter(i => i.truncated).length, 0) };
}
const clip = await read('clip-observed.json'), photoRows = photos.map(p => { const row = clip.outputs.find(r => r.sourceId === p.sourceId)?.imageScreening.descriptions.find(r => r.id === p.id); return { expected: p.expected, inferred: Boolean(row), outcome: row ? row.mismatch ? 'suspected-mismatch' : 'no-flag' : 'unassessed', flag: row?.mismatch === true }; });
summary.photos = { ...totals(photoRows), encoded: clip.outputs.reduce((n, r) => n + r.imageScreening.execution.encodedCrops, 0),
  usable: clip.outputs.reduce((n, r) => n + r.imageScreening.execution.usableDescriptions, 0),
  truncatedDescriptions: clip.outputs.reduce((n, r) => n + r.imageScreening.descriptionInputs.filter(i => i.truncated).length, 0),
  noMismatchExamples: !photos.some(p => p.expected === 'mismatch'), precisionAt5: null, recall: null };
summary.photos.compared = summary.photos.inferred; summary.photos.notCompared = summary.photos.notRun;
delete summary.photos.inferred; delete summary.photos.notRun;
await writeFile(`${directory}/aggregate.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
