import React, { useContext, useEffect, useRef } from 'react';
import { PlaceContext } from './places.jsx';
import { descriptionNote } from './workspace.js';

/** Said once for the whole group, instead of under every page. */
const INTRO = {
  unlabelled: 'These graphics have no image label and are not marked as decoration. They may be background shapes, borders or meaningful content. Look at each one and decide.',
  decorative: 'These graphics are marked as decoration, so software following the PDF’s tags may skip them. Check that none of them conveys essential information.',
};
const kindOf = figure => figure.decorative ? 'decorative' : figure.tagged ? 'image' : 'unlabelled';

/**
 * Every image in the group as one compact list: a shared explanation, then one row per page or image with only what
 * differs (its saved description, or what the tool sees). Choosing a row shows it in the page viewer; the row on screen is marked.
 */
export function FigureGroup({ finding, places = [], index = -1, onGo }) {
  const { narrow } = useContext(PlaceContext);
  const list = useRef(null);
  useEffect(() => {
    list.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [index]);
  const kinds = new Set(finding.members.map(member => kindOf(member.comparison.figure)));
  const intro = kinds.size === 1 ? INTRO[[...kinds][0]] : null;
  const detailOf = figure => figure.alt ? `“${figure.alt.trim()}”` : figure.reasons?.length ? `The tool sees ${figure.reasons.join('; ')}` : kindOf(figure) === 'image' ? 'No description saved' : null;
  // When no row has anything of its own to say, the pages alone are the list: compact page buttons.
  const plain = kinds.size === 1 && finding.members.every(member => !detailOf(member.comparison.figure) && !descriptionNote(member));
  if (plain) return <section aria-label="Pages in this group" className="figure-group">
    {intro && <p className="figure-group-intro">{intro}</p>}
    <ol className="figure-group-pages" ref={list}>{finding.members.map((member, at) => {
      const current = !narrow && at === index;
      return <li key={member.id} aria-current={current ? 'true' : undefined}>
        <button type="button" className="figure-group-page" aria-pressed={current} onClick={() => onGo(at)}>Page {member.comparison.figure.page}</button>
      </li>;
    })}</ol>
  </section>;
  return <section aria-label="Images in this group" className="figure-group">
    {intro && <p className="figure-group-intro">{intro}</p>}
    <ol className="place-text-list figure-group-list" ref={list}>{finding.members.map((member, at) => {
      const figure = member.comparison.figure, note = descriptionNote(member), current = !narrow && at === index;
      const name = kindOf(figure) === 'image' ? `Page ${figure.page}, image ${member.comparison.figureNumber || 1}` : `Page ${figure.page}`;
      const detail = detailOf(figure);
      return <li key={member.id} aria-current={current ? 'true' : undefined}>
        <button type="button" className="place-text-item" onClick={() => onGo(at)}>
          <span className="place-text-page">{name}</span>
          <span className="place-text-quote">{detail || (kinds.size > 1 ? (figure.decorative ? 'Marked as decoration' : 'Unlabelled graphics') : 'Graphics on this page')}
            {note && <span className="figure-group-note">{note}</span>}</span>
        </button>
      </li>;
    })}</ol>
  </section>;
}
