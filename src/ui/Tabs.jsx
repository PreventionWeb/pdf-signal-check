import React, { useId, useRef } from 'react';

/** Mangrove Tab accepts HTML strings; this adapter keeps interactive panels React-owned. */
export function Tabs({ tabs, value, onChange, disabled = false, label }) {
  const id = useId();
  const buttons = useRef([]);
  const select = index => {
    if (disabled) return;
    onChange(tabs[index].value);
    buttons.current[index]?.focus();
  };
  return <div className="mg-tabs mg-tabs--horizontal intake-tabs">
    <div className="mg-tabs__rail"><div className="mg-tabs__scroll">
    <div className="mg-tabs__list" role="tablist" aria-label={label}>
      {tabs.map((tab, index) => <div className="mg-tabs__item" role="presentation" key={tab.value}>
        <button type="button" role="tab" className={`mg-tabs__link ${value === tab.value ? 'is-active' : ''}`}
          ref={element => { buttons.current[index] = element; }}
          id={`${id}-tab-${tab.value}`} aria-controls={`${id}-panel-${tab.value}`}
          aria-selected={value === tab.value} tabIndex={value === tab.value ? 0 : -1}
          disabled={disabled} onClick={() => select(index)} onKeyDown={event => {
            const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
              : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length
                : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
            if (next != null) { event.preventDefault(); select(next); }
          }}>{tab.label}</button>
      </div>)}
    </div>
    </div></div>
    <div className="mg-tabs__panels">
      {tabs.map(tab => <div className="mg-tabs-content" key={tab.value} hidden={value !== tab.value}><section className="mg-tabs__section" role="tabpanel"
        id={`${id}-panel-${tab.value}`} aria-labelledby={`${id}-tab-${tab.value}`}
        hidden={value !== tab.value} tabIndex={0}>
        {value === tab.value ? tab.content : null}
      </section></div>)}
    </div>
  </div>;
}
