import React, { useState } from 'react';
import { Button, Select } from '../ui/react.jsx';
import { FigureContext } from './FigureContext.jsx';

/** Render one source crop at a time, even for documents with hundreds of figures. */
export function FigureGroup({ finding, file, report, onInspect }) {
  const [index, setIndex] = useState(0);
  const member = finding.members[Math.min(index, finding.members.length - 1)];
  return <section aria-label="Images in this group">
    {finding.members.length > 1 && <>
    <Select label={`Image ${index + 1} of ${finding.members.length}`} value={String(index)} onChange={event => setIndex(Number(event.target.value))}
      options={finding.members.map((item, position) => ({ value: String(position), label: `${position + 1}. ${item.comparison.figure.tagged ? `Image ${item.comparison.figureNumber || 1}` : 'Graphics'} · page ${item.comparison.figure.page}` }))} />
    <div className="figure-group-actions">
      <Button disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous</Button>
      <Button disabled={index === finding.members.length - 1} onClick={() => setIndex(index + 1)}>Next</Button>
    </div>
    </>}
    <FigureContext key={member.id} finding={member} file={file} report={report} targets={member.targets || []} onInspect={onInspect} />
  </section>;
}
