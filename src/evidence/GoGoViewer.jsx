import React, { useEffect, useRef, useState } from 'react';

// The isolated frame owns the upstream viewer, parser and rendering resources.
// Only a same-origin object URL crosses the frame boundary; bytes never leave the device.
export function GoGoViewer({ file, page = 1, title = 'PDF page context' }) {
  const frame = useRef(null);
  const source = useRef(null);
  const latestPage = useRef(page);
  const [status, setStatus] = useState('Loading PDF viewer…');
  latestPage.current = page;
  const send = message => frame.current?.contentWindow?.postMessage({ type: 'pdf-signal-viewer', ...message }, location.origin);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    source.current = url;
    setStatus('Loading PDF viewer…');
    const receive = event => {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow || event.data?.type !== 'pdf-signal-viewer-status') return;
      if (event.data.state === 'ready') send({ action: 'load', url, page: latestPage.current });
      if (event.data.url !== url) return;
      if (event.data.state === 'loaded') setStatus('PDF viewer ready. Zoom, search or change pages to inspect the original document.');
      if (event.data.state === 'error') setStatus('PDF viewer unavailable. You can still review the recovered evidence.');
    };
    window.addEventListener('message', receive);
    send({ action: 'load', url, page: latestPage.current });
    return () => {
      window.removeEventListener('message', receive);
      send({ action: 'dispose' });
      URL.revokeObjectURL(url);
      if (source.current === url) source.current = null;
    };
  }, [file]);
  useEffect(() => { send({ action: 'page', page }); }, [page]);
  if (!file) return <p className="model-note">The original PDF is unavailable for this session.</p>;
  return <section className="gogo-context" aria-label={title}>
    <h3>{title}</h3>
    <p role="status" className="model-note">{status}</p>
    <iframe ref={frame} className="gogo-frame" title={`${title} — PDF-A-go-go`} src={`${import.meta.env.BASE_URL}vendor/pdf-a-go-go/1.9.0/viewer.html`}
      onLoad={() => source.current && send({ action: 'load', url: source.current, page: latestPage.current })} />
    <p className="model-note">Original PDF · PDF-A-go-go. Visual layout does not establish machine reading order.</p>
  </section>;
}
