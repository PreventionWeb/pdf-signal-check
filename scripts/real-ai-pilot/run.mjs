// Explicit developer opt-in to asset downloads and local inference. No PDF evidence leaves this device.
import { readFile, writeFile, readdir, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { localDirectory, fingerprint, sameFingerprint } from './local.mjs';
const model = process.argv[2], directory = await localDirectory(process.argv[3]);
if (!['minilm', 'granite-r2', 'clip'].includes(model)) throw new Error('Choose minilm, granite-r2 or clip.');
const base = process.env.PILOT_URL || 'http://127.0.0.1:4178/';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname)) throw new Error('Only a loopback preview is allowed.');
try { await access(`${directory}/${model}-observed.json`); throw new Error('Completed output already exists; refuse to rerun or overwrite.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const seal = JSON.parse(await readFile(`${directory}/seal.json`));
if (!sameFingerprint(seal.files, await fingerprint(directory))) throw new Error('Inputs changed after blind review; refuse inference.');
const inventory = JSON.parse(await readFile(`${directory}/inventory.json`));
const photos = JSON.parse(await readFile(`${directory}/photos-labelled.json`));
const assets = await readdir('dist/assets'), pattern = model === 'clip' ? /^image\.worker-.*\.js$/ : /^model\.worker-.*\.js$/;
const asset = assets.find(name => pattern.test(name));
if (!asset) throw new Error('Build before running.');
const session = `psc-real-pilot-${model}-${process.pid}`;
const call = (args, input) => { const result = spawnSync('agent-browser', ['--session', session, ...args], { input, encoding: 'utf8', timeout: 60000, maxBuffer: 32 * 1024 * 1024 }); if (result.status !== 0) throw new Error(result.stderr || result.stdout); return result.stdout.trim(); };
const outputs = [];
try {
  call(['open', base]);
  for (const source of inventory) {
    let request = { ...source.q, modelId: model, requestId: outputs.length + 1 };
    if (model === 'clip') {
      const selected = photos.filter(row => row.sourceId === source.id && row.cropPath);
      if (!selected.length) continue;
      const descriptions = [];
      for (const item of selected) descriptions.push({ id: item.id, page: item.page, alt: item.alt, png: (await readFile(item.cropPath)).toString('base64') });
      request = { requestId: outputs.length + 1, items: [], descriptions };
    }
    const code = `(()=>{window.__pilot={state:'running'};window.__worker=new Worker(${JSON.stringify(new URL(`assets/${asset}`, base).href)},{type:'module'});__worker.onmessage=({data})=>{if(data.type==='progress')window.__pilotProgress=data.message;if(data.type==='result')__pilot={state:'done',data};if(data.type==='error')__pilot={state:'error',error:data.message};};__worker.onerror=e=>__pilot={state:'error',error:e.message};const request=${JSON.stringify(request)};for(const item of request.descriptions||[]){const bytes=Uint8Array.from(atob(item.png),c=>c.charCodeAt(0));item.blob=new Blob([bytes],{type:'image/png'});delete item.png;}__worker.postMessage(request);})();`;
    call(['eval', '--stdin'], code);
    const deadline = Date.now() + 15 * 60 * 1000; let output;
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const raw = JSON.parse(call(['eval', 'JSON.stringify(window.__pilot)'])), state = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (state.state === 'error') throw new Error(state.error);
      if (state.state === 'done') { output = state.data; break; }
    }
    if (!output) throw new Error('Deadline exceeded; no partial success claimed.');
    outputs.push({ sourceId: source.id, ...output });
    await writeFile(`${directory}/${model}-partial.json`, JSON.stringify({ complete: false, sealedAt: seal.sealedAt, outputs }, null, 2));
    call(['eval', '__worker.terminate();delete window.__worker;delete window.__pilot;']);
    console.log(`Completed local document ${outputs.length} (${model}).`);
  }
  await writeFile(`${directory}/${model}-observed.json`, JSON.stringify({ observedAt: new Date().toISOString(), sealedAt: seal.sealedAt, backend: 'browser WASM', fullDocumentRequests: model !== 'clip', cropBackend: model === 'clip' ? 'PDF.js Node canvas; production geometry and render-budget helpers' : null, outputs }, null, 2), { flag: 'wx' });
} finally { try { call(['close']); } catch {} }
