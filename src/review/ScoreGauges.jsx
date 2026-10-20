import React from "react";

const RADIUS = 26, CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const auditMark = score => score == null ? "Not checked" : score >= 1 ? "Passed" : score <= 0 ? "Not passed" : `Partly (${Math.round(score * 100)}%)`;
const BAND_WORDS = { good: "Good", average: "Needs work", poor: "Poor" };

/** One Lighthouse-style ring: red below 50, amber below 90, green from 90. The bonus ring keeps one neutral colour: it is never a defect. */
function Gauge({ category, large = false, bonus = false, caption }) {
  const { score, band, label } = category;
  const dash = score == null ? 0 : CIRCUMFERENCE * score / 100;
  return <figure className={`score-gauge score-gauge--${bonus ? "bonus" : band || "none"} ${large ? "score-gauge--large" : ""}`}>
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle className="score-gauge-track" cx="32" cy="32" r={RADIUS} />
      <circle className="score-gauge-value" cx="32" cy="32" r={RADIUS} strokeDasharray={`${dash} ${CIRCUMFERENCE}`} transform="rotate(-90 32 32)" />
      <text x="32" y="33" dominantBaseline="central" textAnchor="middle">{score ?? "–"}</text>
    </svg>
    <figcaption><span className="mg-u-sr-only">{label}{bonus ? " bonus" : ""} score: {score ?? "not available"} out of 100. </span>{!large && <span aria-hidden="true">{caption || label}</span>}</figcaption>
  </figure>;
}

/** Overall score as the lead, the three category rings and the bonus in one even row, with the checks behind them one click away. */
export function ScoreGauges({ scores }) {
  if (!scores) return null;
  const overall = { id: "overall", label: "Overall", score: scores.overall, band: scores.band };
  return <section className="score-gauges" aria-labelledby="score-gauges-title">
    <div className="score-gauges-lead">
      <Gauge category={overall} large />
      <div className="score-gauges-lead-text">
        <h2 id="score-gauges-title" className="score-gauges-title">Overall score{overall.band ? <span className={`score-gauges-band score-gauges-band--${overall.band}`}> · {BAND_WORDS[overall.band]}</span> : null}</h2>
        <p className="model-note">The average of People, AI and search, and Consistency. Uses {scores.decided} of {scores.total} measures; the rest couldn’t be decided and don’t count. Not an accessibility certificate.</p>
      </div>
    </div>
    <div className="score-gauges-row">
      {scores.categories.map(category => <Gauge key={category.id} category={category} />)}
      <div className="score-gauges-bonus">
        <Gauge category={scores.bonus} bonus caption={<><span className="score-gauges-bonus-eyebrow">Bonus</span>{scores.bonus.label}</>} />
      </div>
    </div>
    <details className="score-gauges-detail">
      <summary>How the scores are worked out</summary>
      <p className="model-note">Each measure has a weight; a score is the weighted share of its measures that passed. “Travels further” is a bonus for wider reuse and never enters the overall score. The weights are this tool’s judgement, not a standard.</p>
      {[...scores.categories, scores.bonus].map(category => <section key={category.id}>
        <h3>{category.label}{category.score != null ? `: ${category.score}` : ""}</h3>
        <ul>{category.audits.map(audit => <li key={audit.id}><span>{audit.label}</span> <span className={`score-audit score-audit--${audit.score == null ? "none" : audit.score >= 1 ? "pass" : audit.score <= 0 ? "fail" : "partial"}`}>{auditMark(audit.score)}</span></li>)}</ul>
      </section>)}
    </details>
  </section>;
}
