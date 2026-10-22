// Explicit invocation consents to ~213 MB pinned model/tokenizer assets plus runtime.
// No production entry, remote inference, PDFs, or public corpus inputs.
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const args = process.argv.slice(2).filter(arg => arg !== '--tiled');
const tiled = process.argv.includes('--tiled');
const device = args[0];
if (!['wasm', 'webgpu'].includes(device) || args.length > 2) throw new Error('Usage: node scripts/vlm-spike/run.mjs wasm|webgpu [local-output.json] [--tiled]');
const output = resolve(args[1] || `dev-corpus/vlm-spike/${device}.json`);
const root = fileURLToPath(new URL('../../', import.meta.url));
const session = `vlm-spike-${process.pid}`;
const call = (command, input) => new Promise((done, fail) => {
  // Keep Vite's server responsive while the browser requests local modules.
  const child = spawn('agent-browser', ['--session', session, ...(device === 'webgpu' ? ['--webgpu'] : []), ...command], { timeout: 60000 });
  let stdout = '', stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
  child.on('error', fail); child.on('close', code => code === 0 ? done(stdout.trim()) : fail(new Error(stderr || stdout || `Browser exited ${code}`)));
  child.stdin.end(input);
});
const server = await createServer({ root, configFile: false, server: { host: '127.0.0.1', port: 0 }, plugins: [{
  name: 'isolated-spike-page', configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url !== '/') return next();
      res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><title>Local VLM spike</title><p>Developer inference only. No PDF loaded.</p>');
    });
  },
}] });
let receipt = { state: 'error', rows: [], error: 'Harness did not complete.' };
let interrupted = false;
const interrupt = () => { interrupted = true; };
process.once('SIGINT', interrupt); process.once('SIGTERM', interrupt);
try {
  await server.listen();
  const base = server.resolvedUrls.local[0];
  await call(['open', base]);
  let browser = JSON.parse(await call(['eval', 'JSON.stringify({userAgent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency,webgpu:!!navigator.gpu})']));
  if (typeof browser === 'string') browser = JSON.parse(browser);
  if (device === 'webgpu') browser.adapter = JSON.parse(await call(['eval', '(async()=>{const a=await navigator.gpu?.requestAdapter();if(!a)return null;const i=a.info;return {vendor:i.vendor,architecture:i.architecture,device:i.device,description:i.description,isFallbackAdapter:i.isFallbackAdapter}})()']));
  await call(['eval', '--stdin'], `import('/scripts/vlm-spike/entry.js').then(m=>m.start(${JSON.stringify({ device, tiled })})).catch(e=>window.__vlm={state:'error',error:e.message,rows:[]});`);
  const deadline = Date.now() + 15 * 60 * 1000;
  let lastProgress = '';
  while (!interrupted && Date.now() < deadline) {
    await new Promise(done => setTimeout(done, 2000));
    let state = JSON.parse(await call(['eval', 'JSON.stringify(window.__vlm || {state:"starting",rows:[]})']));
    if (typeof state === 'string') state = JSON.parse(state);
    receipt = { ...state, observation: { observedAt: new Date().toISOString(), browser, device,
      transformers: '4.3.0', cacheSource: 'unknown', transferBytes: null, peakMemoryBytes: null,
      note: 'Synthetic smoke run; no real-corpus accuracy or production suitability established.' } };
    await mkdir(dirname(output), { recursive: true }); await writeFile(output, JSON.stringify(receipt, null, 2) + '\n');
    const progress = JSON.stringify({ state: state.state, completed: state.rows?.length, event: state.events?.at(-1) });
    if (progress !== lastProgress) { console.log(progress); lastProgress = progress; }
    if (state.state === 'error') throw new Error(state.error);
    if (state.state === 'done') { console.log(`Saved ${output}`); break; }
  }
  if (receipt.state !== 'done') throw new Error(interrupted ? 'Run interrupted; receipt is incomplete.' : 'Fifteen-minute deadline exceeded; receipt is incomplete.');
} catch (error) {
  receipt = { ...receipt, state: 'error', error: error.message };
  await mkdir(dirname(output), { recursive: true }); await writeFile(output, JSON.stringify(receipt, null, 2) + '\n');
  throw error;
} finally {
  try { await call(['eval', 'window.__stopVlm?.()']); await call(['close']); } catch { /* Closing also terminates the worker. */ }
  await server.close();
  process.removeListener('SIGINT', interrupt); process.removeListener('SIGTERM', interrupt);
}
