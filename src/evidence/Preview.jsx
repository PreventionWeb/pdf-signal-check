import React, { useEffect, useRef, useState } from "react";
import { readingOrderPlacement } from "./reading-order-placement.js";
import { PreviewSession } from "./preview-session.js";
import { Button, Select, Notice } from "../ui/react.jsx";
export function Preview({ file, report, selection }) {
  const canvas = useRef(null),
    svg = useRef(null),
    scroller = useRef(null),
    sheet = useRef(null),
    session = useRef(null),
    [view, setView] = useState({
      message: "Loading preview…",
      counter: "",
      page: selection?.page || 1,
    }),
    [zoom, setZoom] = useState("fit"),
    [mode, setMode] = useState(selection?.overlay || "issues");
  useEffect(() => {
    let active = true;
    const instance = new PreviewSession({
      canvas: canvas.current,
      svg: svg.current,
      scroller: scroller.current,
      sheet: sheet.current,
      onState: (patch) => {
        if (active)
          setView((old) => ({ ...old, ...patch, page: instance.pageNumber }));
      },
    });
    session.current = instance;
    instance.report = report;
    instance.zoom.value = zoom;
    instance.mode.value = mode;
    if (selection) instance.select(selection);
    instance.load(file, report);
    return () => {
      active = false;
      instance.destroy();
      if (session.current === instance) session.current = null;
    };
  }, [file, report.pages]);
  useEffect(() => {
    if (session.current) {
      session.current.zoom.value = zoom;
      session.current.render();
    }
  }, [zoom]);
  useEffect(() => {
    if (session.current) {
      session.current.mode.value = mode;
      session.current.draw();
    }
  }, [mode]);
  useEffect(() => {
    if (selection && session.current) session.current.select(selection);
    else session.current?.clearSelection();
  }, [selection]);
  const pageCount = report.file.pages || 1;
  const latestPage = useRef(view.page);
  latestPage.current = view.page;
  useEffect(() => {
    // Left/Right and Page Up/Down change pages while the preview is open, except inside form controls.
    const onKey = (event) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.target.closest?.("input, select, textarea, [contenteditable]")) return;
      const step = { ArrowLeft: -1, PageUp: -1, ArrowRight: 1, PageDown: 1 }[event.key];
      if (!step) return;
      const next = latestPage.current + step;
      if (next < 1 || next > pageCount) return;
      event.preventDefault();
      session.current?.navigate(next);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pageCount]);
  const currentPage = report.pages.find(page => page.number === view.page);
  const placement = readingOrderPlacement(report, view.page);
  const hasReadingOrder = placement.recovered > 0;
  return (
    <section className="pdf-preview">
      <h3>{mode === "order" ? "Recovered reading order" : "Locate the evidence"}</h3>
      {currentPage?.formXObjectInvocations > 0 && currentPage.evidenceGeometryScoped && <p className="model-note">This page contains reused objects, which are skipped. Numbers show only text whose page location is known.</p>}
      {mode === 'order' && !hasReadingOrder && <Notice variant="warning" headingLevel="h4" title="No machine-readable reading order found on this page">
        <p>The tool could not recover a sequence telling software which text to read first, next and last. The PDF’s structure labels may be missing or could not be read.</p>
        <p>In the source document, check the heading and paragraph structure, then export with PDF tags enabled. For an existing PDF, use a PDF accessibility editor to add or repair the reading order.</p>
      </Notice>}
      {mode === 'order' && hasReadingOrder && placement.located === 0 && <Notice variant="warning" headingLevel="h4" title="Reading-order text was recovered, but it could not be placed on this page">
        <p>No reading-order numbers can be shown on the image. Use the ordered text list below the page to compare the recovered sequence with the order you expect.</p>
        {placement.unsafe && <p>This page uses reusable content whose locations this tool cannot resolve. Other pages may have located evidence.</p>}
      </Notice>}
      {mode === 'order' && placement.located > 0 && placement.unlocated > 0 && <p className="model-note">{placement.located} of {placement.recovered} recovered text entries can be numbered on this page. {placement.unlocated} could not be placed; all recovered entries remain in the ordered text list.</p>}
      <div className="preview-controls mg-u-flex mg-u-flex-wrap mg-u-align-items-center mg-u-gap-100">
        <Button
          aria-label="Previous page"
          aria-keyshortcuts="ArrowLeft PageUp"
          title="Previous page (← or Page Up)"
          disabled={view.page === 1}
          onClick={() => session.current?.navigate(view.page - 1)}
        >
          ←
        </Button>
        <span>{view.counter}</span>
        <Button
          aria-label="Next page"
          aria-keyshortcuts="ArrowRight PageDown"
          title="Next page (→ or Page Down)"
          disabled={view.page >= pageCount}
          onClick={() => session.current?.navigate(view.page + 1)}
        >
          →
        </Button>
        <Select
          id="preview-zoom"
          label="Preview zoom"
          hideLabel
          value={zoom}
          onChange={(e) => setZoom(e.target.value)}
          options={[
            ["fit", "Fit width (max 100%)"],
            ["0.75", "75%"],
            ["1", "100%"],
            ["1.5", "150%"],
            ["2", "200%"],
          ].map(([value, label]) => ({ value, label }))}
        />
        <Select
          id="preview-overlay"
          label="Evidence overlay"
          hideLabel
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          options={[
            ["issues", "Issue regions"],
            ["order", !hasReadingOrder ? "Reading order (none found)" : placement.located === 0 ? "Reading order (text only)" : "Reading order"],
            ["none", "No overlay"],
          ].map(([value, label]) => ({ value, label }))}
        />
      </div>
      <p role="status">{view.message}</p>
      {!(mode === 'order' && placement.located === 0) && <p className="model-note">{mode === 'order' ? 'Numbers show the order screen readers follow on this page. Compare it with the order you expect. Some text may have no number if its position couldn’t be found.' : 'Outlines: red for text screen readers can’t reach, amber for graphics, a dashed orange box around the selected item. Positions are approximate.'}</p>}
      <div className="preview-scroller" ref={scroller}>
        <div className="preview-sheet" ref={sheet}>
          <canvas ref={canvas} aria-label="Rendered PDF page" />
          <svg ref={svg} aria-hidden="true" />
        </div>
      </div>
      {mode === 'order' && hasReadingOrder && <section aria-label="Recovered text in reading order">
        {<ol className="preview-order-text">{currentPage.logicalBlocks.map((block, i) => <li key={i}>{block.text || 'No text recovered for this label'}</li>)}</ol>}
      </section>}
    </section>
  );
}
