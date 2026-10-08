# Story script: “Your report says it. But can everyone understand it?”

A caption-led, cut-paper explainer for `story.html`, 151.67 seconds (about 2 minutes 32 seconds) at the current scene timing. The audience commissions or writes reports in international organisations. The fictional *Harbor Observatory Annual Report 2025* and its sample PDFs supply the visible values. The 2024 saved title and jumbled steps come from the partly prepared sample; the detached “+0.7 m” and the final result list come from the scrambled sample. The closing says “problems like these” because it does not claim one file has every example.

Captions are visible HTML text and are announced on scene changes. Playback opens paused. Play starts the soundtrack with sound; Mute and Volume control it. No audio is requested until Play or a seek. `src/story/script.js` is the source for both channels; its `speak` field spells numbers and years for the synthetic voice. The on-page transcript adds a description of each scene. One locally assembled soundtrack sets the timeline. Its current position drives every visual animation, so pausing, seeking, buffering and speed changes share a clock. Scene lengths include each voice clip and a short hold, with motion completing before the next scene.

## Art direction

UNDRR explainer collage: cream paper with grain and folds; torn tiles, strips, sheets and stamps drawn in SVG; cut-paper figures and icons as transparent WebP. Purple, teal, coral, mustard and sky blue mark recurring elements. Pieces arrive fully opaque in held stop-motion steps and settle with a small wobble. The three layers recur as white page, blue copied-out text and yellow screen-reader tags. The centre of the 1600 × 900 stage stays legible in the mobile crop. Reduced-motion viewers get the composed stills.

## Full script and timing

[The editable full script](story-full-script.md) contains all fifteen scenes, captions, narration, visual descriptions and exact cue times. Run `npm run story:script` to export the current source explicitly; ordinary builds never overwrite review edits.

The opening connects people who see, people who listen and machines to a report's reach. Data tools, web search and AI chatbots are distinct examples. The chart and hidden layers precede four concrete problems and their consequences. A “garbage in, garbage out” bridge also acknowledges that AI can make mistakes with good inputs. Direct repairs have their own scene before the optional passport extras and the tool cameo.

The fifteen voice clips total 147.17 seconds. Scene lengths include narration, a short hold and completed entry motion. The existing music bed is extended locally with a crossfade and final fade during soundtrack assembly. The single soundtrack supplies the clock throughout.

The story uses “may” for possible search and AI effects. The repair steps address concrete issues shown earlier. Data, a clear summary, links and bookmarks are optional ways to help a publication travel further; they do not guarantee search placement or AI accuracy. The samples' score remains a concrete tool result, separate from those opportunities.

## Audio and assets

The voice is MAI-Voice-2.1 en-GB-Emily, with no inserted pauses. The ambient music is a Lyria 3 Pro generation. Both are AI-generated and load only after Play or seeking. See `public/story/audio/README.md` for provenance and `public/story/images/README.md` for figure provenance.
