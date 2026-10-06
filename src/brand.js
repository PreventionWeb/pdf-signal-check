/** Product-facing labels; repository/profile and preference identifiers stay stable. */
export const PRODUCT_NAME='PDF Signal Check';
export const REPORT_FILENAME_STEM='pdf-signal-check';
export const PRODUCT_DESCRIPTOR='Text, structure, and metadata for machine use.';
export const PRODUCT_TAGLINE='Inspect the PDF. Understand the input.';

/** Pinned visual identity. Replacing it must not alter PDF/source/profile/preference identifiers. */
export const PRESENTATION_BRAND=Object.freeze({
  id:'undrr', designSystem:'Mangrove', version:'2.0.0',
  stylesheet:'./vendor/mangrove/2.0.0/style.css',logo:'./vendor/mangrove/2.0.0/logo.svg',
  logoAlt:'United Nations Office for Disaster Risk Reduction (UNDRR)',
  // Resolved official UNDRR tokens: interactive, text, neutral-600, neutral-25/0.
  exportPalette:Object.freeze({interactive:[0,79,145],text:[26,26,26],muted:[77,77,77],surface:[240,243,246],paper:[255,255,255]})
});
export const cssColor=channels=>`rgb(${channels.join(' ')})`;
export function initializePresentationBrand() {
  const sheet=document.getElementById('mangrove-theme'),logo=document.getElementById('institution-logo'),themeColor=document.querySelector('meta[name=theme-color]');
  if(themeColor)themeColor.content=cssColor(PRESENTATION_BRAND.exportPalette.interactive);
  if(sheet)sheet.href=new URL(PRESENTATION_BRAND.stylesheet,document.baseURI).href;
  if(logo){logo.src=new URL(PRESENTATION_BRAND.logo,document.baseURI).href;logo.alt=PRESENTATION_BRAND.logoAlt;}
}
