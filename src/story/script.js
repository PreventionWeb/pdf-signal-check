// The words of the story: scene labels, captions and narration. Kept apart from the art so the narration
// generator (scripts/generate-story-narration.mjs) and the drift test can read them in plain Node.
// Captions mark key words as [word|colour]. `speak` is the TTS input when it differs from the displayed narration.

export const finding = data => (data.well.figureAlt || '').split('. ').pop().replace(/\.$/, '') || 'South is highest';
export const stepNumber = text => text.match(/^(\d)/)?.[1];
export const yearOf = text => text?.match(/(19|20)\d\d/)?.[0];
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
/** "+0.7 m" → "plus zero point seven metres", so the voice says the number the way a person would. */
/** 2024 → "twenty twenty-four", so no voice reads it as a quantity. */
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const TEENS = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const pair = n => n < 10 ? `oh ${WORDS[n]}` : n < 20 ? TEENS[n - 10] : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${WORDS[n % 10]}` : ''}`;
export const spokenYear = year => `${pair(Math.floor(year / 100))} ${pair(year % 100)}`;
export const spokenMeasure = text => text.replace(/^\+/, 'plus ').replace(/(\d)\.(\d)/, (_, a, b) => `${WORDS[a]} point ${WORDS[b]}`).replace(/\s*m$/, ' metres');

/** "1 thing to fix, 4 to check" → { fix: 1, check: 4 }. */
export const headlineCounts = headline => ({ fix: Number(headline.match(/(\d+) things? to fix/)?.[1] || 0), check: Number(headline.match(/(\d+)( things?)? to check/)?.[1] || 0) });

export function storyScript(data) {
  const sentence = finding(data);
  const order = data.partly.tagSteps.map(stepNumber);
  const orphan = data.scrambled.drawnLines.at(-1);
  const savedYear = yearOf(data.partly.savedTitle), coverYear = yearOf(data.travel.title);
  const { fix, check } = headlineCounts(data.scrambled.headline);
  const say = n => WORDS[n] || String(n);
  // `speak` is the spoken form where it differs from the written `narration` (numbers and years said as words).
  // Emphasis comes from wording and ordinary punctuation, not inserted pauses.
  return [
    { id: 'says-it', label: 'Your report says it',
      caption: 'Your report says it. Does [everyone|purple] understand it?',
      narration: 'Your report says it. But does everyone understand it?' },
    { id: 'readers', label: 'People who see, people who listen',
      caption: 'Some people [see|teal] the page. Others use a [screen reader|purple]: software that speaks it aloud.',
      narration: 'Everyone means three kinds of reader. People who see the page. People who listen, with a screen reader that speaks it aloud.' },
    { id: 'machines', label: 'Machines, and reach',
      caption: '[Web search|teal] and [AI chatbots|purple] carry findings far beyond the file.',
      narration: 'And machines: web search, and AI chatbots built on large language models, software trained on huge amounts of text. They carry findings far beyond the file.' },
    { id: 'picture', label: 'The chart is a picture',
      caption: `A [picture|purple] charts water clarity at three stations. Look: ${sentence}.`,
      narration: `Its chart is a picture of water clarity at three stations. Look, and the finding is clear: ${sentence}.` },
    { id: 'layers', label: 'Hidden layers',
      caption: 'Behind the page sit [hidden layers|teal]: copied-out text, and tags that guide a screen reader.',
      narration: 'Behind the page sit hidden layers: text that machines copy out, and tags that guide a screen reader.' },
    { id: 'no-description', label: 'No description',
      caption: 'The chart has [no description|red]. A screen reader just says “image”.',
      narration: 'But this chart has no written description, so a screen reader just says “image”.' },
    { id: 'order', label: 'Steps out of order',
      caption: `Hidden tags put the method steps in the order [${order.join(', ')}|coral]. Store comes before collect.`,
      narration: `The tags also jumble the steps: ${order.join(', ')}. Store comes before collect.`,
      speak: `The tags also jumble the steps: ${order.map(say).join(', ')}. Store comes before collect.` },
    { id: 'lonely-number', label: 'The lonely number',
      caption: `In copied-out text, [${orphan}|coral] ends up apart from its label.`,
      narration: `On the page, ${orphan} sits by its label. Copied out, it ends up alone.`,
      speak: `On the page, ${spokenMeasure(orphan)} sits by its label. Copied out, it ends up alone.` },
    { id: 'wrong-title', label: 'The wrong title',
      caption: `The title saved in the file says [${savedYear}|red]. The cover says ${coverYear}.`,
      narration: `Inside the file, the saved title says ${savedYear}. The cover says ${coverYear}.`,
      speak: `Inside the file, the saved title says ${spokenYear(Number(savedYear))}. The cover says ${spokenYear(Number(coverYear))}.` },
    { id: 'search-and-listening', label: 'What happens: search and listening',
      caption: 'Search may show the [wrong year|red]. People listening may lose the chart and steps.',
      narration: 'So what happens? Search may list it as last year’s report. Someone using a screen reader may lose the chart and the steps.' },
    { id: 'chatbots-and-reach', label: 'What happens: AI chatbots and reach',
      caption: 'AI chatbots may [get it wrong|red]. The finding reaches fewer people, or arrives changed.',
      narration: 'AI chatbots may skip the example, mix up facts, or confidently get them wrong. Errors like these, sometimes called hallucinations, can spread. The finding reaches fewer people, or arrives changed.' },
    { id: 'passport', label: 'A passport for your findings',
      caption: 'Fix the description, step order, number labels and title. Then add a [passport|purple] for wider reach: data, a summary, links and bookmarks.',
      narration: 'First, describe the chart, put steps in order, keep numbers with labels, and match the title. Then give findings a passport to travel further: data, a clear summary, links and bookmarks.' },
    { id: 'check', label: 'Check your own PDF', final: true,
      caption: '[Check|teal] your own PDF in your browser. The file stays on your device.',
      narration: `PDF Signal Check finds problems like these: here, ${fix} to fix and ${check} to check. Your file stays on your device.`,
      speak: `PDF Signal Check finds problems like these: here, ${say(fix)} to fix and ${say(check)} to check. Your file stays on your device.` },
  ];
}
