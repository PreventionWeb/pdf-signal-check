(() => {
  let instance, pendingUrl, epoch = 0, requestedPage = 1;
  const api = pdfagogo.default;
  const root = document.getElementById('viewer');
  const isInitialPreview = (location.search || '').includes('preview');
  if (isInitialPreview) {
    document.documentElement?.classList?.add('is-preview');
    document.body?.classList?.add('is-preview');
  }
  const fitWidth = () => {
    const isPreview = (location.search || '').includes('preview') || document.body?.classList?.contains('is-preview');
    const width = root.querySelector?.('.pdfagogo-page-wrapper')?.offsetWidth;
    if (width > 0 && instance) {
      const page = instance.getCurrentPage();
      const padding = isPreview ? 14 : 28;
      instance.viewer?.setZoom((root.clientWidth - padding) / width, false);
      anchorPage(page);
    }
  };
  document.getElementById('fit')?.addEventListener('click', fitWidth);
  const anchorPage = page => {
    const scroller = root.querySelector?.('.pdfagogo-scroll-container');
    const sheet = root.querySelectorAll?.('.pdfagogo-page-wrapper')[page - 1];
    if (!scroller || !sheet) { instance?.goToPage(page); return; }
    const top = scroller.scrollTop + sheet.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    scroller.scrollTo({ top, behavior: 'instant' });
  };
  const zoom = direction => {
    if (!instance?.viewer) return;
    const page = instance.getCurrentPage();
    instance.viewer.setZoom(instance.viewer.getZoom() + direction * .1, false);
    anchorPage(page);
  };
  document.getElementById('zoom-out').addEventListener('click', () => zoom(-1));
  document.getElementById('zoom-in').addEventListener('click', () => zoom(1));
  addEventListener('resize', fitWidth);
  const status = (state, url) => parent.postMessage({ type: 'pdf-signal-viewer-status', state, url }, location.origin);
  const dispose = () => {
    epoch++;
    pendingUrl = null;
    if (instance) api.registry.destroyInstance(instance);
    instance = null;
    root.replaceChildren();
  };
  addEventListener('message', async event => {
    if (event.source !== parent || event.origin !== location.origin || event.data?.type !== 'pdf-signal-viewer') return;
    const message = event.data;
    requestedPage = Number.isInteger(message.page) && message.page > 0 ? message.page : requestedPage;
    if (message.action === 'dispose') { dispose(); return; }
    if (message.action === 'page') { instance?.goToPage(Math.min(requestedPage, instance.getPageCount())); return; }
    if (message.action !== 'load' || typeof message.url !== 'string' || !message.url.startsWith(`blob:${location.origin}/`)) return;
    if (pendingUrl === message.url) return;
    dispose();
    const attempt = epoch;
    pendingUrl = message.url;
    const isPreview = (location.search || '').includes('preview') || !!message.preview;
    if (isPreview) {
      document.documentElement?.classList?.add('is-preview');
      document.body?.classList?.add('is-preview');
    }
    const container = document.createElement('div');
    container.id = `local-pdf-${attempt}`;
    container.className = 'pdfagogo-container';
    root.append(container);
    try {
      const loaded = await api.initializeContainer(container, {
        pdfUrl: message.url, workerUrl: new URL('pdf-a-go-go.worker.js', location.href).href,
        defaultPage: requestedPage, showShare: false, showDownload: false,
        showFullscreen: false, showResizeGrip: false,
        showAccessibilityControlsVisibly: false,
        showToolbar: !isPreview,
        showSearch: !isPreview,
        showPageSelector: !isPreview,
        fullpageCacheSize: 2,
        textLayerCacheSize: 2,
        strings: { searchCounter: '{current} / {total} matching pages', prevMatch: 'Previous matching page', nextMatch: 'Next matching page' },
      });
      if (attempt !== epoch) { api.registry.destroyInstance(loaded); return; }
      instance = loaded;
      const scroller = root.querySelector?.('.pdfagogo-scroll-container');
      scroller?.setAttribute('tabindex', '0');
      scroller?.setAttribute('role', 'region');
      scroller?.setAttribute('aria-label', 'PDF pages — use arrow keys to scroll');
      // Upstream icons parsed without xmlns have no SVG namespace. Text arrows
      // preserve the existing listeners, accessible names and disabled states.
      root.querySelector?.('.pdfagogo-prev-page')?.replaceChildren(document.createTextNode('←'));
      root.querySelector?.('.pdfagogo-next-page')?.replaceChildren(document.createTextNode('→'));
      instance.viewer?.on('initialRenderComplete', () => {
        if (attempt !== epoch) return;
        fitWidth();
        instance.goToPage(Math.min(requestedPage, instance.getPageCount()));
      });
      fitWidth();
      instance.goToPage(Math.min(requestedPage, instance.getPageCount()));
      status('loaded', message.url);
    } catch {
      api.registry.destroyInstance(container);
      if (attempt === epoch) status('error', message.url);
    }
  });
  addEventListener('pagehide', () => { dispose(); api.registry.destroyAll(); });
  status('ready');
})();
