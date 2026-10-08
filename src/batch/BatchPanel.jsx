import { formatProgress } from '../ui/progress.js';
import React, { useSyncExternalStore } from "react";
import {
  Button,
  Card,
  Details,
  Notice,
  Checkbox,
  Select,
  FormGroup,
  Actions,
} from "../ui/react.jsx";
import { REPORT_FILENAME_STEM } from "../brand.js";
import { SEMANTIC_MODELS, getSemanticModel } from "../engine/models.js";
import { downloadJson } from "../export/download.js";

const checkChoices = [
  ["title", "Title"],
  ["subject", "Subject"],
  ["keywords", "Each keyword"],
  ["sections", "Bounded tagged sections"],
];
function Disclosure({
  controller,
  state,
  name,
  defaultOpen = false,
  children,
  ...props
}) {
  return (
    <Details
      {...props}
      open={state.disclosures[name] ?? defaultOpen}
      onToggle={(event) =>
        controller.setDisclosure(name, event.currentTarget.open)
      }
    >
      {children}
    </Details>
  );
}
function QueueItem({ item, state, controller, pending, requireAI }) {
  const queue = state.queue,
    act = (fn) => controller.act(fn),
    counts = item.summary?.presentationCounts;
  const editable =
    item.id !== queue.activeId &&
    item.id !== queue.modelFailure?.id &&
    item.status !== "awaiting-budget";
  const retryable =
    item.id !== queue.modelFailure?.id &&
    ["failed", "canceled", "skipped", "completed"].includes(item.status);
  return (
    <Card as="article" className="batch-item" data-queue-id={item.id}>
      <h3>{item.name}</h3>
      <p className="batch-status">
        {item.status === "completed"
          ? requireAI && !item.summary?.semantic?.inferencePerformed ? "Partial evaluation · AI did not complete" : "Complete"
          : item.status === "failed"
            ? "Incomplete / failed"
            : item.status}{" "}
        · {(item.bytes / 1e6).toFixed(2)} MB
      </p>
      {item.progress && item.id === queue.activeId && (
        <div>
          <p>
            {item.progress.message ||
              item.progress.phase ||
              item.progress.stage ||
              "Processing"}
          </p>
          {item.progress.total > 0 &&
          Number.isFinite(item.progress.completed) ? (
            <>
              <progress
                max={item.progress.total}
                value={item.progress.completed}
                aria-label={`${item.name} progress`}
              />
              <p className="model-note">
                {formatProgress(item.progress)}
              </p>
            </>
          ) : (
            <progress aria-label={`${item.name} preparing`} />
          )}
        </div>
      )}
      {item.error && <p className="error-message">{item.error}</p>}
      {item.summary && (
        <>
          {counts?.version === 2 ? <p><strong>Fix ({counts.fix})</strong> · Check ({counts.check}) · Couldn’t check ({counts.couldntCheck})</p>
            : <p>Open the report to see its Fix and Check items.</p>}
          {item.summary.semantic?.error && (
            <p className="error-message">
              AI did not complete: {item.summary.semantic.error}
            </p>
          )}
        </>
      )}
      <Actions>
        {item.status === "awaiting-budget" && (
          <>
            <Button
              id={`batch-open-${item.id}`}
              onClick={() => controller.open(item.id)}
            >
              Inspect/export pending detail (temporary copy)
            </Button>
            <p className="model-note">
              Opening makes one extra temporary report copy outside the
              serialized budget. Export it before discarding details.
            </p>
          </>
        )}
        {item.detailRetained ? (
          <Button
            variant="primary"
            id={`batch-open-${item.id}`}
            onClick={() => controller.open(item.id)}
          >
            Open report
          </Button>
        ) : (
          item.summary && (
            <p className="model-note">
              {item.status === "awaiting-budget"
                ? "Detail awaits your budget choice."
                : "Only compact summary retained; detailed review/images are unavailable."}
            </p>
          )
        )}
        {item.status === "queued" && (
          <>
            {[
              ["Move earlier", -1],
              ["Move later", 1],
            ].map(([label, delta]) => {
              const index = pending.findIndex(
                (candidate) => candidate.id === item.id,
              );
              return (
                <Button
                  key={label}
                  id={`batch-move-${item.id}-${delta}`}
                  disabled={
                    index + delta < 0 || index + delta >= pending.length
                  }
                  onClick={() =>
                    act(() => {
                      const ids = pending.map((candidate) => candidate.id);
                      [ids[index], ids[index + delta]] = [
                        ids[index + delta],
                        ids[index],
                      ];
                      controller.queue.reorder(ids);
                    })
                  }
                >
                  {label}
                </Button>
              );
            })}
            <Button
              id={`batch-skip-${item.id}`}
              onClick={() => act(() => controller.queue.skip(item.id))}
            >
              Skip PDF
            </Button>
          </>
        )}
      </Actions>
      <Disclosure
        controller={controller}
        state={state}
        name={`technical:${item.id}`}
        className="batch-file-details"
        summary="File identity, timing and compact outcomes"
      >
        {item.summary && <p>Formal text profile: {item.summary.accepted ? "Required checks passed" : item.summary.checks?.some(check => check.status === "fail") ? "Required defects found" : "Required checks not established"}. Independent of advisory counts.</p>}
        <p>
          {item.id} · {item.phase}
        </p>
        {item.sourceHash && (
          <p className="batch-hash">SHA-256 {item.sourceHash}</p>
        )}
        {item.timing?.finishedAt && (
          <p className="model-note">
            Observed elapsed: {Math.round(item.timing.elapsedMs || 0)} ms.
            Includes scheduling/visibility effects; not an ETA or speed
            guarantee.
          </p>
        )}
        {Object.entries(item.summary?.advisories || {}).map(([field, value]) =>
          value ? (
            <p key={field} className="model-note">
              {field}: {value.status}
            </p>
          ) : null,
        )}
        {item.summary && (
          <Disclosure
            controller={controller}
            state={state}
            name={`compact:${item.id}`}
            summary="Compact retained outcomes"
          >
            <pre>{JSON.stringify(item.summary, null, 2)}</pre>
          </Disclosure>
        )}
      </Disclosure>
      {(item.detailRetained || retryable || editable) && (
        <Disclosure
          controller={controller}
          state={state}
          name={`management:${item.id}`}
          className="batch-file-management"
          summary="Retry, release or remove this PDF"
        >
          <Actions>
            {item.detailRetained && (
              <Button
                id={`batch-release-${item.id}`}
                onClick={() =>
                  act(() =>
                    controller.queue.releaseDetails([item.id], {
                      consent: true,
                    }),
                  )
                }
              >
                Release detail; keep compact summary
              </Button>
            )}
            {retryable && (
              <Button
                id={`batch-retry-${item.id}`}
                onClick={() => act(() => controller.queue.retry(item.id))}
              >
                Retry PDF
              </Button>
            )}
            {editable && (
              <Button
                id={`batch-remove-${item.id}`}
                onClick={() => act(() => controller.queue.remove(item.id))}
              >
                Remove PDF
              </Button>
            )}
          </Actions>
        </Disclosure>
      )}
    </Card>
  );
}

