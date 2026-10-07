# Story narration (synthetic)

These MP3 files are the optional narration for `story.html`. They are **synthetic speech**, not a recording of a person.

- Model: ElevenLabs Multilingual v2 (`elevenlabs/eleven-multilingual-v2`), called through OpenRouter's `/api/v1/audio/speech` endpoint
- Voice: `alice` (clear British English)
- Generated: 2026-10-07
- Script: `src/story/script.js` (`speak`, or else `narration`, for each scene); manifest with per-clip text and duration in `src/story/narration.json`
- Processing: loudness-normalised to −16 LUFS, mono, 44.1 kHz, 48 kbit/s MP3 (about 356 KB for all eight clips)
- Regenerate: `node --env-file=<path to .env with OPENROUTER_API_KEY> scripts/generate-story-narration.mjs`. Unchanged lines are kept, and `test/story-narration.test.js` fails if the script text and the clips drift apart.

The page never downloads these files until a viewer turns on **Audio on**, and the story never depends on them: every word is also in the captions and the transcript.

No music bed is included yet.
