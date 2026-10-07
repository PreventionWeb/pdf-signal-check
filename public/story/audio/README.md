# Story audio (AI-generated)

Optional audio for `story.html`. Nothing here is a recording of a person or a performance by a musician: both the narration and the music are **AI-generated**.

The page downloads none of these files until a viewer turns on **Audio on**, and the story never depends on them: every word is also in the captions and the transcript.

## Narration: `01-…` to `08-….mp3`

- Model: ElevenLabs Multilingual v2 (`elevenlabs/eleven-multilingual-v2`), through OpenRouter's `/api/v1/audio/speech`
- Voice: `george` (British English, male). Chosen from seven candidates; see `docs/experiments/STORY-AUDIO.md`.
- Delivery: voice settings stability 0.3, similarity 0.8, style 0.45, speaker boost, sent as OpenRouter provider options, and a short beat (“…”) before each scene’s key phrase
- Generated: 2026-10-07; regenerated with beats and warmer settings 2026-10-08
- Script: `src/story/script.js` (`speak`, or else `narration`, per scene). The manifest with each clip's text and duration is `src/story/narration.json`.
- Processing: loudness-normalised to −16 LUFS, mono, 44.1 kHz, 48 kbit/s MP3
- Regenerate: `node --env-file=<path to .env with OPENROUTER_API_KEY> scripts/generate-story-narration.mjs`. Unchanged lines are kept, and `test/story-narration.test.js` fails if the script and the clips drift apart.

## Music bed: `music-bed.mp3`

- Model: Google Lyria 3 Pro (`google/lyria-3-pro-preview`), through OpenRouter chat completions with audio output
- Generated: 2026-10-07 (the second of two candidates)
- Prompt: “Instrumental only, no vocals. One minute of soft, hopeful ambient background music for a paper-craft stop-motion explainer: gentle music-box and celesta notes over warm sustained pads and a light, slow acoustic guitar pattern, major key, around 80 BPM. Calm, curious and quietly optimistic, very understated so narration stays clear. Soft fade-in at the start and soft fade-out at the end. No percussion hits, no crescendos, no dramatic or cinematic moments.”
- Processing: trimmed to 59.8 s, 1.5 s fade-in, 3 s fade-out, loudness-normalised to about −25 LUFS (about 9 dB under the narration), 64 kbit/s stereo MP3 (479 KB)
- Playback: plays only while the story plays with audio on, loops if the story runs longer, ducks a further 6 dB under each narration clip, pauses with Pause and never plays on the reduced-motion still frames.
- Rights: generated output from Google's Lyria model under the provider's terms of use; no third-party samples were supplied.
