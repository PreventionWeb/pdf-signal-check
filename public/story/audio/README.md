# Story audio (AI-generated)

Optional audio for `story.html`. Nothing here is a recording of a person or a performance by a musician: both the narration and the music are **AI-generated**.

The page requests no audio at startup. Play or seeking loads one locally assembled soundtrack; Mute and Volume control its sound. Captions and the transcript also explain the story. Playback always uses the soundtrack as its clock, including when muted and when showing reduced-motion stills. The separate clips and music bed are assembly inputs; the browser does not play them individually.

## Narration: `01-…` to `18-….mp3`

- Model: Microsoft MAI-Voice-2.1 (`microsoft/mai-voice-2.1`), through OpenRouter's `/api/v1/audio/speech`
- Voice: `en-GB-Emily` (British English, female)
- Generated: 2026-10-08. Earlier passes used ElevenLabs Multilingual v2 with the voice george, first plain and then with inserted beats; reviewers found them flat, then forced.
- Choice: clips 02, 05 and 06 were read with identical text by george (default and expressive settings), MAI Emily and MAI Harry, then scored by one model with one prompt over two runs in reversed order, with the earlier sets as references. Emily led on every clip (8.3 mean, against 7.2 to 7.3 for george) and was the product owner's second pick by ear. Details: `docs/experiments/STORY-AUDIO.md`.
- Script: `src/story/script.js` (`speak`, or else `narration`, per scene), with plain punctuation and no inserted pauses. Numbers and years are spelled out for the voice. The manifest with each clip's text and duration is `src/story/narration.json`.
- Processing: loudness-normalised to −16 LUFS, mono, 24 kHz, 32 kbit/s MP3. The 18 current clips total 157.85 seconds. The chaptered cut adds three bridge clips and replaces only the layers and computing-history clips; the other thirteen content clips are reused.
- Regenerate: `node --env-file=<path to .env with OPENROUTER_API_KEY> scripts/generate-story-narration.mjs`. Unchanged lines are kept, and `test/story-narration.test.js` fails if the script and the clips drift apart.

## Music bed: `music-bed.mp3`

- Model: Google Lyria 3 Pro (`google/lyria-3-pro-preview`), through OpenRouter chat completions with audio output
- Generated: 2026-10-07 (the second of two candidates)
- Prompt: “Instrumental only, no vocals. One minute of soft, hopeful ambient background music for a paper-craft stop-motion explainer: gentle music-box and celesta notes over warm sustained pads and a light, slow acoustic guitar pattern, major key, around 80 BPM. Calm, curious and quietly optimistic, very understated so narration stays clear. Soft fade-in at the start and soft fade-out at the end. No percussion hits, no crescendos, no dramatic or cinematic moments.”
- Processing: two passes of the original 59.8-second bed joined with a 7.6-second crossfade and a 3-second final fade, yielding 112 s at 40 kbit/s mono (560,423 bytes). It remains below the voice and ducks further during narration. The soundtrack builder extends this existing bed to the current timeline with an 8-second crossfade and a final 3-second fade; no new music generation is needed.
- Playback: mixed with narration into `soundtrack.mp3`; ducking is baked into the mix, so music and voice cannot drift or restart independently.
- Rights: generated output from Google's Lyria model under the provider's terms of use; no third-party samples were supplied.

## Single-clock soundtrack: `soundtrack.mp3`

Run `npm run story:audio` after changing narration or visual timing. This is entirely local, uses ffmpeg and the existing audio, and never calls a paid API. It pads the clips to scene lengths, joins them and mixes in the ducked music bed. The result is 165.02 seconds, mono 24 kHz / 40 kbit/s MP3, 825,597 bytes (about 826 KB). `src/story/playback.json` records the scene boundaries and source/output SHA-256 hashes; the playback test rejects outdated audio or cues.

A single media element owns playback time, mute, volume, speed and buffering. All stage animations are paused Web Animations sampled at the current media position. Reduced motion changes the visual presentation, not the timeline. There is no independent scene timer or second music player.

The builder uses 48 kbit/s for cuts up to 164 seconds and 40 kbit/s for longer cuts to preserve the existing 1 MB playback budget. The actual bitrate is recorded in `src/story/playback.json`. Chapter cards have a minimum 3.5-second reading hold; narration and completed entry motion can extend it.
