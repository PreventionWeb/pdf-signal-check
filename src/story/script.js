// The words of the story: scene labels, captions and narration. Kept apart from the art so the narration
// generator (scripts/generate-story-narration.mjs) and the drift test can read them in plain Node.
// Captions mark key words as [word|colour]. `speak` is the TTS input when it differs from the displayed narration.

export const finding = data => (data.well.figureAlt || '').split('. ').pop().replace(/\.$/, '') || 'South is highest';
export const stepNumber = text => text.match(/^(\d)/)?.[1];
export const yearOf = text => text?.match(/(19|20)\d\d/)?.[0];
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
/** "+0.7 m" → "plus zero point seven metres", so the voice says the number the way a person would. */
export const spokenMeasure = text => text.replace(/^\+/, 'plus ').replace(/(\d)\.(\d)/, (_, a, b) => `${WORDS[a]} point ${WORDS[b]}`).replace(/\s*m$/, ' metres');

export function storyScript(data) {
  const sentence = finding(data);
  const order = data.partly.tagSteps.map(stepNumber);
  const orphan = data.scrambled.drawnLines.at(-1);
  const savedYear = yearOf(data.partly.savedTitle);
  return [
    { id: 'says-it', label: 'Your report says it',
      caption: 'Your report says it. Does [everyone|purple] understand it?',
      narration: 'Your report says it. But does everyone understand it?' },
    { id: 'finding', label: 'One finding',
      caption: 'One finding should reach [everyone|purple]: a person reading, a person using a screen reader and an AI assistant.',
      narration: `Take one finding: ${sentence}. It should reach a person reading, a person using a screen reader, and an AI assistant.` },
    { id: 'layers', label: 'Hidden layers',
      caption: 'Every PDF has [hidden layers|teal]: the page people see, the text tools pull out and the tags screen readers follow.',
      narration: 'But every PDF has hidden layers: the text that tools pull out, and the tags that screen readers follow.' },
    { id: 'no-description', label: 'No description',
      caption: 'The chart has [no description|red]. The finding never leaves the page.',
      narration: 'Here, the chart has no description. A screen reader just says “image”. An AI assistant gets loose numbers, not the finding.' },
    { id: 'order', label: 'Out of order',
      caption: `Hidden tags read the steps [${order.join(', ')}|coral].`,
      narration: `The hidden tags read the steps in the wrong order: ${order.join(', ')}.`,
      speak: `The hidden tags read the steps in the wrong order: ${order.map(n => WORDS[n]).join(', ')}.` },
    { id: 'loose-ends', label: 'Loose ends',
      caption: `[${orphan}|coral] ends up on its own. The saved title says [${savedYear}|red].`,
      narration: `Text drawn out of order leaves the headline number, ${orphan}, on its own. And the title saved in the file still says ${savedYear}.`,
      speak: `Text drawn out of order leaves the headline number, ${spokenMeasure(orphan)}, on its own. And the title saved in the file still says ${savedYear}.` },
    { id: 'passport', label: 'A passport for your findings',
      caption: 'Give your findings a [passport|purple]: attached data, a schema.org description, real links and bookmarks.',
      narration: 'So give your findings a passport. A well-built PDF carries its data, a schema.org description, real links and bookmarks.' },
    { id: 'check', label: 'Check your own PDF', final: true,
      caption: '[Check|teal] your own PDF. It runs in your browser, and the file stays on your device.',
      narration: 'PDF Signal Check finds what is hidden, right in your browser. Check your own PDF.' },
  ];
}
