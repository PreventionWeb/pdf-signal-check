# Noto Kufi Arabic

Version: 1.1.0

Noto Kufi Arabic is a kufi-style Arabic typeface from Google's Noto family. Kufi is the angular, geometric Arabic style — high contrast and architectural, which reads well at display sizes.

**Usage: Arabic headings**, in line with [OCHA brand guidelines](https://brand.unocha.org/document/281801#/fonts/fonts).

This version adds **Regular (400)** alongside Bold. [`v1.0.0`](../v1.0.0/README.md) shipped Bold only in the `arabic` subset; it is unchanged and still served, so existing references keep working.

## Where these files came from

Repackaged from [`@fontsource/noto-kufi-arabic`](https://www.npmjs.com/package/@fontsource/noto-kufi-arabic) **v5.3.0**,
which builds its WOFF/WOFF2 from the upstream [Noto source](https://github.com/notofonts/arabic). Same source as the other Noto
families in this library, so file naming is consistent.

Nothing here is re-hinted or re-subset by us — the files are copied verbatim from that package.

## License

**SIL Open Font License 1.1** (OFL-1.1). Full text in [`OFL.txt`](OFL.txt), copied from the upstream package.

The OFL permits use, embedding and redistribution, including in commercial work. It does require that the
font itself is not sold on its own, and that any modified version is released under the OFL under a
different name.

## Weights

- **Regular** (400)
- **Bold** (700)

All in WOFF2. See [Why WOFF2 only](#why-woff2-only) below.

## What is covered

| Subset | Script coverage | Unicode ranges |
|--------|-----------------|----------------|
| `arabic` | Arabic, Arabic Supplement, Arabic Extended-A/B, Arabic Presentation Forms | `U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF` |
| `latin` | Basic Latin and Latin-1 Supplement — English and most Western European languages, plus common punctuation, the euro and a few symbols | `U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD` |
| `latin-ext` | Latin Extended-A/B and Additional — Central/Eastern European, Baltic, Turkish, Welsh, Vietnamese diacritics | `U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+2C60-2C7F, U+A720-A7FF` |

### What is *not* covered

The upstream package also builds `math`, `symbols`, which are **not published here**. If you need them, add a new
version folder — version directories are immutable, so never add files to this one.

Characters outside the ranges above fall back to the next font in your `font-family` stack.

## Why WOFF2 only

No WOFF (v1) files are published for this font — WOFF2 only.

Browsers that support WOFF but not WOFF2 are about **0.28%** of global traffic, and IE11 is 0.27 of
that on its own; Microsoft ended support for it in June 2022. The remainder is Firefox 5, iOS 7/9
Safari and Android Browser 4.4.

Shipping both costs users nothing — the browser picks the first format it supports from the `src:`
list and never fetches the other — so this is about not carrying files for a population that has
effectively gone, rather than about page weight.

Earlier font versions in this library (Roboto, Roboto Condensed, Dubai, and Noto Kufi Arabic
[`v1.0.0`](../../noto-kufi-arabic/v1.0.0/README.md)) still ship both formats and are unchanged.
Those `.woff` files are deprecated and targeted for removal at the end of 2026, gated on an audit
confirming nothing still references them — see [the format policy](../../README.md#woff-v1-deprecation).

## Specimen

<style>
  @font-face {
    font-family: 'Noto Kufi Arabic Demo';
    src: url('/fonts/noto-kufi-arabic/v1.1.0/Regular/noto-kufi-arabic-arabic-400-normal.woff2') format('woff2');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'Noto Kufi Arabic Demo';
    src: url('/fonts/noto-kufi-arabic/v1.1.0/Bold/noto-kufi-arabic-arabic-700-normal.woff2') format('woff2');
    font-weight: 700;
    font-style: normal;
    font-display: swap;
  }
  .fs-demo { font-family: 'Noto Kufi Arabic Demo', system-ui, sans-serif; border:1px solid #ccc; border-radius:6px; padding:1rem 1.25rem; margin:1rem 0; }
  .fs-demo p { line-height:1.4; }
</style>
<div class="fs-demo">
  <p dir="rtl" lang="ar" style="font-weight:400;font-size:2rem;margin:.4em 0">الحد من مخاطر الكوارث</p>
  <p dir="rtl" lang="ar" style="font-weight:400;font-size:1.1rem;margin:.2em 0 1em">الأمم المتحدة — Regular (400)</p>
  <p style="font-weight:400;font-size:2rem;margin:.4em 0">Disaster risk reduction</p>
  <p style="font-weight:400;font-size:1.1rem;margin:.2em 0 1em">Sendai Framework 2015–2030 — Regular (400)</p>
  <p dir="rtl" lang="ar" style="font-weight:700;font-size:2rem;margin:.4em 0">الحد من مخاطر الكوارث</p>
  <p dir="rtl" lang="ar" style="font-weight:700;font-size:1.1rem;margin:.2em 0 1em">الأمم المتحدة — Bold (700)</p>
  <p style="font-weight:700;font-size:2rem;margin:.4em 0">Disaster risk reduction</p>
  <p style="font-weight:700;font-size:1.1rem;margin:.2em 0 1em">Sendai Framework 2015–2030 — Bold (700)</p>
</div>

*The specimen above renders only on the asset library's own rendered pages, where the fonts resolve from
the same origin. In a plain Markdown viewer it will show as fallback text.*

## Files

| Subset | Weight | Path |
|--------|--------|------|
| `arabic` | 400 | `Regular/noto-kufi-arabic-arabic-400-normal.woff2` |
| `latin` | 400 | `Regular/noto-kufi-arabic-latin-400-normal.woff2` |
| `latin-ext` | 400 | `Regular/noto-kufi-arabic-latin-ext-400-normal.woff2` |
| `arabic` | 700 | `Bold/noto-kufi-arabic-arabic-700-normal.woff2` |
| `latin` | 700 | `Bold/noto-kufi-arabic-latin-700-normal.woff2` |
| `latin-ext` | 700 | `Bold/noto-kufi-arabic-latin-ext-700-normal.woff2` |


## Usage in CSS

Declares the `arabic` subset. Add further `@font-face` blocks with a `unicode-range` for the other
subsets if you want the browser to fetch them only when needed.

```css
@font-face {
  font-family: 'Noto Kufi Arabic';
  src: url('https://assets.undrr.org/fonts/noto-kufi-arabic/v1.1.0/Regular/noto-kufi-arabic-arabic-400-normal.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Noto Kufi Arabic';
  src: url('https://assets.undrr.org/fonts/noto-kufi-arabic/v1.1.0/Bold/noto-kufi-arabic-arabic-700-normal.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
```

## References

- [OCHA Brand Guidelines — Fonts](https://brand.unocha.org/document/281801#/fonts/fonts)
- [Mangrove PR #677](https://github.com/unisdr/undrr-mangrove/pull/677)
- [Web Backlog Issue #2368](https://gitlab.com/undrr/web-backlog/-/issues/2368)

## Links

- [Google Fonts specimen](https://fonts.google.com/noto/specimen/Noto+Kufi+Arabic)
- [Upstream source](https://github.com/notofonts/arabic)
- [Fontsource package](https://fontsource.org/fonts/noto-kufi-arabic)
