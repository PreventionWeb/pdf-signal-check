import { readFile, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export async function localDirectory(path = 'dev-corpus/real-evaluation') {
  const proposed = relative(resolve('dev-corpus'), resolve(path));
  if (!proposed || proposed.startsWith('..') || isAbsolute(proposed)) throw new Error('Pilot artifacts require a subdirectory of ignored dev-corpus.');
  const root = await realpath(resolve('dev-corpus')), directory = await realpath(resolve(path));
  const part = relative(root, directory);
  if (!part || part.startsWith('..') || isAbsolute(part)) throw new Error('Pilot artifacts require a subdirectory of ignored dev-corpus.');
  return directory;
}
export async function fingerprint(directory) {
  const names = ['protocol.json', 'inventory.json', 'cases-labelled.json', 'photos-labelled.json'];
  const files = {};
  for (const name of names) files[name] = digest(await readFile(`${directory}/${name}`));
  const sources = JSON.parse(await readFile(`${directory}/inventory.json`));
  for (const source of sources) {
    if (digest(await readFile(source.sourcePath)) !== source.sha256) throw new Error('A source PDF changed.');
    files[`report:${source.id}`] = digest(await readFile(source.reportPath));
  }
  const photos = JSON.parse(await readFile(`${directory}/photos-labelled.json`));
  for (const photo of photos) if (photo.cropPath) {
    const key = `crop:${photo.id}`;
    if (Object.hasOwn(files, key)) throw new Error('Duplicate crop identity; use unique identities in this pilot.');
    files[key] = digest(await readFile(photo.cropPath));
  }
  return files;
}
export function sameFingerprint(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
