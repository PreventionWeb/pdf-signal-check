# Story script: “Your report says it. Does everyone understand it?”

A caption-led, cut-paper collage explainer for `story.html`, about 55 seconds when played straight through. The audience commissions or writes reports in international organisations. The framing is always whether people and AI **understand** a PDF, never whether they “read” or “hear” it. The example is the fictional *Harbor Observatory Annual Report 2025*; no real publication is referenced.

Captions are the primary channel: real HTML text, always visible, announced on scene change. Key words in square brackets are coloured and bold in the caption. Narration is optional (off until the viewer turns on **Audio on**) and may say a little more than the caption. Values marked † come from `src/story/snapshot.json`, real engine output on the synthetic samples.

## Art direction

UNDRR explainer collage: cream paper ground with grain and soft creases; flat cut-paper pieces with irregular torn edges, a white paper rim and soft drop shadows; magenta-purple, teal, coral, mustard and sky blue on cream (the four UNDRR decoration colours plus two friendly accents); big torn letter tiles with white letters; stop-motion movement on twos (about 12 frames a second) with overshoot, settle and a gentle idle wobble. The PDF’s three hidden layers (what people see, the text tools pull out, the tags screen readers follow) are three stacked sheets of coloured paper and recur as a small layer key in the problem scenes.

## Scenes

| # | Scene | Caption (kinetic type) | Narration | Visual and motion | Length |
| - | ----- | ---------------------- | --------- | ----------------- | ------ |
| 1 | Says it | Your report says it. Does [everyone] understand it? | Your report says it. But does everyone understand it? | The report cover († *Harbor Observatory Annual Report 2025*) drops onto the paper and settles. Word tiles “YOUR REPORT SAYS IT.” slap down; eight letter tiles spell EVERYONE one by one in five colours; paper question marks pop around them. | ~6 s |
| 2 | One finding | One finding should reach [everyone]. | Take one finding: South is highest. It should reach a person reading, a person using a screen reader, and an AI assistant. | A paper bar chart grows bar by bar († North 2.8 m, Central 3.1 m, South 3.4 m). A speech-bubble tag “South is highest” † lifts off the tallest bar. Three cut-paper figures (a reader with a page, a listener with headphones, an assistant chat bubble) slide in; copies of the tag fly to each and land with a tick. | ~9 s |
| 3 | Hidden layers | Every PDF has [hidden layers]. | But a PDF has hidden layers: the text that tools pull out, and the tags that screen readers follow. | The page lifts and fans into three stacked paper sheets: “What people see”, “The text tools pull out”, “The tags screen readers follow”. Each sheet gets a torn label strip and an icon (eye, text block, numbered tags on a string). | ~8 s |
| 4 | No description | The chart has [no description]. The finding never leaves the page. | Here, the chart has no description. A screen reader just says “image”. An AI assistant gets loose numbers, not the finding. | Left, the chart as people see it, with its tag. Right, the hidden sheet: an empty dashed frame and a blank “Description” line with a red no-sign. The loose labels † tumble out as small tiles. The listener’s bubble says “Image.”; the assistant’s bubble holds jumbled numbers and question marks. | ~9 s |
| 5 | Out of order | Hidden tags read the steps [3, 4, 1, 2]. | The hidden tags read the steps in the wrong order: three, four, one, two. | Top: the page with steps 1–4 in two columns. The step tags peel off the page and hang on a string in the hidden order † 3, 4, 1, 2, swinging. A coral warning triangle drops beside them. | ~7 s |
| 6 | Loose ends | [+0.7 m] ends up on its own. The saved title says [2024]. | The text is drawn out of order, so the headline number, plus zero point seven metres, ends up on its own. And the title saved in the file still says 2024. | Extracted text strips † slide in one under another; the last strip, “+0.7 m” †, drops away from its sentence with a question mark. A file tab labelled with the saved title † (*… Report 2024*) is set against the cover’s 2025; a hand-drawn red ring circles 2024. | ~10 s |
| 7 | Passport | Give your findings a [passport]. | So give your findings a passport. A well-built PDF carries its data, a schema.org description, real links and bookmarks. | A paper passport opens. Four stamps thump onto its pages: DATA (a CSV sheet † clipped on, station rows †), SCHEMA.ORG, LINKS (“Map 2” with a chain), BOOKMARKS (ribbons, † bookmark count). The three figures reappear with ticks. | ~10 s |
| 8 | Check | [Check] your own PDF. | PDF Signal Check shows what is hidden, right in your browser. Check your own PDF. | Cameo of the real tool on a paper laptop: its headline † “1 thing to fix, 4 to check” and the first four pins † for the scrambled sample, dropping in as numbered pins. A torn tile reads “Your PDF stays on your device”. The HTML “Check your own PDF” button appears below the caption. | ~7 s |

Scene lengths follow the narration clip lengths plus a short hold, so captions and audio stay in step whether or not audio is on.

## Transcript and descriptions

The page transcript lists, per scene, the caption, the narration and a plain description of the visual, built from the same snapshot values, so nothing is only in the pictures or only in the audio.
