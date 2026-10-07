import React from 'react';
import { Button } from '../ui/react.jsx';

/** Contained Mangrove hero: outcome headline, small filename, one scope sentence and the main actions. */
export function ResultHero({ overview, titleId, file, exports, onChoose }) {
  return <section className="mg-hero mg-hero--split mg-hero--contained result-hero" aria-labelledby={titleId}>
    <div className="mg-hero__split-grid">
    <div className="mg-hero__content">
      <h1 id={titleId} className="mg-hero__title flow-title" tabIndex={-1}>{overview.headline}</h1>
      {file && <p className="result-hero-file">{file.name} · {(file.size / 1e6).toFixed(2)} MB</p>}
      {overview.scope && <p className="result-hero-scope">{overview.scope}</p>}
      {overview.nextStep && <p>{overview.nextStep}</p>}
      <div className="mg-hero__buttons result-hero-actions">
        <Button onClick={onChoose}>Choose another PDF</Button>
        {exports}
      </div>
    </div>
    </div>
  </section>;
}
