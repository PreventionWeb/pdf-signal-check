import React from 'react';

/** Landing introduction: what the tool is for and why it matters, in the native Mangrove split hero. */
export function IntakeHero({ onAbout }) {
  return <section className="mg-hero mg-hero--split mg-hero--split-2-3 result-hero intake-hero" aria-labelledby="flow-title">
    {/* Full-bleed band; the inner container aligns the copy with the page content below. */}
    <div className="mg-container mg-container--slim">
    <div className="mg-hero__split-grid">
      <div className="mg-hero__content">
        <h1 id="flow-title" className="mg-hero__title flow-title" tabIndex={-1}>Help people and their tools understand your PDF</h1>
        <p className="mg-hero__summaryText">People see the page, listen with a screen reader, or find answers through search, research tools and AI chatbots. A PDF can look clear while its hidden structure loses a chart’s meaning, scrambles steps or points to the wrong year.</p>
        <p>PDF Signal Check looks for these problems and gives you a fix list to send to whoever made the PDF. Review the evidence, correct the source document and check the new export. <a className="intake-hero-link" href="#about" onClick={event => { event.preventDefault(); onAbout(); }}>Why this matters</a></p>
        <p className="intake-hero-note">Optional local AI compares titles, descriptions and headings with text. The tool doesn’t interpret charts or guarantee accessibility, search visibility or accurate AI answers.</p>
      </div>
      <div className="mg-hero__media mg-hero__media--html intake-hero-points">
        <ul>
          <li><strong>See what needs attention</strong><span>Review the evidence, with page pins where an issue can be located.</span></li>
          <li><strong>Get a fix list for your designer</strong><span>Download it as a PDF to share.</span></li>
          <li><strong>Private by design</strong><span>Your PDF never leaves this device. No account needed.</span></li>
        </ul>
      </div>
    </div>
    </div>
  </section>;
}
