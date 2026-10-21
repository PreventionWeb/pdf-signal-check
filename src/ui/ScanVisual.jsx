import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Decorative picture of the work in progress. Items travel right to left past a fixed scan line, or rise past a reading line
 * for text, and they move only when real progress is reported: `completed` is the number of items done. Nothing runs on a
 * timer apart from a gentle idle shimmer on the line. Screen readers get the plain status text beside it, not this.
 *
 * kinds: "pages" (page outlines), "text" (lines of text), "images" (the actual image crops, from blobs already on this device).
 */
const WINDOW = { pages: [3, 4], text: [3, 3], images: [3, 4] };

/** Object URLs for the crops in view: made once per crop, revoked when it leaves the window and when the picture goes. */
function usePreviewUrls(blobs, from, to) {
  const cache = useRef(new Map());
  const [, redraw] = useState(0);
  useEffect(() => {
    if (!blobs?.length) return;
    let changed = false;
    for (const [i, url] of cache.current) if (i < from || i >= to) { URL.revokeObjectURL(url); cache.current.delete(i); changed = true; }
    for (let i = Math.max(0, from); i < Math.min(blobs.length, to); i++)
      if (blobs[i] && !cache.current.has(i)) { cache.current.set(i, URL.createObjectURL(blobs[i])); changed = true; }
    if (changed) redraw(value => value + 1);
  }, [blobs, from, to]);
  useEffect(() => () => { for (const url of cache.current.values()) URL.revokeObjectURL(url); cache.current.clear(); }, []);
  return cache.current;
}

/** A fixed pseudo-random width for a text line, so each line keeps its shape as it moves. */
const lineWidth = i => 45 + ((i * 37) % 50);

export function ScanVisual({ kind, completed, total, previews = null }) {
  const done = Number.isFinite(completed) ? Math.max(0, Math.min(completed, total || completed)) : 0;
  const [before, after] = WINDOW[kind] || WINDOW.pages;
  const from = done - before, to = done + after;
  const urls = usePreviewUrls(kind === "images" ? previews : null, from, to);
  const indexes = useMemo(() => {
    const list = [];
    for (let i = Math.max(0, from); i < (total > 0 ? Math.min(total, to) : to); i++) list.push(i);
    return list;
  }, [from, to, total]);
  return <div className={`scan scan--${kind}`} aria-hidden="true">
    <span className="scan-line" />
    {kind === "images" && <span className="scan-lens" />}
    {indexes.map(i => {
      const offset = i - done, state = i < done ? "is-done" : i === done ? "is-current" : "is-waiting";
      const style = kind === "text" ? { "--offset": offset, "--width": `${lineWidth(i)}%` } : { "--offset": offset };
      if (kind === "text") return <span key={i} className={`scan-item scan-text ${state}`} style={style} />;
      if (kind === "images") return <span key={i} className={`scan-item scan-image ${state}`} style={style}>
        {urls.get(i) ? <img src={urls.get(i)} alt="" /> : null}
      </span>;
      return <span key={i} className={`scan-item scan-page ${state}`} style={style}>
        <span /><span /><span /><span />
      </span>;
    })}
  </div>;
}
