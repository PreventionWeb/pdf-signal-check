# Fonts

Web fonts published in the UNDRR asset library.

**Base URL:** `https://assets.undrr.org/fonts/`

## Families

| Family | Version | Weights | Formats | Notes |
|--------|---------|---------|---------|-------|
| [Roboto](roboto/v1.0.0/) | v1.0.0 | Thin–Black, with italics | WOFF2 + WOFF | Latin UI and body face |
| [Roboto Condensed](roboto-condensed/v1.0.0/) | v1.0.0 | Light–Bold, with italics | WOFF2 + WOFF | Condensed variant |
| [Dubai](dubai/v1.0.0/README.md) | v1.0.0 | Regular, Bold | WOFF2 + WOFF | Arabic; free worldwide |
| [Noto Kufi Arabic](noto-kufi-arabic/v1.1.0/README.md) | **v1.1.0** | Regular, Bold | WOFF2 | Arabic headings |
| [Noto Kufi Arabic](noto-kufi-arabic/v1.0.0/README.md) | v1.0.0 | Bold | WOFF2 + WOFF | Superseded by v1.1.0 |
| [Noto Naskh Arabic](noto-naskh-arabic/v1.0.0/README.md) | v1.0.0 | Regular, Bold | WOFF2 | Arabic body text |
| [Noto Sans](noto-sans/v1.0.0/README.md) | v1.0.0 | Regular, Bold | WOFF2 | Latin body text; **no Arabic glyphs** |
| [Noto Sans Arabic](noto-sans-arabic/v1.0.0/README.md) | v1.0.0 | Regular, Bold | WOFF2 | Arabic companion to Noto Sans |

Each family README lists its licence, subset coverage with unicode ranges, ready-to-paste
`@font-face` CSS, and a rendered specimen.

## Format policy

**New font versions ship WOFF2 only.**

Browsers that support WOFF (v1) but not WOFF2 are roughly **0.28%** of global traffic, and IE11 —
out of support since June 2022 — accounts for 0.27 of that on its own. The remainder is Firefox 5,
iOS 7/9 Safari and Android Browser 4.4.

This is not a page-weight decision. A browser picks the first format it supports from the `src:`
list and never downloads the other, so shipping both costs users nothing. It is about not carrying
files for a population that has effectively gone.

### WOFF v1 deprecation

The 21 remaining `.woff` files — in Roboto, Roboto Condensed, Dubai and Noto Kufi Arabic v1.0.0 —
are **deprecated and targeted for removal at the end of 2026**.

Removal is *not* automatic, because it cuts against this library's immutability rule: anything
already published must keep resolving. Before deleting them, someone needs to confirm no consumer
still lists a `.woff` in a `src:` fallback — a stale reference would start 404ing. That means, at
minimum:

1. Audit Mangrove and the consuming Drupal sites for `.woff` references (`grep` for `.woff'` and
   `.woff"`, excluding `.woff2`).
2. Check asset-library access logs for `.woff` requests over a representative period.
3. Only then remove, in a single commit that says what was checked.

If either check finds live usage, the deadline moves rather than the files.

In the meantime, **do not add new `.woff` files**, and drop the `.woff` line from any `@font-face`
snippet you copy from an older README.
