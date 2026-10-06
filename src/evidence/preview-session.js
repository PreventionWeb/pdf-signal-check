import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import { point } from "../geometry.js";
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
/** Only canvas/SVG geometry is imperative. React owns all controls, text and layout. */
export class PreviewSession {
  constructor({ canvas, svg, scroller, sheet, onState }) {
    Object.assign(this, { canvas, svg, scroller, sheet, onState });
    this.root = {
      scrollIntoView: () =>
        scroller.scrollIntoView({ behavior: "instant", block: "nearest" }),
    };
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
    this.unsafeScope =
      report.limitations?.some((l) => l.includes("Form XObjects")) &&
      report.checks.some((c) =>
        c.evidence.some((e) => e.includes("Form XObjects")),
      );
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
    this.targets = target.quads?.length ? [target] : [];
    if (this.unsafeScope) {
      this.targets = [];
      target = { ...target, quads: [] };
    }
    this.message.textContent = target.page
      ? `Page ${target.page}: ${target.label}${target.quads?.length ? "" : " · No trustworthy region recovered."}`
      : `${target.label} · Document-level finding; no page location.`;
    this.selectionMessage = this.message.textContent;
    if (target.page) {
      this.navigate(target.page, true);
    } else this.draw();
    this.root.scrollIntoView({ behavior: "instant", block: "nearest" });
  }
  clearSelection() {
    this.targets = [];
    this.selectionMessage = null;
    this.message.textContent = `Page ${this.pageNumber}. Select an evidence row to locate it.`;
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
          ? Math.max(0.1, (this.scroller.clientWidth - 24) / unit.width)
          : Number(this.zoom.value);
      scale = Math.min(scale, 4096 / Math.max(unit.width, unit.height));
      const vp = page.getViewport({ scale });
      this.viewport = vp;
      const dpr = Math.min(
        devicePixelRatio || 1,
        2,
        Math.sqrt(8_000_000 / (vp.width * vp.height)),
        4096 / Math.max(vp.width, vp.height),
      );
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
        `Page ${number}. Select an evidence row to locate it.`;
      this.draw();
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
    if (this.unsafeScope) {
      this.message.textContent =
        "Form XObjects detected: page-scoped tag locations and overlays are unavailable. Inspect the rendered page; stream-scoped joining is outside this profile.";
      return;
    }
    if (this.mode.value === "issues") {
      for (const b of page.blocks)
        if (b.quad && (!b.connected || b.suspicious))
          regions.push({ quad: b.quad, kind: "issue" });
      for (const g of page.graphics || [])
        if (g.quad) regions.push({ quad: g.quad, kind: "graphic" });
    } else if (this.mode.value === "order") {
      page.logicalBlocks.forEach((b, i) =>
        page.blocks
          .filter((x) => x.key === b.key && x.quad)
          .forEach((x) =>
            regions.push({ quad: x.quad, kind: "order", number: i + 1 }),
          ),
      );
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
      if (r.number) {
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
