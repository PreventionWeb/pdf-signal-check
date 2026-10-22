// Imported only by the local developer harness, never by an application entry point.
export function start(options) {
  const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  window.__vlm = { state: 'running', rows: [], events: [] };
  worker.onmessage = ({ data }) => {
    if (data.type === 'row') window.__vlm.rows.push(data.row);
    else if (data.type === 'progress') window.__vlm.events = [...window.__vlm.events.slice(-9), data.event];
    else Object.assign(window.__vlm, data);
  };
  worker.onerror = event => Object.assign(window.__vlm, { state: 'error', error: event.message });
  window.__stopVlm = () => worker.terminate();
  worker.postMessage(options);
}
