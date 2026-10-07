import React, { useState } from 'react';
import { Button, Checkbox, Select } from '../ui/react.jsx';
import { FigureContext } from './FigureContext.jsx';

/** Render one source crop at a time, even for documents with hundreds of figures. */
export function FigureGroup({ finding, file, report, reviewed, onReviewed, onInspect }) {
  const [index, setIndex] = useState(0);
  const member = finding.members[Math.min(index, finding.members.length - 1)];
  const done = finding.members.filter(item => reviewed.has(item.id)).length;
  return <section aria-label="Images in this review group">
    {finding.members.length > 1 && <>
    <p>{index + 1} of {finding.members.length} · {done} reviewed</p>
    <Select label="Choose an image or page" value={String(index)} onChange={event => setIndex(Number(event.target.value))}
      options={finding.members.map((item, position) => ({ value: String(position), label: `${position + 1}. ${item.comparison.figure.tagged ? `Image ${item.comparison.figureNumber || 1}` : 'Graphics'} · page ${item.comparison.figure.page}${reviewed.has(item.id) ? ' · Reviewed' : ''}` }))} />
    <div className="figure-group-actions">
      <Button disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous</Button>
      <Button disabled={index === finding.members.length - 1} onClick={() => setIndex(index + 1)}>Next</Button>
      <Button disabled={done === finding.members.length} onClick={() => {
        const next = finding.members.findIndex((item, position) => position > index && !reviewed.has(item.id));
        setIndex(next >= 0 ? next : finding.members.findIndex(item => !reviewed.has(item.id)));
      }}>Next unreviewed</Button>
    </div>
    </>}
    <FigureContext key={member.id} finding={member} file={file} report={report} targets={member.targets || []} onInspect={onInspect} />
    <Checkbox id={`figure-member-${member.id}`} label="Reviewed this image or page" checked={reviewed.has(member.id)} onChange={() => onReviewed(member.id)} />
  </section>;
}
