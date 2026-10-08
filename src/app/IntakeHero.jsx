import React from 'react';
import playback from '../story/playback.json';
import './story-preview.css';

const storySeconds = Math.ceil(playback.duration);
const storyMinutes = Math.floor(storySeconds / 60);
const storyRemainder = storySeconds % 60;
const storyTime = `${storyMinutes}:${String(storyRemainder).padStart(2, '0')}`;
const storyTimeSpoken = `${storyMinutes} minute${storyMinutes === 1 ? '' : 's'} ${storyRemainder} second${storyRemainder === 1 ? '' : 's'}`;

/** Landing introduction: what the tool is for and why it matters, in the native Mangrove split hero. */
export function IntakeHero({ onAbout, onWatch }) {
  return <section className="mg-hero mg-hero--split mg-hero--split-2-3 result-hero intake-hero" aria-labelledby="flow-title">
    {/* Full-bleed band; the inner container aligns the copy with the page content below. */}
    <div className="mg-container mg-container--slim">
    <div className="mg-hero__split-grid">
      <div className="mg-hero__content">
        <h1 id="flow-title" className="mg-hero__title flow-title" tabIndex={-1}>Help people and their tools understand your PDF</h1>
        <p className="mg-hero__summaryText">People see the page, listen with a screen reader or find answers through search, research tools and AI chatbots. A PDF can look clear while its hidden structure loses a chart’s meaning, scrambles steps or points to the wrong year.</p>
        <p>PDF Signal Check looks for these problems and gives you a fix list to send to whoever made the PDF. Review the evidence, correct the source document and check the new export. <a className="intake-hero-link" href="#about" onClick={event => { event.preventDefault(); onAbout(); }}>Why this matters</a></p>
        <p className="intake-hero-note">Optional local AI compares titles, descriptions and headings with text. The tool doesn’t interpret charts or guarantee accessibility, search visibility or accurate AI answers.</p>
      </div>
      <div className="mg-hero__media mg-hero__media--html intake-story-preview">
        <a className="intake-story-preview__link" href="#about-video" aria-label={`Watch the story, ${storyTimeSpoken}`} onClick={event => { event.preventDefault(); onWatch(); }}>
          <span className="intake-story-preview__image">
            <img src={`${import.meta.env.BASE_URL}story/poster.webp`} width="960" height="540" alt="Illustrated report chart showing water clarity highest at South, with people and tools below" />
            <span className="intake-story-preview__play" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M8 5.5 19 12 8 18.5Z" /></svg></span>
          </span>
          <span className="intake-story-preview__caption">Watch the story <span aria-hidden="true">·</span> {storyTime}</span>
        </a>
      </div>
    </div>
    </div>
  </section>;
}
