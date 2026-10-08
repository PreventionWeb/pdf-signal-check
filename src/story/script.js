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
        "chapter": { "number": 1, "title": "Who needs your report?" },
        "label": "Your report says it",
        "caption": "Your report says it. But can [everyone|purple] understand it?",
        "narration": "Your report says it. But can everyone understand it?"
    },
    {
        "id": "readers",
        "label": "Seeing, listening, processing",
        "caption": "People [see|teal], people [listen|purple], and machines analyse and process. A screen reader speaks the page aloud.",
        "narration": "Reports have at least three types of reader: people who see the page, people who listen as a screen reader speaks it aloud, and machines that analyse and process it."
    },
    {
        "id": "machines",
        "label": "Machines, and reach",
        "caption": "[Web search, data tools and AI chatbots|purple] can widen your report's reach. Hidden formatting mistakes can spread errors too.",
        "narration": "Machines power web search, helping people find reports. Data tools compare findings for researchers. AI chatbots answer questions using large language models trained on huge amounts of text. These tools can bring your report's findings to much larger audiences. But a small mistake in the PDF's hidden formatting can spread errors just as widely."
    },
    {
        "id": "chapter-demonstrations",
        "label": "Where meaning gets lost",
        "chapter": {
            "number": 2,
            "title": "Where meaning gets lost"
        },
        "isChapterCard": true,
        "minDuration": 3.5,
        "caption": "To understand the risk, let's follow [one finding|teal].",
        "narration": "To understand the risk, let's follow one finding."
    },
    {
        "id": "picture",
        "label": "One clear finding",
        "caption": "A [bar chart|purple] shows water clarity at three stations. South has the tallest bar and the clearest water.",
        "narration": "In this fictional report, a picture of a bar chart shows water clarity at three stations. For someone looking at the page, the meaning is clear: South has the tallest bar, and the clearest water."
    },
    {
        "id": "layers",
        "label": "Meaning behind the page",
        "caption": "The picture alone may not [reach everyone|purple]. Text and invisible labels called tags help people and machines follow the report.",
        "narration": "But the picture alone may not reach everyone. This PDF also carries text that machines can extract, and invisible labels called tags that help machines and screen readers follow its structure."
    },
    {
        "id": "no-description",
        "label": "The finding is missing",
        "caption": "With [no written description|red], a screen reader may only say “image”. People and machines can miss the finding.",
        "narration": "Here, the chart image has no written description. A screen reader may only say “image”. A person or machine relying on that description can miss the finding."
    },
    {
        "id": "order",
        "label": "Having tags is not enough",
        "caption": `The method steps come out as [${order.join(", ")}|coral]: store before collect. Like icing a cake before baking it.`,
        "narration": `Tags help people using screen readers, as well as machines. But here, the tags put the method steps out of order: ${order.join(", ")}. Store comes before collect. It's like icing a cake before baking it.`,
        "speak": `Tags help people using screen readers, as well as machines. But here, the tags put the method steps out of order: ${order.map(say).join(", ")}. Store comes before collect. It's like icing a cake before baking it.`,
    },
    {
        "id": "lonely-number",
        "label": "A number without its meaning",
        "caption": `[${orphan}|coral] highlights a rise in water clarity. In copied-out text, it loses the label that explains it.`,
        "narration": `On the page, ${orphan} draws attention to a rise in water clarity. But in copied-out text, the number loses its label. A person or machine may no longer know what it refers to.`,
        "speak": `On the page, ${spokenMeasure(orphan)} draws attention to a rise in water clarity. But in copied-out text, the number loses its label. A person or machine may no longer know what it refers to.`,
    },
    {
        "id": "wrong-title",
        "label": "Last year's title",
        "caption": `The cover says [${coverYear}|teal]. The saved title says [${savedYear}|red]. Which year does the report describe?`,
        "narration": `This report presents ${coverYear} data. But the title saved inside still says ${savedYear}, a detail easily carried over from last year's file. Is it the ${savedYear} report or the ${coverYear} report? The cover and saved title give software conflicting clues.`,
        "speak": `This report presents ${spokenYear(Number(coverYear))} data. But the title saved inside still says ${spokenYear(Number(savedYear))}, a detail easily carried over from last year's file. Is it the ${spokenYear(Number(savedYear))} report or the ${spokenYear(Number(coverYear))} report? The cover and saved title give software conflicting clues.`,
    },
    {
        "id": "chapter-impact",
        "label": "Why it matters",
        "chapter": {
            "number": 3,
            "title": "Why it matters"
        },
        "isChapterCard": true,
        "minDuration": 3.5,
        "caption": "Small mistakes can [ripple outwards|purple]. What reaches the people who need your findings?",
        "narration": "These small mistakes can ripple outwards. So what reaches the people who need your findings?"
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
        "caption": "An AI chatbot may [invent an answer|red] from incomplete information. Your finding reaches fewer people, or arrives with a different meaning.",
        "narration": "An AI chatbot may miss the data in a chart or misinterpret it: the wrong finding, for the wrong year. Piecing together incomplete information, it may invent an answer: a hallucination. The finding reaches fewer people, or arrives with a meaning you never intended."
    },
    {
        "id": "garbage-in-garbage-out",
        "label": "Garbage in, garbage out",
        "caption": "[Garbage in, garbage out.|purple] Missing or misleading information can lead to misleading answers.",
        "narration": "There's an old saying from the early days of computing in the 1950s: garbage in, garbage out. Missing or misleading information can lead to misleading answers.",
        "speak": "There's an old saying from the early days of computing in the nineteen fifties: garbage in, garbage out. Missing or misleading information can lead to misleading answers.",
    },
    {
        "id": "chapter-repair",
        "label": "What you can do",
        "chapter": {
            "number": 4,
            "title": "What you can do"
        },
        "isChapterCard": true,
        "minDuration": 3.5,
        "caption": "Here's what you can do to [help|teal].",
        "narration": "Here's what you can do to help."
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
        "caption": "[Check|teal] your own PDF. A free service from UNDRR and PreventionWeb. All processing stays [private, on your device|teal].",
        "narration": `PDF Signal Check finds problems like these: here, ${fix} to fix and ${check} to check. Check your own PDF. A free service from UNDRR and PreventionWeb. All processing stays private, on your device.`,
        "speak": `PDF Signal Check finds problems like these: here, ${say(fix)} to fix and ${say(check)} to check. Check your own PDF. A free service from U N D R R and Prevention Web. All processing stays private, on your device.`,
        "minDuration": 20,
        "final": true
    }
];
}
