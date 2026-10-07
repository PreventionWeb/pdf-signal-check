import React from 'react';
import { Button } from '../ui/react.jsx';
import { requiredCheckScore } from './check-score.js';

/** Native Mangrove split-hero adaptation: safe text slots, focusable heading and button actions. */
export function ResultHero({ report, overview, titleId, file, exports, onChoose, onStart }) {
  const score = requiredCheckScore(report);
  return <section className="mg-hero mg-hero--split mg-hero--split-2-3 mg-hero--contained result-hero" aria-labelledby={titleId}>
    <div className="mg-hero__split-grid">
      <div className="mg-hero__content">
        <h1 id={titleId} className="mg-hero__title flow-title" tabIndex={-1}>{overview.headline}</h1>
        {file && <p className="result-hero-file">{file.name} · {(file.size / 1e6).toFixed(2)} MB</p>}
        {overview.scope && <p className="mg-hero__summaryText">{overview.scope}</p>}
        {overview.nextStep && <p>{overview.nextStep}</p>}
        <div className="mg-hero__buttons">
          <Button onClick={onChoose}>Choose another PDF</Button>
          {onStart && <Button onClick={onStart}>Start reviewing this PDF</Button>}
        </div>
        {exports}
      </div>
      <div className="mg-hero__media result-hero-score">
        {overview.criticalCount > 0 ? <>
          <span className="result-hero-number">{overview.criticalCount}</span>
          <strong>Critical {overview.criticalCount === 1 ? 'issue' : 'issues'}</strong>
          <span className="result-hero-score-note">Address these issues before relying on this PDF.</span>
        </> : score ? <>
          <span className="result-hero-number" aria-label={`${score.openEnded ? 'At least ' : ''}${score.percent}% of required checks passed`}>{score.percent}<span className="result-hero-percent">%{score.openEnded ? '+' : ''}</span></span>
          <strong>Required checks passed</strong>
          <span>{score.passed} of {score.total} applicable checks</span>
          {score.openEnded && <span className="result-hero-score-note">+ means the remaining required checks could not be confirmed.</span>}
          <span className="result-hero-score-note">AI suggestions and manual review are separate.</span>
        </> : <><span className="result-hero-number result-hero-number--unavailable">—</span><strong>No score available</strong><span>The required checks could not finish.</span></>}
      </div>
    </div>
  </section>;
}
