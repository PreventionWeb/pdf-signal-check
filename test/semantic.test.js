import { expect, it } from 'vitest';
import { assessSemantic, prepareSemanticInput } from '../src/engine/semantic.js';
const cover = text => ({ text, page: 1, source: 'cover text candidate', height: 24, maxHeight: 24, blockIds: [0] });
const input = (title, candidate) => ({ metadata: { infoTitle: title, language: 'en' }, candidates: [cover(candidate)] });
const similar = async texts => texts.map(() => [1, 0]);

it('keeps wrong years and editions suspicious despite perfect topic similarity', async () => {
  for (const [a, b] of [['Climate annual report 2025', 'Climate annual report 2026'], ['Widget handbook edition 2', 'Widget handbook edition 3']]) {
    const result = await assessSemantic(input(a, b), similar);
    expect(result.title.status).toBe('suspected-mismatch');
    expect(result.title.identityWarnings.length).toBeGreaterThan(0);
    expect(result.title.evidence[0].blockIds).toEqual([0]);
  }
});
it('preserves an existing Info/XMP conflict even when one title matches', async () => {
  const data = input('River flood risk', 'River flood risk');
  data.metadata.xmpTitles = [{ lang: 'x-default', text: 'Forest fire risk' }];
  expect((await assessSemantic(data, similar)).title.status).toBe('suspected-mismatch');
});
it('separates semantic relatedness from exact title identity', async () => {
  expect((await assessSemantic(input('River flood risk', 'Flood hazards along rivers'), similar)).title.status).toBe('semantically-related');
  expect((await assessSemantic(input('River flood risk', 'River flood risk'), similar)).title.status).toBe('match');
});
it('does not accept body paragraphs or later chapter headings as title evidence', async () => {
  const data = input('River flood risk', 'River flood risk');
  data.candidates = [{ ...cover('River flood risk'), source: 'tagged H2' }, { ...cover('River flood risk'), page: 3, source: 'tagged H1' }];
  let calls = 0;
  const result = await assessSemantic(data, async () => { calls++; return []; });
  expect(result.title.status).toBe('uncertain'); expect(calls).toBe(0);
  expect(result.inferencePerformed).toBe(false);
});
it('avoids inference without supported language or metadata evidence', async () => {
  for (const metadata of [{ language: 'de', infoTitle: 'Flood risk' }, { language: 'en' }, { infoTitle: 'Flood risk' }]) {
    let calls = 0;
    const result = await assessSemantic({ metadata, candidates: [cover('Flood hazards')] }, async () => { calls++; return []; });
    expect(result.title.status).toBe('uncertain'); expect(calls).toBe(0);
  }
});
it('reports a low-similarity mismatch and middle-range uncertainty with sourced evidence', async () => {
  const data = input('River flood risk', 'Aircraft maintenance guide');
  const result = await assessSemantic(data, async () => [[1, 0], [0, 1]]);
  expect(result.title.status).toBe('suspected-mismatch'); expect(result.title.evidence[0].page).toBe(1);
  expect((await assessSemantic(data, async () => [[1, 0], [0.5, Math.sqrt(0.75)]])).title.status).toBe('uncertain');
});
it('screens subject and keywords against bounded opening evidence, not title identity', async () => {
  const data = input('River flood risk', 'River flood risk');
  data.metadata.subject = 'Flood preparedness'; data.metadata.keywords = 'river, rainfall';
  data.openingEvidence = [{ page: 1, blockId: 2, key: '1:2', text: 'This report examines river flooding, rainfall, mitigation, and practical preparedness for communities along waterways.' }];
  const result = await assessSemantic(data, similar);
  expect(result.subject.status).toBe('semantically-related'); expect(result.keywords.status).toBe('semantically-related');
  expect(result.subject.evidence[0].blockIds).toEqual([2]); expect(result.subject.evidence[0].keys).toEqual(['1:2']);
  expect(result).not.toHaveProperty('accepted'); expect(result.model.calibrated).toBe(false);
});
it('bounds evidence and refuses malformed model output instead of manufacturing a result', async () => {
  const data = input('River flood risk', 'River flood risk');
  data.openingEvidence = Array.from({ length: 200 }, (_, i) => ({ page: i < 100 ? 1 : 3, blockId: i, text: 'A'.repeat(900) }));
  const prepared = prepareSemanticInput(data);
  expect(prepared.excerpts.length).toBeLessThanOrEqual(6);
  expect(prepared.excerpts.every(e => e.text.length <= 800 && e.page === 1)).toBe(true);
  data.metadata.infoTitle = 'Different uncertain title';
  await expect(assessSemantic(data, async () => [[1, 0]])).rejects.toThrow('incomplete');
});