/** Declarative queue UI; queue/client ownership stays with the app's controller. */
export function BatchPanel({ controller, requireAI = false }) {
  const state = useSyncExternalStore(
      controller.subscribe,
      controller.getSnapshot,
    ),
    queue = state.queue,
    settings = state.settings;
  const model = getSemanticModel(settings.modelId),
    pending = queue.items.filter((item) => item.status === "queued");
  const count = (status) =>
    queue.items.filter((item) => item.status === status).length;
  const finished =
    count("completed") + count("failed") + count("canceled") + count("skipped");
  const act = (fn) => controller.act(fn),
    locked = Boolean(queue.configuration) || state.starting || state.clearing;
  const setup = (
    <div className="batch-setup">
      <Disclosure
        controller={controller}
        state={state}
        name="admission"
        defaultOpen={!queue.configuration}
        id="batch-admission"
        className="batch-admission"
        summary={queue.items.length ? "Add PDFs to this queue" : "Choose PDFs"}
      >
        <Card
          as="div"
          className="batch-drop"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!state.clearing) controller.add(event.dataTransfer.files);
          }}
        >
          <label className="mg-form-label" htmlFor="batch-files">
            Choose PDFs or drop several here
          </label>
          <input
            id="batch-files"
            type="file"
            multiple
            accept="application/pdf,.pdf"
            disabled={state.clearing}
            onChange={(event) => {
              controller.add(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
          />
          <p className="model-note">
            Up to 20 files · 300 MB total · 50 MB each · engine limit 200 pages
            per file
          </p>
        </Card>
      </Disclosure>
      <p className="model-note">
        Foreground session only. Closing or reloading loses this queue.
        Background tabs or sleep can delay processing; no background-completion
        guarantee.
      </p>
      <Disclosure
        controller={controller}
        state={state}
        name="configuration"
        id="batch-configuration"
        className="batch-configuration"
        summary={
          queue.configuration
            ? "Run settings and download receipt"
            : requireAI ? "AI model and checks" : "Optional AI settings · traditional checks run by default"
        }
      >
        <FormGroup
          legend="Queue settings (frozen when started)"
          disabled={locked}
          className="batch-settings"
        >
          <Checkbox
            id="batch-use-ai"
            label={requireAI ? "Local AI screening enabled for every PDF" : "Optional local AI screening"}
            checked={settings.useAI}
            disabled={locked || requireAI}
            onChange={(event) =>
              controller.setSettings({ useAI: event.target.checked })
            }
          />
          <Select
            id="batch-model"
            label="Batch screening model"
            value={settings.modelId}
            disabled={locked || !settings.useAI}
            options={SEMANTIC_MODELS.map((option) => ({
              value: option.key,
              label: `${option.label} · ${option.language}`,
            }))}
            onChange={(event) =>
              controller.setSettings({ modelId: event.target.value })
            }
          />
          <p className="model-note">
            {model.label}: {(model.graphBytes / 1e6).toFixed(2)} MB model +{" "}
            {(model.tokenizerBytes / 1e6).toFixed(2)} MB tokenizer; runtime
            approximately 26.86 MB uncompressed, separate. {model.tradeoff}
          </p>
          <p className="model-note">
            Each PDF’s declared language controls model eligibility. Missing or
            unsupported language stays uncertain; no model is silently
            substituted. Relatedness is advisory and thresholds are provisional.
            PDF text stays on this device; assets download from external hosts.
          </p>
          <FormGroup
            legend="Screening checks"
            disabled={locked || !settings.useAI}
            className="screening-checks"
          >
            {checkChoices.map(([key, label]) => (
              <Checkbox
                key={key}
                id={`batch-check-${key}`}
                label={label}
                checked={settings.checks.includes(key)}
                disabled={locked || !settings.useAI}
                onChange={(event) =>
                  controller.setSettings({
                    checks: event.target.checked
                      ? [...settings.checks, key]
                      : settings.checks.filter((check) => check !== key),
                  })
                }
              />
            ))}
          </FormGroup>
          {settings.useAI && (
            <Checkbox
              id="batch-consent"
              label="I authorize the displayed model, tokenizer and runtime downloads for this queue."
              checked={state.consent}
              disabled={locked}
              onChange={(event) => controller.setConsent(event.target.checked)}
            />
          )}
        </FormGroup>
        {queue.configuration && (
          <p className="frozen-settings">
            This run:{" "}
            {queue.configuration.useAI
              ? getSemanticModel(queue.configuration.modelId).label
              : "Traditional checks only"}
            {queue.configuration.useAI
              ? ` · ${(queue.configuration.checks || []).join(", ")}`
              : ""}
          </p>
        )}
        <Disclosure
          controller={controller}
          state={state}
          name="resources"
          className="batch-resources"
          summary="Report retention and resource limits"
        >
          <p className="model-note">
            Retained detailed reports:{" "}
            {(queue.budget.estimatedSerializedBytes / 1e6).toFixed(2)} /{" "}
            {(queue.budget.limit / 1e6).toFixed(2)} MB serialized estimate. This
            excludes source handles, pending spill, runtime/model heaps, and
            parsed-page memory; it is not RAM measurement.
          </p>
        </Disclosure>
      </Disclosure>
    </div>
  );
  return (
    <section className="batch-panel">
      <section className="batch-overview" aria-label="Queue progress">
        <h3>
          {finished} of {queue.items.length} PDFs finished
        </h3>
        <p>
          {count("completed")} complete · {count("failed")} incomplete/failed ·{" "}
          {count("canceled")} canceled · {count("skipped")} skipped ·{" "}
          {count("queued")} waiting{queue.activeId ? " · 1 current" : ""}
        </p>
        {queue.items.length > 0 && (
          <progress
            max={queue.items.length}
            value={finished}
            aria-label="Finished PDFs"
          />
        )}
        <p>
          {queue.running
            ? queue.paused
              ? "Pausing after the current PDF."
              : "Processing the current PDF; files run sequentially."
            : queue.modelFailure
              ? "Paused for a model-initialization decision."
              : queue.budget.pendingSerializedBytes
                ? "Paused for a report-retention decision."
                : !queue.configuration
                  ? "Ready to start; nothing has run."
                  : queue.paused
                    ? "Queue paused. Continue when ready."
                    : "Queue idle."}
        </p>
      </section>
      {!queue.configuration && setup}
      <p role="status">{state.message}</p>
      <Actions>
        {(!queue.configuration || pending.length > 0) && (
          <Button
            variant="primary"
            id="batch-start"
            disabled={
              controller.busy ||
              !pending.length ||
              Boolean(queue.modelFailure) ||
              queue.budget.pendingSerializedBytes > 0
            }
            onClick={() => controller.start()}
          >
            {queue.configuration ? "Continue queue" : "Start queue"}
          </Button>
        )}
        {queue.running && (
          <Button
            id="batch-pause"
            disabled={queue.paused}
            onClick={() => act(() => controller.queue.pause())}
          >
            Pause after current PDF
          </Button>
        )}
        {queue.activeId && (
          <Button
            id="batch-cancel"
            onClick={() => act(() => controller.queue.cancelActive())}
          >
            Cancel current PDF
          </Button>
        )}
        {queue.running && (
          <Button
            id="batch-stop"
            onClick={() =>
              act(() => {
                controller.queue.stopAll();
                controller.client.dispose();
              })
            }
          >
            Stop all
          </Button>
        )}
      </Actions>
      {queue.modelFailure && (
        <Notice
          title="AI model initialization failed"
          variant="negative"
          className="batch-decision"
          actions={
            <>
              <Button
                id="batch-retry-model"
                onClick={() => controller.recoverModel("retry")}
              >
                Retry model initialization
              </Button>
              {!requireAI && <Button
                id="batch-structural-only"
                onClick={() => controller.recoverModel("structural-only")}
              >
                Continue remaining PDFs without AI
              </Button>}
            </>
          }
        >
          <p>{queue.modelFailure.message}</p>
        </Notice>
      )}
      {queue.budget.pendingSerializedBytes > 0 && (
        <Notice
          title="Choose what to retain before continuing"
          variant="warning"
          className="batch-decision"
          actions={
            <>
              <Button
                id="batch-pressure-summary"
                onClick={() =>
                  downloadJson(
                    controller.state,
                    `${REPORT_FILENAME_STEM}-batch-before-release.json`,
                  )
                }
              >
                Download compact summary first
              </Button>
              <Button
                id="batch-retain-pending"
                onClick={() =>
                  act(() => {
                    if (!controller.queue.retainPending())
                      controller.say(
                        "Not enough serialized budget. Export and explicitly release old details, or retain this item as summary only.",
                      );
                  })
                }
              >
                Keep pending detail after releasing selected old reports
              </Button>
              <Button
                id="batch-summary-only"
                onClick={() =>
                  act(() =>
                    controller.queue.summarizePending({ consent: true }),
                  )
                }
              >
                Discard pending detail; keep its summary
              </Button>
            </>
          }
        >
          <p>
            One completed pending report requires{" "}
            {(queue.budget.pendingSerializedBytes / 1e6).toFixed(2)} MB beyond
            the retained serialized budget. Scheduling is paused; no report was
            silently discarded.
          </p>
        </Notice>
      )}
      <div className="batch-items">
        {queue.items.map((item) => (
          <QueueItem
            key={item.id}
            item={item}
            state={state}
            controller={controller}
            pending={pending}
            requireAI={requireAI}
          />
        ))}
      </div>
      <Disclosure controller={controller} state={state} name="batch-management" summary="Download batch summary or clear queue"><Actions>
        <Button
          id="batch-summary"
          disabled={!queue.items.length}
          onClick={() =>
            downloadJson(
              controller.state,
              `${REPORT_FILENAME_STEM}-batch-summary.json`,
            )
          }
        >
          Download compact batch JSON
        </Button>
        <Button
          id="batch-clear"
          className="batch-secondary-action"
          disabled={state.clearing}
          onClick={() => controller.clear()}
        >
          Clear queue and release data
        </Button>
      </Actions></Disclosure>
      {queue.configuration && setup}
    </section>
  );
}
