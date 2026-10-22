// Run only after blind source-page review. Never replace a seal after observing results.
import { readFile, writeFile } from 'node:fs/promises';
import { localDirectory, fingerprint } from './local.mjs';
const directory = await localDirectory(process.argv[2]);
for (const name of ['cases-labelled.json', 'photos-labelled.json']) {
  const labels = JSON.parse(await readFile(`${directory}/${name}`));
  if (!labels.length || labels.some(row => !['support', 'mismatch', 'uncertain'].includes(row.expected) || !row.reviewNote)) throw new Error('Complete all blind labels and notes first.');
}
await writeFile(`${directory}/seal.json`, JSON.stringify({ sealedAt: new Date().toISOString(), files: await fingerprint(directory) }, null, 2), { flag: 'wx' });
console.log('Local inputs and blind labels sealed.');
