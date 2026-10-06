import React, { useEffect, useRef, useState } from "react";
import { PreviewSession } from "./preview-session.js";
import { Button, Select } from "../ui/react.jsx";
export function Preview({ file, report, selection }) {
  const canvas = useRef(null),
    svg = useRef(null),
    scroller = useRef(null),
    sheet = useRef(null),
    session = useRef(null),
    [view, setView] = useState({
      message: "Loading preview…",
      counter: "",
      page: 1,
    }),
    [zoom, setZoom] = useState("fit"),
    [mode, setMode] = useState("issues");
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
  return (
    <section className="pdf-preview">
      <h3>Locate the evidence</h3>
      <div className="preview-controls mg-u-flex mg-u-flex-wrap mg-u-align-items-center mg-u-gap-100">
        <Button
          aria-label="Previous page"
          disabled={view.page === 1}
          onClick={() => session.current?.navigate(view.page - 1)}
        >
          ←
        </Button>
        <span>{view.counter}</span>
        <Button
          aria-label="Next page"
          disabled={view.page >= (report.file.pages || 1)}
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
            ["fit", "Fit width"],
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
            ["order", "Logical tag-tree order"],
            ["none", "No overlay"],
          ].map(([value, label]) => ({ value, label }))}
        />
      </div>
      <p role="status">{view.message}</p>
      <p className="model-note">
        Red: untagged / suspicious text · Amber: graphics need semantic
        inspection · Blue: selected evidence. Bounds are approximate.
      </p>
      <div className="preview-scroller" ref={scroller}>
        <div className="preview-sheet" ref={sheet}>
          <canvas ref={canvas} aria-label="Rendered PDF page" />
          <svg ref={svg} aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
