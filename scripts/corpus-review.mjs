// Development review of a local, never-committed corpus of real PDFs (default: dev-corpus/).
// Runs the same engine, findings and review grouping as the app (rules only; no AI), prints each
// headline with its Fix/Check cards, and compares consistency findings with labelled expectations.
//
//   node scripts/corpus-review.mjs                  all PDFs in dev-corpus/pdfs
//   node scripts/corpus-review.mjs --only GAR       files whose name contains "GAR"
//   node scripts/corpus-review.mjs --write-results  also write dev-corpus/results/<file>.json
//
// dev-corpus/expectations.json: { "<file name>": { "expect": [{ "kind": "decorative", "severity": "concern", "count": 19, "note": "…" }],
//   "forbid": [{ "kind": "year" }] } }. "count" is optional (exact). Files without an entry are reported, not judged.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { analyzePdf } from '../src/engine/analyze.js';
import { normalizeFindings } from '../src/review/findings.js';
import { reviewGroups, reviewSummary, fixCard, reviewPriority } from '../src/review/workspace.js';

const root = new URL('../dev-corpus/', import.meta.url);
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const writeResults = args.includes('--write-results');
const expectations = existsSync(new URL('expectations.json', root)) ? JSON.parse(await readFile(new URL('expectations.json', root), 'utf8')) : {};
const files = (await readdir(new URL('pdfs/', root))).filter(name => name.toLowerCase().endsWith('.pdf') && (!only || name.includes(only))).sort();
// PDF.js prints font warnings to the console; keep the review readable.
const warn = console.warn; console.warn = () => {}; const log = console.log;
console.log = (...parts) => { if (!String(parts[0]).startsWith('Warning')) log(...parts); };

let failures = 0;
for (const name of files) {
  const started = performance.now();
  const report = await analyzePdf(new Uint8Array(await readFile(new URL(`pdfs/${name}`, root))), { fileName: name });
  const summary = reviewSummary(report, reviewGroups(normalizeFindings(report).findings));
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  log(`\n== ${name} (${report.file.pages ?? '?'} pages, ${seconds}s): ${summary.headline}`);
  for (const [bucket, items] of [['Fix', summary.buckets.fix], ['Check', summary.buckets.check], ["Couldn't check", summary.buckets.unknown]])
    for (const item of items) log(`   ${bucket.padEnd(14)} ${reviewPriority(item).label.padEnd(18)} ${fixCard(item, report).title}`);
  const items = report.consistency?.items || [];
  const rule = expectations[name];
  if (rule) {
    const problems = [];
    for (const want of rule.expect || []) {
      const found = items.filter(item => item.kind === want.kind && (!want.severity || item.severity === want.severity));
      if (!found.length || (want.count != null && found.length !== want.count)) problems.push(`expected ${want.count ?? '≥1'} × ${want.kind}${want.severity ? `/${want.severity}` : ''}, found ${found.length}`);
    }
    for (const banned of rule.forbid || []) if (items.some(item => item.kind === banned.kind)) problems.push(`unexpected ${banned.kind}`);
    const known = new Set([...(rule.expect || []), ...(rule.allow || [])].map(entry => entry.kind));
    const unlabelled = [...new Set(items.filter(item => !known.has(item.kind)).map(item => `${item.kind}/${item.severity}`))];
    if (unlabelled.length) problems.push(`not labelled yet: ${unlabelled.join(', ')}`);
    failures += problems.some(problem => !problem.startsWith('not labelled')) ? 1 : 0;
    log(problems.length ? problems.map(problem => `   !! ${problem}`).join('\n') : '   ok: consistency findings match expectations');
  } else log(`   (no expectations) consistency: ${items.map(item => `${item.kind}/${item.severity}`).join(', ') || 'none'}`);
  if (writeResults) {
    await mkdir(new URL('results/', root), { recursive: true });
    await writeFile(new URL(`results/${name}.json`, root), JSON.stringify({ headline: summary.headline, analysisComplete: report.analysisComplete,
      consistency: report.consistency, checks: report.checks }, null, 1));
  }
}
console.warn = warn;
log(`\n${files.length} files, ${failures} with unmet expectations.`);
process.exitCode = failures ? 1 : 0;
