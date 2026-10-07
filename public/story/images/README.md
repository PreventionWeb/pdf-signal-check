# Story images (AI-generated)

These WebP images are the cut-paper figures and icons in `story.html`. They are **AI-generated** illustrations, not photographs and not hand-made paper.

- Model: Nano Banana 2, Google Gemini 3.1 Flash Image (`google/gemini-3.1-flash-image`), through OpenRouter's `/api/v1/images` endpoint at 1K resolution
- Generated: 2026-10-08
- Count: 9 generations ($0.61 in total): a figure reference sheet, its re-take on a chroma-key background, two icon sheets, a folder, a laptop and two passports (the first had text and a stamp, so it was rejected)
- Processing: keyed locally from a flat #00ff00 background (green spill removed), split into pieces, trimmed and saved as transparent WebP (quality 82). The page adds its own crisp drop shadow. About 180 KB for all thirteen files.

| File | Content |
| --- | --- |
| `reader.webp`, `listener.webp`, `assistant.webp` | The three figures: a person reading an open book, a person with coral headphones, a sky-blue speech bubble with a white star |
| `tick.webp`, `nosign.webp`, `warning.webp` | A teal tick disc, a red no sign, a mustard warning triangle |
| `q-purple.webp`, `q-teal.webp`, `q-coral.webp`, `q-mustard.webp` | Question marks |
| `folder.webp`, `passport.webp`, `laptop.webp` | A manila folder, an open passport with blank pages, a paper laptop |

## Prompts

Every prompt began with this base:

> Cut-paper collage illustration, flat construction paper with slightly irregular hand-cut edges, visible paper fibre and grain, soft drop shadow as if photographed on a table, stop-motion craft style, bold simple shapes, no outlines, no gradients, no text. Palette strictly: magenta-purple #962987, teal #00807f, coral #d9472b, mustard #f2b134, sky blue #3e9bd6, cream #f2e8d5, ink #2b2340, white paper. Isolated on a plain flat #00ff00 background, centred, generous margin.

The first figure sheet ignored the green background, so every later call added: “IMPORTANT: the entire background is one solid flat chroma-key green colour, pure #00ff00, edge to edge …” and passed the figure sheet as a reference image for consistency. The subject lines were:

- **Figures:** three pieces in a row: a person with short dark hair, warm medium-brown skin and a teal jumper holding an open white book; a person with deep brown skin, short black hair, a magenta-purple jumper and big coral over-ear headphones, eyes closed; a sky-blue rounded speech bubble with a white four-point sparkle star and a tiny mustard sparkle.
- **Icons 1:** a teal circle with a white tick; a red “no” sign; a mustard rounded warning triangle with a white border and an ink exclamation mark; mustard sound-wave arcs (not used: they came out like a broadcast icon, so the page draws its own arcs).
- **Icons 2:** four chunky question marks in purple, teal, coral and mustard.
- **Folder:** a manila folder with a tab, its front blank for a label.
- **Passport:** an open passport lying flat, seen from directly above, a purple cover around two completely blank cream pages, a coral ribbon bookmark.
- **Laptop:** a paper laptop with a dark frame, a blank white screen and an aubergine base.

Everything that carries meaning stays as code: captions, word strips, letter tiles, the bar chart and its values, extracted text, step tags and their order, the saved title, pins, the headline in the cameo and the stamps.
