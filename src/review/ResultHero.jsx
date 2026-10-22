import React from 'react';
import { formatBytes } from "../ui/progress.js";

/** Contained Mangrove hero: outcome headline, small filename, where to start, a receipt with the scope caveat, and the report downloads. */
export function ResultHero({ overview, titleId, file, exports }) {
  return <section className="mg-hero mg-hero--split mg-hero--contained result-hero" aria-labelledby={titleId}>
    <div className="mg-hero__split-grid">
    <div className="mg-hero__content">
      <h1 id={titleId} className="mg-hero__title flow-title" tabIndex={-1}>{overview.headline}</h1>
      {file && <p className="result-hero-file">{file.name} · {formatBytes(file.size)}</p>}
      {overview.nextStep && <p className="result-hero-lead">{overview.nextStep}</p>}
      {overview.checkedWith && <p className="result-hero-receipt">{overview.checkedWith}{overview.scope ? ` ${overview.scope}` : ""}</p>}
      {exports}
    </div>
    </div>
  </section>;
}