it('excludes body-size cover lines even when they exactly match metadata', async () => {
  const data = input('River flood risk', 'River flood risk');
  data.candidates[0].height = 12; data.candidates[0].maxHeight = 24;
  let calls = 0; const result = await assessSemantic(data, async () => { calls++; return []; });
  expect(result.title.status).toBe('uncertain'); expect(calls).toBe(0);
});

it('uses multilingual registry coverage and preserves exact identity rules without inference', async () => {
  const data = input('Hafen Jahresbericht', 'Hafen Jahresbericht'); data.metadata.language='de-DE'; data.modelId='granite-r2'; data.checks=['title'];
  let calls=0; const result=await assessSemantic(data,async()=>{calls++;return[];});
  expect(result.title.status).toBe('match'); expect(result.title.method).toBe('deterministic-rules'); expect(calls).toBe(0);
  data.metadata.infoTitle='Hafen Bericht';
  const screened=await assessSemantic(data,similar); expect(screened.model.pooling).toBe('cls'); expect(screened.inferencePerformed).toBe(true);
  data.metadata.language='zz'; expect((await assessSemantic(data,similar)).inferencePerformed).toBe(false);
  data.modelId='missing-model'; await expect(assessSemantic(data,similar)).rejects.toThrow('Unknown semantic model');
});
it('screens each keyword so related terms cannot mask an unrelated term', async () => {
  const data=input('River flood risk','River flood risk'); data.checks=['keywords']; data.metadata.keywords='river flooding; extraterrestrial spacecraft';
  data.openingEvidence=[{page:1,key:'1:2',text:'River flooding and seasonal rainfall are reviewed in this detailed report about water preparedness and community responses.'}];
  const result=await assessSemantic(data,async texts=>texts.map(t=>t.includes('extraterrestrial')?[0,1]:[1,0]));
  expect(result.keywordItems.map(i=>i.status)).toEqual(['semantically-related','suspected-mismatch']);
  expect(result.keywords.status).toBe('suspected-mismatch'); expect(result.keywordCoverage.evaluatedTerms).toBe(2);
  expect(result.title.method).toBe('not-requested');
});
it('does not claim all terms related when keyword cap leaves unassessed metadata', async () => {
  const data=input('River flood risk','River flood risk'); data.checks=['keywords']; data.metadata.keywords=Array.from({length:15},(_,i)=>`keyword${i}`).join(';');
  data.openingEvidence=[{page:1,text:'A'.repeat(100)}]; const result=await assessSemantic(data,similar);
  expect(result.keywordCoverage).toMatchObject({totalTerms:15,evaluatedTerms:12,skippedTerms:3});
  expect(result.keywords.status).toBe('uncertain');
});
it('records token consumption and leaves headings without credible bounded body evidence unassessed', async () => {
  const data=input('River flood risk','River flood risk'); data.checks=['sections'];
  data.sections=[{heading:{role:'H2',text:'River flood planning',page:1,keys:['1:1']},body:{page:1,keys:['1:2'],text:'A'.repeat(100)}},
    {heading:{role:'P',text:'Not a heading',page:1},body:{page:1,keys:['1:3'],text:'B'.repeat(100)}}];
  const result=await assessSemantic(data,async texts=>({vectors:texts.map(()=>[1,0]),provenance:texts.map((t,i)=>({index:i,inputTokens:400,consumedTokens:256,truncated:true,consumedText:t.slice(0,80)}))}));
  expect(result.sectionItems).toHaveLength(1); expect(result.sectionItems[0].evidence[0].keys).toEqual(['1:2']);
  expect(result.sectionItems[0].evidence[0].modelInput.truncated).toBe(true); expect(result.sectionItems[0].queryInput.consumedTokens).toBe(256);
});
it('uses different provisional policies per model rather than pretending score equivalence', async () => {
  const data=input('River flood risk','Floods and rivers');data.checks=['title'];
  const fake=async()=>[[1,0],[0.8,0.6]];
  expect((await assessSemantic(data,fake)).title.status).toBe('semantically-related');
  expect((await assessSemantic({...data,modelId:'granite-r2'},fake)).title.status).toBe('uncertain');
});
