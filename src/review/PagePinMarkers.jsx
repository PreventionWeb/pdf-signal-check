import React, { useEffect, useMemo, useRef, useState } from 'react';
import { layoutPinMarkers } from './page-pin-layout.js';

const TOOLTIP_BUCKET = { fix: 'Fix', check: 'Check' };

export function GutterMarkers({ pins, boxes, size, page, selected, onSelect, tip, setTip }) {
  const [expanded, setExpanded] = useState(null);
  const root = useRef(null), trigger = useRef(null);
  const groups = useMemo(() => layoutPinMarkers(pins, boxes, size.height), [pins, boxes, size.height]);
  useEffect(() => { setExpanded(null); }, [groups]);
  useEffect(() => {
    if (expanded == null) return;
    const close = event => {
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type === 'pointerdown' && root.current?.contains(event.target)) return;
      setExpanded(null);
      if (event.type === 'keydown') { event.preventDefault(); event.stopPropagation(); trigger.current?.focus(); }
    };
    document.addEventListener('keydown', close, true);
    document.addEventListener('pointerdown', close);
    return () => { document.removeEventListener('keydown', close, true); document.removeEventListener('pointerdown', close); };
  }, [expanded]);
  if (!size.width || !size.height) return null;
  return <div ref={root} className="page-pins-gutter">
    <svg className="page-pins-connectors" viewBox={`0 0 ${size.width + 48} ${size.height}`} aria-hidden="true">
      {groups.flatMap(group => group.items.map(({ pin, box, anchor }) => <path key={pin.number}
        className={pin.number === selected || pin.number === tip ? 'is-selected' : ''}
        d={`M24 ${group.y} L42 ${group.y} L${48 + box.x * size.width} ${anchor}`} />))}
    </svg>
    {groups.map((group, index) => {
      const clustered = group.items.length > 1, pin = group.items[0].pin;
      const active = group.items.some(item => item.pin.number === selected);
      const open = expanded === index;
      return <React.Fragment key={group.items.map(item => item.pin.number).join('-')}>
        <button type="button" className={`page-pins-marker ${active ? 'is-selected' : ''}`} style={{ top: group.y }}
          aria-label={clustered ? `${group.items.length} issues on page ${page}, items ${group.items.map(item => item.pin.number).join(', ')}` : `${pin.number}: ${pin.title}`}
          aria-pressed={!clustered ? active : undefined} aria-expanded={clustered ? open : undefined}
          aria-controls={clustered && open ? `pin-group-${page}-${index}` : undefined}
          aria-describedby={!clustered && tip === pin.number ? `pin-tip-${page}-${pin.number}` : undefined}
          onMouseEnter={() => { if (!clustered) setTip(pin.number); }} onMouseLeave={() => setTip(null)}
          onFocus={() => { if (!clustered) setTip(pin.number); }} onBlur={() => setTip(null)}
          onClick={event => {
            if (clustered) { trigger.current = event.currentTarget; setExpanded(open ? null : index); setTip(null); }
            else onSelect(pin.number);
          }}>
          {clustered ? <span className="page-pin-cluster"><strong>{group.items.length}</strong><span>issues</span></span>
            : <span className={`page-pin page-pin--${pin.bucket}`}>{pin.number}</span>}
        </button>
        {clustered && open && <div id={`pin-group-${page}-${index}`} className="page-pins-cluster-list" style={{ top: Math.max(0, Math.min(group.y - 22, size.height - 240)) }}>
          <div className="page-pins-cluster-heading"><strong>{group.items.length} issues in this area</strong><button type="button" onClick={() => { setExpanded(null); trigger.current?.focus(); }} aria-label="Close issue group">Close</button></div>
          <ul>{group.items.map(({ pin: member }) => <li key={member.number}><button type="button" aria-current={member.number === selected ? 'true' : undefined}
            onClick={() => { setExpanded(null); trigger.current?.focus(); onSelect(member.number); }}>
            <span className={`page-pin page-pin--${member.bucket}`} aria-hidden="true">{member.number}</span><span>{member.title}<small>{TOOLTIP_BUCKET[member.bucket]}</small></span>
          </button></li>)}</ul>
        </div>}
      </React.Fragment>;
    })}
  </div>;
}
