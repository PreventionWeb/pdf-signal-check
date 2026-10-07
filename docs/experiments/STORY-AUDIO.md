# Findings: synthetic narration and music for the story

Recorded 2026-10-07 while making the audio for `story.html`. Use this as a starting point for similar short explainers. Prices and model IDs are OpenRouter's on that date.

## Outcome

- **Narration (final):** Microsoft MAI-Voice-2.1, voice **en-GB-Emily**: the product owner's second pick by ear, and the clear winner of a consistent listening check in round 3 (below). The first two passes used ElevenLabs Multilingual v2, voice **george**, which the owner first preferred on a single test line.
- **Music:** Google Lyria 3 Pro (`google/lyria-3-pro-preview`), the second of two candidates (music box, celesta, pads and slow acoustic guitar).
- **Spend:** $1.15 by the end of round 2 and $1.25 after round 3 (see `docs/VALIDATION.md`). Round 1 was about $0.45: music $0.16 (two songs at $0.08), voice about $0.14 (test lines, two full narration passes and one retake), and about $0.15 for an audio-capable model used as a listening panel.

## Voice comparison

The same test line was read by seven voices: ElevenLabs Multilingual v2 (alice, george, matilda), MAI-Voice-2.1 (en-GB-Emily) and Gemini 3.1 Flash TTS (Sulafat, Achird, Kore). Two audio-input models (Gemini 3.1 Pro and Gemini 3.8 Flash) rated the clips blind, with the order reversed for the second run to check for position bias. Both ranked george first, for warmth, natural prosody and an unhurried pace that suits non-native listeners. They criticised Gemini's voices as casual or upspeak (Sulafat), salesy (Achird) or clipped (Kore), and alice and Emily as a little rushed. Ratings from a model are a screening aid, not a substitute for a person listening; here the owner confirmed the pick by ear.

## Practical notes

- **Endpoints:** speech uses `POST /api/v1/audio/speech` (OpenAI-compatible: `model`, `voice`, `input`, `response_format`). Lyria uses streamed chat completions with `modalities: ["text", "audio"]` and returns base64 audio in `delta.audio.data` (MP3 at 192 kbit/s, about 60 s per "song").
- **Gemini TTS returns only `pcm`** (24 kHz mono s16le); requesting MP3 fails with a 400. Convert locally with ffmpeg.
- **`speed` was ignored** by the ElevenLabs route (clip lengths did not change), so tighten pacing by editing the words instead.
- **Credits:** Google models (Gemini TTS, Lyria) returned 402 until the account had purchased credits, even though the key had its own spending cap. Audio output also requires at least $0.50 of account balance. ElevenLabs worked before then.
- **Retakes are cheap and worth it.** The first passport line had falling, "stitched" intonation at each comma; a second take with identical text came back with natural list intonation. Asking a model to transcribe the final clips found no wrong words but flagged odd emphasis worth a retake.
- **Spoken forms:** write numbers out for the voice ("plus zero point seven metres"), keep the written form in captions and the transcript (`speak` versus `narration` in `src/story/script.js`).
- **Music candidates vary a lot.** One of the two Lyria tracks had a brief speech-like artefact and busy mid-range plucks that would fight a voice; always screen for vocals even when the prompt says "no vocals".
- **Mix:** narration normalised to −16 LUFS; music baked in about 9 dB lower (−25 LUFS) so it sits under the voice even on browsers that ignore `volume` (iOS), then ducked a further 6 dB while a clip plays. All audio together is about 810 KB.
- **Making a flat read livelier (2026-10-08):** a reviewer scored the first pass 6/10, “clear but flat”. What helped most was the script: a beat (“…”) before each key phrase, an exclamation on the finding, and splitting lists (“three… four… one… two”). ElevenLabs voice settings (stability 0.3, style 0.45) were sent as `provider.options.elevenlabs.voice_settings`; their effect could not be confirmed, because pitch spread was about the same before and after (3.2 semitones). Eleven v3 with audio tags (“[warmly]”) did not sound better in a blind check. A model listening check rated the revised set 7.8/10 with every key phrase emphasised.
- **Model listening checks are unreliable:** one run of Gemini 3.1 Pro silently ignored the attached audio and answered from the prompt; Gemini 3.8 Flash worked. Ask the model to reply “NO AUDIO” if it cannot hear, and treat ratings as screening, not judgement.
- **Wording trap:** “Take one finding” was heard by a model as a recording slate (“take one”). Avoid production words in narration.
- **Round 3 (2026-10-08): a consistent check beats one-off ratings.** The second review heard the inserted “…” beats as forced gaps and still found no lift on the finding. The beats were removed. Clips 02, 05 and 06 were then read with identical text by four voices: george on default settings, george with stability 0.3 and style 0.45, MAI Emily and MAI Harry. Each clip's six versions (adding the v1 and v2 sets as references) were scored by Gemini 3.8 Flash at temperature 0, with one fixed JSON prompt (warmth, naturalness, emphasis, clarity), in two runs with the order reversed. Means: Emily 8.31, v2 george with beats 7.31, george default 7.21, george expressive 7.19, v1 george 7.00, Harry 6.97. Emily led on every clip in both runs. Its one flag, “2024” heard as “twenty and twenty-four” in one run, was fixed by spelling the year out for the voice. Lesson: one listening check on its own is noise; fix the model, prompt, temperature and order, and repeat.
- **Take-to-take variance is real:** one Emily take of clip 05 came back at 8.4 s with long gaps, while a retake of the same text ran 6.2 s. Check durations and pauses (`silencedetect`) before accepting a take.
- **Keys:** pass the key with `node --env-file=<path>`; scripts read `process.env` and never echo it.
