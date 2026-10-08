import React from 'react';
import { createRoot } from 'react-dom/client';
import { initializePresentationBrand } from '../brand.js';
import { StoryPlayer } from './StoryPlayer.jsx';
import snapshot from './snapshot.json';
import '../style.css';
import './story.css';

/** Standalone story page while the piece is refined; it may later move onto the homepage. */
function StoryPage() {
  const app = path => { location.href = new URL(path, document.baseURI).href; };
  return <>
    <header className="story-topbar">
      <div className="mg-container mg-container--slim"><a href="./">← PDF Signal Check</a></div>
    </header>
    <main id="main">
      <section className="mg-hero mg-hero--split result-hero intake-hero story-hero" aria-labelledby="story-title">
        <div className="mg-container mg-container--slim">
          <div className="mg-hero__split-grid story-hero-grid">
            <div className="mg-hero__content">
              <h1 id="story-title" className="mg-hero__title">Your report says it. But can everyone understand it?</h1>
              <p className="mg-hero__summaryText">Follow one finding from the page to people and the tools they use: data tools, web search and AI chatbots. See where a PDF’s hidden structure can lose its meaning.</p>
            </div>
          </div>
        </div>
      </section>
      <div className="mg-container mg-container--slim">
        <StoryPlayer data={snapshot} onCheck={() => app('./')} onAbout={() => app('./#about')} />
        <p className="story-footnote">A synthetic example: the report, data and people are fictional. <a href="./#about">Read the guidance behind it</a>.</p>
      </div>
    </main>
  </>;
}

initializePresentationBrand();
createRoot(document.getElementById('root')).render(<React.StrictMode><StoryPage /></React.StrictMode>);
