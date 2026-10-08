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
    {
        "id": "says-it",
        "label": "Your report says it",
        "caption": "Your report says it. But can [everyone|purple] understand it?",
        "narration": "Your report says it. But can everyone understand it?"
    },
    {
        "id": "readers",
        "label": "Seeing, listening, processing",
        "caption": "People [see|teal], people [listen|purple], and machines process. A screen reader is software that speaks the page aloud.",
        "narration": "Reports have at least three types of readers: people who see the page, people who listen, and machines that process it. A screen reader is software that speaks the page aloud."
    },
    {
        "id": "machines",
        "label": "Machines, and reach",
        "caption": "[Data tools|teal], [web search|teal] and [AI chatbots|purple] can bring findings to much larger audiences.",
        "narration": "Web search helps people find reports. Data tools compare findings. AI chatbots answer questions using large language models: software trained on huge amounts of text. These tools can bring your findings to much larger audiences."
    },
    {
        "id": "picture",
        "label": "One clear finding",
        "caption": "A [picture|purple] shows water clarity at three stations. South has the clearest water.",
        "narration": "In this made-up report, a picture shows water clarity at three stations. South has the tallest bar: the clearest water."
    },
    {
        "id": "layers",
        "label": "Meaning behind the page",
        "caption": "A PDF can carry [text and tags|teal] behind the page. Tags help a screen reader navigate in order.",
        "narration": "A PDF can carry more than a picture: text that machines extract, and hidden labels called tags that help a screen reader navigate in order."
    },
    {
        "id": "no-description",
        "label": "The finding is missing",
        "caption": "With [no written description|red], a screen reader may only say “image”. The listener misses the finding.",
        "narration": "Here, the chart has no written description. A screen reader may only say “image”. Someone relying on that description misses the finding."
    },
    {
        "id": "order",
        "label": "Having tags is not enough",
        "caption": `Tags put the method steps in the order [${order.join(", ")}|coral]. Store comes before collect.`,
        "narration": `Having tags is not enough. These tags put the method steps in the order ${order.join(", ")}. Store comes before collect.`,
        "speak": `Having tags is not enough. These tags put the method steps in the order ${order.map(say).join(", ")}. Store comes before collect.`
    },
    {
        "id": "lonely-number",
        "label": "A number without its meaning",
        "caption": `[${orphan}|coral] means a rise in water clarity. Without its label, what does it mean?`,
        "narration": `The number ${orphan} means a rise in water clarity. In copied-out text, it loses its label. Now a person or machine may miss what changed.`,
        "speak": `The number ${spokenMeasure(orphan)} means a rise in water clarity. In copied-out text, it loses its label. Now a person or machine may miss what changed.`
    },
    {
        "id": "wrong-title",
        "label": "Last year's title",
        "caption": `The report is about [${coverYear}|teal]. Its saved title still says [${savedYear}|red]. The dates disagree.`,
        "narration": `This report is about ${coverYear}. But the title saved inside still says ${savedYear}, a detail easily carried over from last year's file. The dates now disagree.`,
        "speak": `This report is about ${spokenYear(Number(coverYear))}. But the title saved inside still says ${spokenYear(Number(savedYear))}, a detail easily carried over from last year's file. The dates now disagree.`
    },
    {
        "id": "search-and-listening",
        "label": "What people receive",
        "caption": "Search may show the [wrong year|red]. People listening may miss the chart or hear steps out of order.",
        "narration": "Search may present it as last year's report. Someone listening may miss the chart or hear the steps in the wrong order."
    },
    {
        "id": "chatbots-and-reach",
        "label": "What AI may pass on",
        "caption": "AI may give the [wrong finding for the wrong year|red]. Findings reach fewer people, or arrive changed.",
        "narration": "An AI chatbot may skip the chart or misinterpret it: the wrong finding, for the wrong year. If it invents an answer, that's a hallucination. The finding reaches fewer people, or arrives changed."
    },
    {
        "id": "garbage-in-garbage-out",
        "label": "Garbage in, garbage out",
        "caption": "[Garbage in, garbage out.|purple] Confusing input can lead to misleading answers. AI can make mistakes with good inputs too.",
        "narration": "It's an old problem: garbage in, garbage out. AI can make mistakes even with good inputs. But unclear or misleading inputs add avoidable confusion."
    },
    {
        "id": "repair",
        "label": "Repair the meaning",
        "caption": "[Describe the chart.|teal] Order the steps. Keep numbers with labels. Match the title to the cover.",
        "narration": "Start with what you can fix. Describe the chart, put steps in order, keep numbers with labels, and match the saved title to the cover."
    },
    {
        "id": "passport",
        "label": "A passport for wider reach",
        "caption": "Help findings [travel further|purple]: share data, add a clear summary, clickable links and bookmarks to sections.",
        "narration": "Then help findings travel further: share the chart's data, add a clear summary, make links clickable, and add bookmarks to jump between sections. A passport for reuse."
    },
    {
        "id": "check",
        "label": "Check your own PDF",
        "caption": "[Check|teal] your own PDF in your browser. The file stays on your device.",
        "narration": `PDF Signal Check finds problems like these: here, ${fix} to fix and ${check} to check. Check your own PDF. It stays on your device.`,
        "speak": `PDF Signal Check finds problems like these: here, ${say(fix)} to fix and ${say(check)} to check. Check your own PDF. It stays on your device.`,
        "final": true
    }
];
}
