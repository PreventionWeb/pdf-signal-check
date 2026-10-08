import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import { readingOrderPlacement, hasUnsafePageScope } from "./reading-order-placement.js";
import { cropBounds, targetQuads } from "./geometry.js";
import { point } from "../geometry.js";
import { boundedRenderScale } from './render-budget.js';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
/** Only canvas/SVG geometry is imperative. React owns all controls, text and layout. */
export class PreviewSession {
  constructor({ canvas, svg, scroller, sheet, onState }) {
    Object.assign(this, { canvas, svg, scroller, sheet, onState });
    let message = "";
    this.message = {
      set textContent(value) {
        message = value;
        onState({ message: value });
      },
      get textContent() {
        return message;
      },
    };
    this.counter = {
      set textContent(value) {
        onState({ counter: value });
      },
    };
    this.previous = {};
    this.next = {};
    this.zoom = { value: "fit" };
    this.mode = { value: "issues" };
    this.epoch = 0;
    this.pageNumber = 1;
    this.targets = [];
    let width = 0;
    this.observer = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      if (w && Math.abs(w - width) > 2) {
        width = w;
        if (this.zoom.value === "fit") this.render();
      }
    });
    this.observer.observe(scroller);
  }
  async load(file, report) {
    this.report = report;
    const epoch = ++this.epoch;
    try {
      const data = new Uint8Array(await file.arrayBuffer());
      if (epoch !== this.epoch) return;
      const base = new URL("./pdfjs/", document.baseURI);
      this.task = pdfjs.getDocument({
        data,
        standardFontDataUrl: new URL("standard_fonts/", base).href,
        cMapUrl: new URL("cmaps/", base).href,
        cMapPacked: true,
        wasmUrl: new URL("wasm/", base).href,
      });
      const doc = await this.task.promise;
      if (epoch !== this.epoch) {
        await doc.destroy();
        return;
      }
      this.doc = doc;
      await this.render();
    } catch (e) {
      if (epoch === this.epoch)
        this.message.textContent = `Preview unavailable: ${e.message}`;
    }
  }
  navigate(number, selection = false) {
    if (!selection) this.selectionMessage = null;
    this.pageNumber = Math.max(
      1,
      Math.min(this.doc?.numPages || this.report.file.pages || 1, number),
    );
    if (this.doc) this.render();
  }
  select(target) {
    this.focusRegion = !!target.focusRegion;
    target = { ...target, quads: targetQuads(this.report, target) };
    this.targets = target.quads?.length ? [target] : [];
    if (hasUnsafePageScope(this.report, target.page || this.pageNumber)) {
      this.targets = [];
      target = { ...target, quads: [] };
    }
    if (target.page) this.navigate(target.page, true);
    this.message.textContent = target.page
      ? `Page ${target.page}: ${target.label}${target.quads?.length || target.overlay === "order" ? "" : " · No trustworthy region recovered."}`
      : `${target.label} · Document-level finding; no page location.`;
    this.selectionMessage = this.message.textContent;
    if (!target.page) this.draw();
  }
  clearSelection() {
    this.targets = [];
    this.selectionMessage = null;
    this.message.textContent = `Page ${this.pageNumber}.`;
    this.draw();
  }
  async render() {
    if (!this.doc) return;
    const epoch = ++this.epoch,
      number = this.pageNumber;
    const previous = this.renderTask;
    previous?.cancel();
    try {
      if (previous) await previous.promise.catch(() => {});
      if (epoch !== this.epoch) return;
      this.activePage?.cleanup();
      const page = await this.doc.getPage(number);
      if (epoch !== this.epoch) return;
      this.activePage = page;
      const unit = page.getViewport({ scale: 1 });
      let scale =
        this.zoom.value === "fit"
          ? Math.min(1, Math.max(0.1, (this.scroller.clientWidth - 24) / unit.width))
          : Number(this.zoom.value);
      scale = boundedRenderScale(unit.width, unit.height, scale);
      const vp = page.getViewport({ scale });
      this.viewport = vp;
      const dpr = boundedRenderScale(vp.width, vp.height, Math.min(devicePixelRatio || 1, 2));
      this.canvas.width = Math.max(1, Math.floor(vp.width * dpr));
      this.canvas.height = Math.max(1, Math.floor(vp.height * dpr));
      this.sheet.style.width = `${vp.width}px`;
      this.sheet.style.height = `${vp.height}px`;
      this.svg.setAttribute("viewBox", `0 0 ${vp.width} ${vp.height}`);
      this.renderTask = page.render({
        canvasContext: this.canvas.getContext("2d"),
        viewport: vp,
        transform: [dpr, 0, 0, dpr, 0, 0],
      });
      await this.renderTask.promise;
      if (epoch !== this.epoch) return;
      this.renderTask = null;
      this.counter.textContent = `${number} / ${this.doc.numPages}`;
      this.previous.disabled = number === 1;
      this.next.disabled = number === this.doc.numPages;
      this.message.textContent =
        this.selectionMessage ||
        (this.mode.value === 'order' ? `Page ${number}.` : `Page ${number}.`);
      this.draw();
      if (this.focusRegion) {
        const quad = this.targets[0]?.quads?.[0];
        const bounds = quad && cropBounds(quad, vp, 0);
        if (bounds) {
          this.scroller.scrollTop = Math.max(0, bounds.y + bounds.height / 2 - this.scroller.clientHeight / 2);
          this.scroller.scrollLeft = Math.max(0, bounds.x + bounds.width / 2 - this.scroller.clientWidth / 2);
        }
        this.focusRegion = false;
      }
    } catch (e) {
      if (epoch === this.epoch && e.name !== "RenderingCancelledException")
        this.message.textContent = `Preview unavailable: ${e.message}`;
    }
  }
  draw() {
    this.svg.replaceChildren();
    if (!this.viewport) return;
    const page = this.report.pages.find((p) => p.number === this.pageNumber);
    if (!page) return;
    const regions = [];
    if (hasUnsafePageScope(this.report, this.pageNumber)) {
      this.message.textContent =
        "This page uses reusable content whose locations this tool cannot resolve. Other pages may have located evidence.";
      return;
    }
    if (this.mode.value === "issues") {
      for (const b of page.blocks)
        if (b.quad && (!page.evidenceGeometryScoped || b.locationSafe) && (!b.connected || b.suspicious))
          regions.push({ quad: b.quad, kind: "issue" });
      for (const g of page.graphics || [])
        if (g.quad) regions.push({ quad: g.quad, kind: "graphic" });
    } else if (this.mode.value === "order") {
      regions.push(...readingOrderPlacement(this.report, this.pageNumber).regions);
    }
    for (const t of this.mode.value === "none" ? [] : this.targets)
      if (t.page === page.number)
        for (const q of t.quads) regions.push({ quad: q, kind: "selected" });
    if (regions.length > 1500)
      this.message.textContent +=
        " Overlay limited to the first 1,500 regions.";
    for (const r of regions.slice(0, 1500)) {
      const pts = r.quad.map((p) => point(this.viewport.transform, p));
      const polygon = document.createElementNS(
        this.svg.namespaceURI,
        "polygon",
      );
      polygon.setAttribute("points", pts.map((p) => p.join(",")).join(" "));
      polygon.setAttribute("class", `region ${r.kind}`);
      this.svg.append(polygon);
      if (r.kind === "selected") {
        // A padded halo keeps the selection visible when the region is a thin rule or matches the outline colour.
        const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), pad = 6;
        const halo = document.createElementNS(this.svg.namespaceURI, "rect");
        halo.setAttribute("x", Math.min(...xs) - pad);
        halo.setAttribute("y", Math.min(...ys) - pad);
        halo.setAttribute("width", Math.max(...xs) - Math.min(...xs) + pad * 2);
        halo.setAttribute("height", Math.max(...ys) - Math.min(...ys) + pad * 2);
        halo.setAttribute("class", "region-halo");
        this.svg.append(halo);
      }
      if (r.number && r.label) {
        const label = document.createElementNS(this.svg.namespaceURI, "text");
        label.setAttribute("x", pts[3][0]);
        label.setAttribute("y", pts[3][1] - 3);
        label.textContent = r.number;
        label.setAttribute("class", "order-label");
        this.svg.append(label);
      }
    }
  }
  destroy() {
    ++this.epoch;
    this.observer.disconnect();
    this.renderTask?.cancel();
    this.task?.destroy().catch(() => {});
    this.canvas.width = 1;
    this.canvas.height = 1;
  }
}
