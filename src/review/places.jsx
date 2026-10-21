import React, { createContext, useContext, useEffect, useRef } from "react";
import { Button } from "../ui/react.jsx";

/**
 * The places on the pages an issue points at, and how the detail pane links to them.
 * On wide screens the viewer already shows the selected issue's first place, so a link to the place on screen is noise:
 * one place needs a button only after the reader scrolls away, and several places get a pager.
 */
export const PlaceContext = createContext({ isShown: () => false, narrow: true });

const anchor = target => target?.quads?.[0] ?? target?.blockIds?.[0] ?? target?.keys?.[0] ?? target?.text;
/** Same place: same page and the same first box, block or text (copies made with spread keep the references). */
export const samePlace = (a, b) => !!a && !!b && a.page === b.page && anchor(a) === anchor(b);

/** An image's place, with a one-line note for the info box beside the highlight. */
export const figureTarget = member => {
  const figure = member.comparison?.figure;
  if (!figure) return member.targets?.[0];
  const target = (member.targets || []).find(item => item.page === figure.page) || { page: figure.page, quads: figure.quads || [] };
  const note = figure.alt ? `Saved description: “${figure.alt.trim()}”` : figure.decorative ? "Marked as decoration, so screen readers skip it." : figure.tagged ? "No description is saved for this image." : "No image label, and not marked as decoration.";
  return { ...target, focusRegion: true, note };
};
const HIDDEN = "Hidden text sits here. It can’t be seen on the page.";

/** Ordered places for an issue: one per member of a group, each hidden passage, or the issue's own targets. */
export function findingPlaces(finding, targets, kind) {
  if (!finding || kind === "order") return [];
  let places;
  if (finding.members) places = finding.members.map(figureTarget);
  else if (finding.source?.path === "hiddenInstructions")
    places = (finding.comparison?.matches || []).filter(match => match.kind === "page" && match.quads?.length)
      .map(match => ({ page: match.page, quads: match.quads, text: match.text, label: HIDDEN }));
  else if (finding.comparison?.figure) places = [figureTarget(finding)];
  else places = targets;
  return (places || []).filter(place => place?.page);
}

/** A per-item link inside a list: hidden on the item the viewer is showing, a button otherwise. */
export function ShowOnPage({ target, onInspect }) {
  const { isShown, narrow } = useContext(PlaceContext);
  if (!target?.page) return null;
  if (!narrow && isShown(target)) return <span className="place-shown">Highlighted on page {target.page}</span>;
  return <Button onClick={() => onInspect(target)}>Show on page {target.page}</Button>;
}

/** The actions-row control: a pager across several places, or a way back to the only one. */
export function PlacePager({ places, index, onGo, inline = false }) {
  const { isShown, narrow } = useContext(PlaceContext);
  if (!places.length) return null;
  if (places.length === 1) {
    // A link beside the item itself already covers a single place.
    if (inline || (!narrow && isShown(places[0]))) return null;
    return <Button variant="primary" onClick={() => onGo(0)}>{narrow ? "Show on" : "Back to"} page {places[0].page}</Button>;
  }
  const at = index >= 0 ? index : null;
  const go = step => onGo(at == null ? 0 : (at + step + places.length) % places.length);
  return <div className="place-pager" role="group" aria-label="Places on the pages">
    <button type="button" className="viewer-button" aria-label="Previous place" onClick={() => go(-1)}>‹</button>
    <span className="place-pager-label" aria-live="polite">{at == null ? `${places.length} places` : `Place ${at + 1} of ${places.length} · page ${places[at].page}`}</span>
    <button type="button" className="viewer-button" aria-label="Next place" onClick={() => go(1)}>›</button>
  </div>;
}

/**
 * The text at each place, written out, for text the reader can't otherwise get at (untagged text a screen reader skips).
 * A scroll box keeps a long list compact; the place on screen is marked and kept in view as the pager moves.
 */
export function PlaceTextList({ places, index, onGo, label }) {
  const { narrow } = useContext(PlaceContext);
  const list = useRef(null);
  useEffect(() => {
    const current = list.current?.querySelector('[aria-current="true"]');
    if (current) current.scrollIntoView({ block: "nearest" });
  }, [index]);
  const shown = places.filter(place => String(place.text || "").trim());
  if (!shown.length) return null;
  return <section className="place-text" aria-label={label}>
    <h3>{label} ({shown.length})</h3>
    <ol className="place-text-list" ref={list}>{shown.map(place => {
      const at = places.indexOf(place), current = !narrow && at === index;
      return <li key={at} aria-current={current ? "true" : undefined}>
        <button type="button" className="place-text-item" onClick={() => onGo(at)}>
          <span className="place-text-page">Page {place.page}</span>
          <span className="place-text-quote">{place.text.trim()}</span>
        </button>
      </li>;
    })}</ol>
  </section>;
}
