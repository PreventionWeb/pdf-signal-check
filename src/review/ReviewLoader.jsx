import React, { useEffect, useState } from 'react';
import { Button, Loader, Notice } from '../ui/react.jsx';
import { downloadJson } from '../export/download.js';

/** Load the renderer with the results workspace; retain controller-owned results on failure. */
export function ReviewLoader(props) {
  const [View, setView] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setFailed(false);
    import('./Review.jsx').then(module => {
      if (active) setView(() => module.Review);
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => { active = false; };
  }, []);
  if (View) return <View {...props} />;
  if (failed) return <Notice title="Results interface unavailable" headingLevel="h1" variant="warning">
    <p>Your completed analysis is retained. Download it before reloading the page; reloading clears this browser session.</p>
    <Button onClick={() => props.controller.go("document")}>Back to PDF selection</Button>
    <Button onClick={() => downloadJson(props.state.report, 'pdf-signal-check-analysis.json')}>Download analysis JSON</Button>
  </Notice>;
  return <div role="status"><h1 id="flow-title" className="flow-title" tabIndex={-1}>{props.state.modelBusy ? "Checking your PDF" : "Loading your results"}</h1><Loader label="Loading the review interface…" /></div>;
}
