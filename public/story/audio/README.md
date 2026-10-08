# Story audio (AI-generated)

Optional audio for `story.html`. Nothing here is a recording of a person or a performance by a musician: both the narration and the music are **AI-generated**.

The page downloads none of these files until a viewer turns on **Audio on**, and the story never depends on them: every word is also in the captions and the transcript.

## Narration: `01-…` to `13-….mp3`

- Model: Microsoft MAI-Voice-2.1 (`microsoft/mai-voice-2.1`), through OpenRouter's `/api/v1/audio/speech`
- Voice: `en-GB-Emily` (British English, female)
- Generated: 2026-10-08. Earlier passes used ElevenLabs Multilingual v2 with the voice george, first plain and then with inserted beats; reviewers found them flat, then forced.
- Choice: clips 02, 05 and 06 were read with identical text by george (default and expressive settings), MAI Emily and MAI Harry, then scored by one model with one prompt over two runs in reversed order, with the earlier sets as references. Emily led on every clip (8.3 mean, against 7.2 to 7.3 for george) and was the product owner's second pick by ear. Details: `docs/experiments/STORY-AUDIO.md`.
- Script: `src/story/script.js` (`speak`, or else `narration`, per scene), with plain punctuation and no inserted pauses. Numbers and years are spelled out for the voice. The manifest with each clip's text and duration is `src/story/narration.json`.
- Processing: loudness-normalised to −16 LUFS, mono, 24 kHz, 32 kbit/s MP3. The 13 current clips total 104.27 seconds; one regenerated clip covers the repair-first passport scene.
- Regenerate: `node --env-file=<path to .env with OPENROUTER_API_KEY> scripts/generate-story-narration.mjs`. Unchanged lines are kept, and `test/story-narration.test.js` fails if the script and the clips drift apart.

## Music bed: `music-bed.mp3`

- Model: Google Lyria 3 Pro (`google/lyria-3-pro-preview`), through OpenRouter chat completions with audio output
- Generated: 2026-10-07 (the second of two candidates)
- Prompt: “Instrumental only, no vocals. One minute of soft, hopeful ambient background music for a paper-craft stop-motion explainer: gentle music-box and celesta notes over warm sustained pads and a light, slow acoustic guitar pattern, major key, around 80 BPM. Calm, curious and quietly optimistic, very understated so narration stays clear. Soft fade-in at the start and soft fade-out at the end. No percussion hits, no crescendos, no dramatic or cinematic moments.”
- Processing: two passes of the original 59.8-second bed joined with a 7.6-second crossfade and a 3-second final fade, yielding 112 s at 40 kbit/s mono (560,423 bytes). It remains below the voice and ducks further during narration. This covers the longer 13-scene cut without an abrupt mid-story restart.
- Playback: plays only while the story plays with audio on, loops if the story runs longer, ducks during each narration clip, pauses with Pause and never plays on the reduced-motion still frames.
- Rights: generated output from Google's Lyria model under the provider's terms of use; no third-party samples were supplied.
