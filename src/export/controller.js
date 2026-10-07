import { REPORT_FILENAME_STEM } from "../brand.js";
import { captureSnapshot, safeFilename, fixSheet } from "./snapshot.js";
import { targetQuads } from "../evidence/geometry.js";
import { EvidenceCropService } from "../evidence/crops.js";
import { downloadBlob } from "./download.js";

/** Fixed-snapshot export policy, independent of React and any rendered controls. */
export class ExportController {
  constructor(
    getState,
    {
      download = downloadBlob,
      loadGenerators = () => import("./report.js"),
      cropFactory = (...args) => new EvidenceCropService(...args),
    } = {},
  ) {
    Object.assign(this, { getState, download, loadGenerators, cropFactory });
    this.epoch = 0;
    this.listeners = new Set();
    this.view = { busy: false, message: "" };
  }
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getSnapshot = () => this.view;
  update(change) {
    this.view = { ...this.view, ...change };
    for (const listener of this.listeners) listener();
  }
  cancel(message = "Export canceled. Completed analysis remains available.") {
    const active = Boolean(this.abort);
    ++this.epoch;
    this.abort?.abort();
    this.abort = null;
    this.update({ busy: false, message: active ? message : "" });
  }
  async run(kind) {
    if (this.abort || !["pdf", "png", "json"].includes(kind)) return;
    const state = this.getState();
    if (!state.report) return;
    const snapshot = captureSnapshot(state),
      sourceKey = state.sourceKey,
      epoch = ++this.epoch,
      abort = new AbortController();
    this.abort = abort;
    this.update({ busy: true, message: "Capturing completed report…" });
    const active = () => epoch === this.epoch && !abort.signal.aborted;
    const message = (text) => {
      if (active()) this.update({ message: text });
    };
    let service;
    try {
      let blob;
      if (kind === "json")
        blob = new Blob(
          [
            JSON.stringify(
              {
                ...snapshot.report,
                exportReceipt: {
                  capturedAt: snapshot.capturedAt,
                },
              },
              null,
              2,
            ),
          ],
          { type: "application/json" },
        );
      else {
        const { createPdfReport, createSummaryPng } =
          await this.loadGenerators();
        if (!active()) return;
        if (kind === "png") {
          message("Rendering dedicated summary image…");
          blob = await createSummaryPng(snapshot, { signal: abort.signal });
        } else {
          const crops = [];
          if (snapshot.file) {
            service = this.cropFactory(snapshot.file, snapshot.report, {
              signal: abort.signal,
            });
            // Crops follow the fix list order so the hand-off items get images first.
            const sheet = fixSheet(snapshot);
            const order = [...sheet.fix, ...sheet.check].map((item) => item.cropFindingId).filter(Boolean);
            const rank = (f) => (order.includes(f.id) ? order.indexOf(f.id) : order.length);
            const candidates = snapshot.normalized.findings
              .filter((f) => f.category !== "success")
              .sort((a, b) => rank(a) - rank(b))
              .map((f) => ({
                ...f,
                cropTarget: f.targets?.find(
                  (t) => targetQuads(snapshot.report, t).length,
                ),
              }))
              .filter((f) => f.cropTarget)
              .slice(0, 6);
            for (let index = 0; index < candidates.length; index++) {
              message(
                `Rendering source evidence ${index + 1} / ${candidates.length}…`,
              );
              const finding = candidates[index];
              try {
                crops.push({
                  ...(await service.crop(finding.cropTarget)),
                  findingId: finding.id,
                });
              } catch (error) {
                if (abort.signal.aborted) throw error;
                crops.push({
                  findingId: finding.id,
                  unavailable: error.message,
                });
              }
            }
          }
          message("Laying out captured report…");
          blob = await createPdfReport(snapshot, {
            signal: abort.signal,
            crops,
            onProgress: (progress) =>
              message(
                `Writing findings ${progress.completed + 1} / ${progress.total}…`,
              ),
          });
        }
      }
      const current = this.getState();
      if (
        !active() ||
        current.file !== snapshot.file ||
        current.sourceKey !== sourceKey
      )
        return;
      this.download(
        blob,
        `${safeFilename(snapshot.source.name)}-${REPORT_FILENAME_STEM}.${kind}`,
      );
      message(
        "Download requested for the captured report. The original PDF was not changed.",
      );
    } catch (error) {
      if (epoch === this.epoch)
        this.update({
          message: abort.signal.aborted
            ? "Export canceled."
            : `Export unavailable: ${error.message}. Analysis remains available.`,
        });
    } finally {
      try {
        await service?.destroy();
      } catch (error) {
        if (epoch === this.epoch)
          message(
            `Export resource cleanup was incomplete: ${error.message}. Analysis remains available.`,
          );
      } finally {
        if (epoch === this.epoch) {
          this.abort = null;
          this.update({ busy: false });
        }
      }
    }
  }
}
