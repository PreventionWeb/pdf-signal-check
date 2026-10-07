# Story script: “Your report says it. Does everyone understand it?”

A caption-led, cut-paper collage explainer for `story.html`, about 57 seconds when played straight through. The audience commissions or writes reports in international organisations. The framing is always whether people and AI **understand** a PDF, never whether they “read” or “hear” it. The example is the fictional *Harbor Observatory Annual Report 2025*; no real publication is referenced.

Captions are the primary channel: real HTML text, always visible, announced on scene change. Key words in square brackets are coloured and bold in the caption. Narration is optional (off until the viewer turns on **Audio on**) and may say a little more than the caption. Values marked † come from `src/story/snapshot.json`, real engine output on the synthetic samples.

## Art direction

UNDRR explainer collage: cream paper ground with grain and soft creases; flat cut-paper pieces with irregular torn edges, a white paper rim and soft drop shadows; magenta-purple, teal, coral, mustard and sky blue on cream (the four UNDRR decoration colours plus two friendly accents); big torn letter tiles with white letters; stop-motion movement on twos (about 12 frames a second) with overshoot, settle and a gentle idle wobble. The PDF’s three hidden layers (what people see, the text tools pull out, the tags screen readers follow) are three stacked sheets of coloured paper and recur as a small layer key in the problem scenes.

## Scenes

| # | Scene | Caption (kinetic type) | Narration | Visual and motion | Length |
| - | ----- | ---------------------- | --------- | ----------------- | ------ |
| 1 | Says it | Your report says it. Does [everyone] understand it? | Your report says it. But does everyone understand it? | The report cover († *Harbor Observatory Annual Report 2025*) drops onto the paper and settles. Word tiles “YOUR REPORT SAYS IT.” slap down; eight letter tiles spell EVERYONE one by one in five colours; paper question marks pop around them. | ~6 s |
| 2 | One finding | One finding should reach [everyone]: a person reading, a person using a screen reader and an AI assistant. | Take one finding: South is highest. It should reach a person reading, a person using a screen reader, and an AI assistant. | A paper bar chart grows bar by bar († North 2.8 m, Central 3.1 m, South 3.4 m). A speech-bubble tag “South is highest” † lifts off the tallest bar. Three cut-paper figures (a reader with a page, a listener with headphones, an assistant chat bubble) slide in; copies of the tag fly to each and land with a tick. | ~9 s |
| 3 | Hidden layers | Every PDF has [hidden layers]: the page people see, the text tools pull out and the tags screen readers follow. | But every PDF has hidden layers: the text that tools pull out, and the tags that screen readers follow. | The page lifts and fans into three stacked paper sheets: “What people see”, “The text tools pull out”, “The tags screen readers follow”. Each sheet gets a torn label strip and an icon (eye, text block, numbered tags on a string). | ~8 s |
| 4 | No description | The chart has [no description]. The finding never leaves the page. | Here, the chart has no description. A screen reader just says “image”. An AI assistant gets loose numbers, not the finding. | Left, the chart as people see it, with its tag. Right, the yellow tags layer: an empty dashed frame and a blank “Description” line with a red no-sign. All the text tools pull out are the loose labels †, which tumble out as small blue tiles. The listener’s bubble says “Image.”; the assistant’s bubble holds jumbled numbers and question marks. | ~9 s |
| 5 | Out of order | Hidden tags read the steps [3, 4, 1, 2]. | The hidden tags read the steps in the wrong order: three, four, one, two. | Top: the page with steps 1–4 in two columns. The step tags peel off the page and hang on a string in the hidden order † 3, 4, 1, 2, swinging. A red hand-drawn arrow reads them in that order; the screen-reader listener’s bubble says “3, 4, 1, 2 …”; a warning triangle drops beside them. | ~7 s |
| 6 | Loose ends | [+0.7 m] ends up on its own. The saved title says [2024]. | Text drawn out of order leaves the headline number, +0.7 m, on its own. And the title saved in the file still says 2024. | Extracted text strips † slide in one under another; the last strip, “+0.7 m” †, drops away from its sentence with a question mark. A manila folder tab, “Saved in the file”, holds the saved title † (*… Report 2024*) beside the 2025 cover; a hand-drawn red ring circles 2024. | ~10 s |
| 7 | Passport | Give your findings a [passport]: attached data, a schema.org description, real links and bookmarks. | So give your findings a passport. A well-built PDF carries its data, a schema.org description, real links and bookmarks. | A paper passport opens. Four stamps thump onto its pages: DATA (a CSV sheet † clipped on, station rows †), SCHEMA.ORG, LINKS (“Map 2” with a chain), BOOKMARKS (ribbons, † bookmark count). The three figures reappear in a column, each with a tick. | ~10 s |
| 8 | Check | [Check] your own PDF. It runs in your browser, and the file stays on your device. | PDF Signal Check finds what is hidden, right in your browser. Check your own PDF. | Cameo of the real tool on a paper laptop: its headline † “1 thing to fix, 4 to check” and the first four pins † for the scrambled sample, dropping in as numbered pins. A torn tile reads “Your PDF stays on your device”. The HTML “Check your own PDF” button appears below the caption. | ~7 s |

Scene lengths follow the narration clip lengths plus a short hold, so captions and audio stay in step whether or not audio is on. Measured lengths: 4.3, 8.2, 6.9, 8.4, 5.4, 9.5, 8.5 and 5.8 s (57 s).

The words are code: `src/story/script.js` is the source of truth for captions and narration, with `speak` holding the spoken form where it differs (“plus zero point seven metres”).

## Audio

Off by default. Narration: ElevenLabs Multilingual v2, voice george. Music: an ambient Lyria 3 Pro bed (music box, celesta, warm pads, slow acoustic guitar), about 9 dB under the voice and ducked while it speaks. Both are AI-generated; see `public/story/audio/README.md`.

## Transcript and descriptions

The page transcript lists, per scene, the caption, the narration and a plain description of the visual, built from the same snapshot values, so nothing is only in the pictures or only in the audio.
