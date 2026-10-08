# Story script: “Your report says it. Does everyone understand it?”

A caption-led, cut-paper explainer for `story.html`, about 109 seconds at the current scene timing. The audience commissions or writes reports in international organisations. The fictional *Harbor Observatory Annual Report 2025* and its sample PDFs supply the visible values. The 2024 saved title and jumbled steps come from the partly prepared sample; the detached “+0.7 m” and the final result list come from the scrambled sample. The closing says “problems like these” because it does not claim one file has every example.

Captions are visible HTML text and are announced on scene changes. Optional narration is off until the viewer chooses **Audio on**. `src/story/script.js` is the source for both channels; its `speak` field spells numbers and years for the synthetic voice. The on-page transcript adds a description of each scene. Scene lengths follow each recorded voice clip plus a short hold, with motion completing before advance.

## Art direction

UNDRR explainer collage: cream paper with grain and folds; torn tiles, strips, sheets and stamps drawn in SVG; cut-paper figures and icons as transparent WebP. Purple, teal, coral, mustard and sky blue mark recurring elements. Pieces arrive fully opaque in held stop-motion steps and settle with a small wobble. The three layers recur as white page, blue copied-out text and yellow screen-reader tags. The centre of the 1600 × 900 stage stays legible in the mobile crop. Reduced-motion viewers get the composed stills.

## Scenes

| # | Scene | Caption's main point | Motion and visible evidence | Approx. length |
| - | ----- | -------------------- | --------------------------- | -------------- |
| 1 | Your report says it | Does everyone understand it? | 2025 cover falls in; torn letters spell EVERYONE. | 4.0 s |
| 2 | People who see, people who listen | A screen reader speaks the page aloud. | Person reading and person listening fill two of three paper slots. | 8.1 s |
| 3 | Machines, and reach | Web search and AI chatbots can carry findings far beyond the file. | Distinct search and chatbot readers; paper pages feed the chatbot; strings fan out to a crowd. | 11.8 s |
| 4 | The chart is a picture | A chart picture shows water clarity at three stations; South is highest. | Chart values and South bar come into focus, with a “Picture” label and the finding bubble. | 7.6 s |
| 5 | Hidden layers | Copied-out text and tags guide other readers. | The page fans into the page, text and tag sheets, with their readers nearby. | 6.6 s |
| 6 | No description | The chart lacks a description; a screen reader says “image”. | The chart and empty description frame appear side by side. | 5.2 s |
| 7 | Steps out of order | Hidden tags put method steps in 3, 4, 1, 2; Store precedes Collect. | Numbered tags peel off the page onto a tangled string. | 7.9 s |
| 8 | The lonely number | “+0.7 m” leaves its label when copied out. | Number and label sit together on the page, then separate in copied text. | 6.8 s |
| 9 | The wrong title | Saved title says 2024; cover says 2025. | Folder and cover show the different years, each circled. | 6.4 s |
| 10 | Search and listening | Search may show the wrong year; a listener may lose chart and steps. | Search result shows 2024; listening figure hears “Image” beside tangled tags. | 8.7 s |
| 11 | Chatbots and reach | A wrong AI answer can spread; the finding reaches fewer people or arrives changed. | A *possible* wrong answer is circled, copies drift outward and some paths to the crowd stop short. | 14.4 s |
| 12 | A passport for findings | First repair description, order, number labels and title; then add data, summary, links and bookmarks for wider reach. | Four repair strips precede a passport with four opportunity stamps. No success ticks imply guaranteed interpretation. | 12.8 s |
| 13 | Check your own PDF | The browser checks problems like these; the file stays on the device. | Paper laptop shows the real scrambled-sample headline and five pins (two plus an honest “+ 3 more” on mobile). | 8.7 s |

Approximate lengths account for the longer of narration-plus-hold and completed entry motion; their sum is about 109 seconds. The 112-second music file covers one complete pass, and the player can loop it if timing stretches. The synthetic voice lasts 104.27 seconds across 13 clips.

The story uses “may” for possible search and AI effects. The repair steps address concrete issues shown earlier. Data, a clear summary, links and bookmarks are optional ways to help a publication travel further; they do not guarantee search placement or AI accuracy. The samples' score remains a concrete tool result, separate from those opportunities.

## Audio and assets

The voice is MAI-Voice-2.1 en-GB-Emily, with no inserted pauses. The ambient music is a Lyria 3 Pro generation. Both are AI-generated and load only after Audio on. See `public/story/audio/README.md` for provenance and `public/story/images/README.md` for figure provenance.
