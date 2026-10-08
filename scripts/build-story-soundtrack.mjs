// Local assembly only. No API, key, or paid generation. Run after changing clips or scene cues.
import { createServer } from 'vite';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { buildTimeline, timelineDuration } from '../src/story/timeline.js';
const root = new URL('../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root)));
const narration = read('src/story/narration.json');
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
let scenes;
try { scenes = (await server.ssrLoadModule('/src/story/scenes.jsx')).scenes(read('src/story/snapshot.json')); }
finally { await server.close(); }
const timeline = buildTimeline(scenes, narration.clips, renderToStaticMarkup);
const duration = timelineDuration(timeline);
const args = ['-y', '-loglevel', 'error'];
for (const clip of narration.clips) args.push('-i', new URL(`public/story/audio/${clip.file}`, root).pathname);
args.push('-i', new URL(`public/story/audio/${narration.music.file}`, root).pathname);
const graph = timeline.map((scene, i) => `[${i}:a]aresample=24000,apad,atrim=duration=${scene.duration},asetpts=PTS-STARTPTS[c${i}]`);
graph.push(`${timeline.map((_, i) => `[c${i}]`).join('')}concat=n=${timeline.length}:v=0:a=1[voice]`);
// Ducking is mixed once, so two live media elements can never drift apart.
graph.push('[voice]asplit=2[spoken][sidechain]');
if (duration > narration.music.duration) {
  // Extend the existing bed with an overlap, instead of restarting it or letting it end before the film.
  graph.push(`[${timeline.length}:a]aresample=24000,asplit=2[bed1][bed2]`);
  graph.push(`[bed1][bed2]acrossfade=d=8:c1=tri:c2=tri,atrim=duration=${duration},afade=t=out:st=${duration - 3}:d=3,volume=${narration.music.level}[bed]`);
} else {
  graph.push(`[${timeline.length}:a]aresample=24000,volume=${narration.music.level}[bed]`);
}
graph.push('[bed][sidechain]sidechaincompress=threshold=0.025:ratio=4:attack=30:release=500[ducked]');
graph.push('[spoken][ducked]amix=inputs=2:normalize=0,alimiter=limit=0.89:level=0[mix]');
// Keep the longer chaptered cut within the existing 1 MB playback download contract.
const bitrateKbps = duration <= 164 ? 48 : 40;
const file = 'soundtrack.mp3';
args.push('-filter_complex', graph.join(';'), '-map', '[mix]', '-t', String(duration), '-ac', '1', '-ar', '24000', '-b:a', `${bitrateKbps}k`, new URL(`public/story/audio/${file}`, root).pathname);
execFileSync('ffmpeg', args);
const inputs = [...narration.clips.map(clip => clip.file), narration.music.file].map(file => ({ file,
  sha256: createHash('sha256').update(readFileSync(new URL(`public/story/audio/${file}`, root))).digest('hex') }));
const sha256 = createHash('sha256').update(readFileSync(new URL(`public/story/audio/${file}`, root))).digest('hex');
writeFileSync(new URL('src/story/playback.json', root), JSON.stringify({ file, duration, bitrateKbps, timeline, inputs, sha256 }, null, 2) + '\n');
console.log(`Built ${file}: ${duration.toFixed(2)} seconds, ${bitrateKbps} kbit/s, one playback clock.`);
