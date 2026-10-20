import React, { useState } from 'react';
import { Button } from '../ui/react.jsx';
import { FigureContext } from './FigureContext.jsx';

const LIMIT = 30;
/** Every image in the group as a short list; each one opens in the page viewer, which does the showing. */
export function FigureGroup({ finding, onInspect }) {
  const [limit, setLimit] = useState(LIMIT);
  return <section aria-label="Images in this group" className="figure-group-list">
    {finding.members.slice(0, limit).map(member => <FigureContext key={member.id} finding={member} targets={member.targets || []} onInspect={onInspect} compact />)}
    {finding.members.length > limit && <Button onClick={() => setLimit(value => value + LIMIT)}>Show {Math.min(LIMIT, finding.members.length - limit)} more ({finding.members.length - limit} remaining)</Button>}
  </section>;
}
