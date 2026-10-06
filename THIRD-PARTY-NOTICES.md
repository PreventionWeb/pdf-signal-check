# References and third party software

PDF Signal Check is independently authored by Ken Hawkins under the MIT license.

## Reference projects

[PDF-A-go-actionable](https://github.com/khawkins98/PDF-A-go-actionable), Ken Hawkins, MIT. Its browser-local analysis architecture and accessibility checks informed this project. No application modules were copied. Its evidence-to-preview interaction informed the independently authored viewer.

[pdf-a-go-go](https://github.com/khawkins98/pdf-a-go-go), Ken Hawkins, MIT. Its PDF.js rendering, coordinate conversion, instance-scoped overlays, and canvas resource management informed the independently authored preview.

## Runtime dependencies

| Software | License | Source |
| --- | --- | --- |
| PDF.js and its distributed decoding assets | Apache 2.0; individual bundled assets may include their own notices | [Mozilla PDF.js](https://github.com/mozilla/pdf.js) |
| pdf-lib | MIT | [pdf-lib](https://github.com/Hopding/pdf-lib) |
| @pdf-lib/fontkit 1.1.1 | MIT | [fontkit](https://github.com/Hopding/fontkit) |
| Transformers.js | Apache 2.0 | [Transformers.js](https://github.com/huggingface/transformers.js) |
| ONNX Runtime, included through Transformers.js | MIT | [ONNX Runtime](https://github.com/microsoft/onnxruntime) |
| xmldom | MIT | [xmldom](https://github.com/xmldom/xmldom) |
| all-MiniLM-L6-v2 model, optional download | Apache 2.0 | [Original model](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2), [ONNX export](https://huggingface.co/Xenova/all-MiniLM-L6-v2) |
| Granite embedding 97M multilingual R2 model, optional download | Apache 2.0 | [IBM original model](https://huggingface.co/ibm-granite/granite-embedding-97m-multilingual-r2), [ONNX export](https://huggingface.co/onnx-community/granite-embedding-97m-multilingual-r2-ONNX) |

The build copies dependency license notices into `dist/licenses`. Model files retain the original model terms. Other researched models are not distributed by this application.

The ONNX Runtime notice in `third-party/onnxruntime-LICENSE.txt` was obtained from upstream revision `8d85527a010e294a26b274749f74294b2a32cec5`, matching the installed web runtime's recorded source commit.

## Report font and font embedding

`public/fonts/NotoSans-Regular.ttf` is unmodified Noto Sans Regular from the Noto Project's archived font repository: https://github.com/notofonts/noto-fonts/blob/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf . Copyright 2018 The Noto Project Authors. Licensed under SIL Open Font License 1.1; full notice is bundled at `public/fonts/OFL.txt`. The vendored font's SHA-256 is `b85c38ecea8a7cfb39c24e395a4007474fa5a4fc864f6ee33309eb4948d232d5`. No external font host is contacted at export time.

`@pdf-lib/fontkit` 1.1.1 is the MIT-licensed pdf-lib font embedding library: https://github.com/Hopding/fontkit . Its package metadata and upstream README declare MIT; that distribution omits a standalone license file. The preparation step preserves the upstream README and actual bundled legal comment blocks in `licenses/fontkit-README.txt` and `licenses/fontkit-bundled-NOTICES.txt`. Report fonts are subset into generated PDFs. Font coverage is checked per code point; text outside it uses a conspicuously disclosed browser-raster fallback, not silent transliteration or replacement. Raster fallback is not selectable/extractable and depends on fonts available to the browser; exact Unicode values are preserved in detailed JSON.

## Mangrove presentation assets

The locally vendored UNDRR theme of [Mangrove 2.0.0](https://github.com/PreventionWeb/undrr-mangrove) uses Apache License 2.0, preserved at `public/vendor/mangrove/2.0.0/LICENSE.txt`. CSS URL references are rewritten to local assets; original CSS and a per-asset upstream/hash manifest are retained. No upstream analytics, cookie or syndicated-footer scripts are distributed or loaded.

Roboto and Roboto Condensed web fonts were fetched from the versioned UNDRR asset library referenced by the official bundle. Their embedded font metadata declares Apache License 2.0; copyright remains with Google and the original authors. Arabic Noto families use SIL OFL 1.1: exact notices are bundled as `noto-kufi-OFL.txt` and `noto-arabic-OFL.txt`. The Fontello icon set's original `icon-font-LICENSE.txt` and `icon-font-README.txt` preserve Font Awesome (Dave Gandy) and Entypo (Daniel Bruce) SIL attribution; the full common legal text is retained in `OFL-1.1.txt`. SVG masks are distributed within the upstream Mangrove CSS.

The UNDRR logo is a separate institutional identity asset obtained from [UNDRR's logo library](https://assets.undrr.org/logos/undrr/README.md); its provenance and usage guide are bundled. It is not relicensed as this project's MIT product mark. See [migration and refresh instructions](docs/MANGROVE.md) for the provisional identity, local-font policy and deliberate future PreventionWeb theme switch.

React and React DOM 19.3.0 are distributed under the MIT license; Vite’s React plugin 6.1.2 is MIT. The published `@undrr/undrr-mangrove` 2.0.0 React components are Apache-2.0 and use the same independently attributed local CSS/fonts/assets described above. Package component imports do not load remote institutional widgets or styles.
