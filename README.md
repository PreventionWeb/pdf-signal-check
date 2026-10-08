# PDF Signal Check

Find PDF problems that can make reports harder for people and their tools to understand. Review the evidence on the page and download a fix list for whoever edits the original document.

**As of October 2026, PDF Signal Check is in internal preview.** [Open the preview](https://preventionweb.github.io/pdf-signal-check/).

## What it checks

- Saved titles, authors and language
- Text structure and clues to mixed-up reading order
- Image-description presence and decorative graphics
- Links, bookmarks, supporting data and hidden instructions aimed at AI
- Optional AI comparisons between saved information and extracted text

Check one PDF or a batch, or try one of the eight sample reports. Results distinguish things to fix, things to check and what the tool could not assess. Downloads include a concise PDF fix list, a full technical PDF and JSON.

Your PDF, extracted text and results stay on your device. Optional AI runs locally; model downloads require consent, with sizes and language coverage shown before you agree. The site loads institutional design assets from the UNDRR asset library.

This is a limited check, not an accessibility certification or a guarantee of accurate AI answers. It does not repair PDFs or interpret chart pixels. See the [implemented profile](docs/PROFILE.md) and [evaluation limits](docs/EVALUATION.md).

## Development

Requires Node.js 24 or later. Built with React, Vite, PDF.js, pdf-lib and Mangrove 2.0.

```sh
npm ci --ignore-scripts
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

Successful builds of `main` deploy to GitHub Pages; pull requests run tests and build checks. The planned PreventionWeb redirect is separate from this deployment.

For implementation details, see [architecture](docs/ARCHITECTURE.md), [UI guidance](docs/UX-ARCHITECTURE.md), [Mangrove integration](docs/MANGROVE.md) and [local AI](docs/SEMANTIC.md). Sample PDFs are committed; regenerate them with `npm run samples` or `npm run calibration`.

## Attribution

PDF Signal Check draws on [PDF-A-go-actionable](https://github.com/khawkins98/PDF-A-go-actionable), by Ken Hawkins, for its browser-local analysis architecture and accessibility-check approach. [pdf-a-go-go](https://github.com/khawkins98/pdf-a-go-go) informed its evidence preview. Both reference projects are MIT licensed; this implementation is independently authored.

The publishing guidance draws on *Making PDFs work for Humans and AI* (UNDRR and OCHA, September 2025). The About page explains the approach and why it matters for shared risk knowledge.

## Licence

Copyright 2026 Ken Hawkins. Licensed under the [Apache License 2.0](LICENSE). Dependencies, model weights, fonts and institutional identity assets retain their own terms; see [third-party notices](THIRD-PARTY-NOTICES.md).
