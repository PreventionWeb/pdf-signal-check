// Export the complete current script for human editing. Run explicitly; builds never overwrite review edits.
import { createServer } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
import { storyScript } from '../src/story/script.js';
const root = new URL('../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root)));
const data = read('src/story/snapshot.json');
const playback = read('src/story/playback.json');
const words = storyScript(data);
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
let scenes;
try { scenes = (await server.ssrLoadModule('/src/story/scenes.jsx')).scenes(data); }
finally { await server.close(); }
if (words.map(scene => scene.id).join() !== playback.timeline.map(scene => scene.id).join()) {
  throw new Error('Rebuild the soundtrack before exporting cue times.');
}
let markdown = '# Full animation script: Your report says it. But can everyone understand it?\n\n';
markdown += `Integrated script — ${new Date().toISOString().slice(0, 10)}. Current runtime: ${playback.duration.toFixed(2)} seconds (about ${(playback.duration / 60).toFixed(1)} minutes).\n\n`;
markdown += 'Narration, captions and visuals below match the current animation. Edit this file freely for the next review; builds never overwrite it. The source is `src/story/script.js`, and recorded narration follows its spoken-number variants.\n\n';
markdown += 'The fictional report is *Harbor Observatory Annual Report 2025*. Evidence comes from several synthetic sample PDFs; the closing deliberately says “problems like these”. Search results and the possible AI answer are illustrations of risks, not captured outputs. The 3–4–1–2 example is the method-step order, not chart labels.\n';
for (const [index, scene] of scenes.entries()) {
  const cue = playback.timeline[index];
  if (scene.chapter) markdown += `\n## Chapter ${scene.chapter.number}: ${scene.chapter.title}\n`;
  markdown += `\n### ${index + 1}. ${scene.label}\n\n**Timing:** ${cue.start.toFixed(2)}–${(cue.start + cue.duration).toFixed(2)} seconds (${cue.duration.toFixed(2)} seconds).\n\n`;
  markdown += `**Caption**\n\n${scene.caption.replace(/\[([^|\]]+)\|[^\]]+\]/g, '**$1**')}\n\n`;
  markdown += `**Narration**\n\n${scene.narration}\n\n**Visuals**\n\n${scene.describe}\n\n**Your edits / notes**\n\n<!-- Add edits here. -->\n`;
}
writeFileSync(new URL('docs/story-full-script.md', root), markdown);
console.log('Wrote docs/story-full-script.md');
