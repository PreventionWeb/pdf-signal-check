// Developer-only execution receipt smoke test. Invocation requests pinned CLIP assets (~154 MB plus runtime).
import { readdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const base = process.argv[2] || 'http://127.0.0.1:4178/';
const session = `image-smoke-${process.pid}`;
const call = (args, input) => {
  const r = spawnSync('agent-browser', ['--session', session, ...args], { input, encoding: 'utf8', timeout: 60000 });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
  return r.stdout.trim();
};
const worker = (await readdir(new URL('../dist/assets/', import.meta.url))).find(file => /^image\.worker-.*\.js$/.test(file));
if (!worker) throw new Error('Build before running this smoke test.');
try {
  call(['open', base]);
  call(['eval', '--stdin'], `window.__smoke={state:'running',results:[]};
    (async()=>{
      const worker=window.__smokeWorker=new Worker(${JSON.stringify(new URL(`assets/${worker}`, base).href)},{type:'module'});
      const request=(data)=>new Promise((resolve,reject)=>{
        worker.onmessage=({data:message})=>{if(message.type==='result')resolve(message.imageScreening);if(message.type==='error')reject(new Error(message.message));};
        worker.onerror=e=>reject(new Error(e.message));worker.postMessage(data);
      });
      const canvas=document.createElement('canvas');canvas.width=300;canvas.height=200;
      const context=canvas.getContext('2d');context.fillStyle='#066e74';context.fillRect(0,0,300,200);
      const panel=await new Promise(resolve=>canvas.toBlob(resolve));
      __smoke.results.push(await request({requestId:1,items:[],descriptions:Array.from({length:5},(_,i)=>({id:'panel-'+i,page:i+1,alt:'A plain coloured panel',blob:panel}))}));
      const illustration=await (await fetch(${JSON.stringify(new URL('story/images/reader.webp', base).href)})).blob();
      __smoke.results.push(await request({requestId:2,items:[],descriptions:Array.from({length:5},(_,i)=>({id:'reader-'+i,page:i+1,alt:'A person reading a report. '+('The reader studies the publication carefully. '.repeat(40)),blob:illustration}))}));
      __smoke.state='done';worker.terminate();
    })().catch(error=>{__smoke.state='error';__smoke.error=error.message});`);
  const deadline = Date.now() + 10 * 60 * 1000;
  let receipt;
  while (Date.now() < deadline) {
    await new Promise(done => setTimeout(done, 1500));
    let state = JSON.parse(call(['eval', 'JSON.stringify(window.__smoke)']));
    if (typeof state === 'string') state = JSON.parse(state);
    if (state.state === 'error') throw new Error(state.error);
    if (state.state === 'done') { receipt = state; break; }
  }
  if (!receipt) throw new Error('Image smoke deadline exceeded.');
  const [blank, photo] = receipt.results;
  if (blank.inferencePerformed || blank.judgmentsPerformed || blank.execution.textInputs !== 0 || blank.execution.encodedCrops !== 0) throw new Error('Blank-crop execution receipt is incorrect.');
  if (photo.execution.comparedDescriptions !== 5 || !photo.descriptionInputs.every(input => input.truncated && input.consumedTokens <= 77)) throw new Error('Description truncation receipt is incorrect.');
  receipt.observation = { observedAt: new Date().toISOString(), backend: 'browser WASM', note: 'Public synthetic assets; execution and token-scope smoke test only, not photo-description accuracy.' };
  await writeFile(new URL('../evaluation/clip-execution-smoke.json', import.meta.url), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt.results.map(result => result.execution), null, 2));
} finally {
  try { call(['eval', 'window.__smokeWorker?.terminate()']); call(['close']); } catch {}
}
