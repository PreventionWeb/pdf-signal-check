import React from 'react';

/** Landing introduction: what the tool is for and why it matters, in the native Mangrove split hero. */
export function IntakeHero({ onAbout }) {
  return <section className="mg-hero mg-hero--split mg-hero--split-2-3 result-hero intake-hero" aria-labelledby="flow-title">
    {/* Full-bleed band; the inner container aligns the copy with the page content below. */}
    <div className="mg-container mg-container--slim">
    <div className="mg-hero__split-grid">
      <div className="mg-hero__content">
        <h1 id="flow-title" className="mg-hero__title flow-title" tabIndex={-1}>Find what stops people and AI from understanding your PDF</h1>
        <p className="mg-hero__summaryText">Search engines, chatbots and document assistants are often the first to read your PDF, turning its layout into raw text before a person sees it. If the hidden structure is missing or wrong (tags, reading order, image descriptions, the document’s title and summary), screen readers stumble and AI can give wrong answers about your work.</p>
        <p>PDF Signal Check finds those problems, shows you where they are on the pages, and gives you a fix list to send to whoever made the PDF. <a className="intake-hero-link" href="#about" onClick={event => { event.preventDefault(); onAbout(); }}>Why this matters</a></p>
        <p className="intake-hero-note">Optional local AI also checks whether titles, descriptions and headings match the text. It can’t judge what images or charts mean.</p>
      </div>
      <div className="mg-hero__media mg-hero__media--html intake-hero-points">
        <ul>
          <li><strong>See problems on the pages</strong><span>Numbered pins mark each issue, with what to change.</span></li>
          <li><strong>Get a fix list for your designer</strong><span>Download it as a PDF to share.</span></li>
          <li><strong>Private by design</strong><span>Your PDF never leaves this device. No account needed.</span></li>
        </ul>
      </div>
    </div>
    </div>
  </section>;
}
