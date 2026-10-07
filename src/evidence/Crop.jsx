import React, { useEffect, useState } from "react";
import { EvidenceCropService } from "./crops.js";
import { targetQuads } from "./geometry.js";
export function Crop({ file, report, targets = [], fallbackPage = false }) {
  const [result, setResult] = useState(null);
  const target = targets.find(t => targetQuads(report, t).length) || (fallbackPage ? targets.find(t => t.page) : null);
  useEffect(() => {
    if (!file || !target) {
      setResult(null);
      return;
    }
    const abort = new AbortController(),
      service = new EvidenceCropService(file, report, { signal: abort.signal });
    let url,
      active = true;
    setResult({ caption: "Rendering one located source region…" });
    service
      .crop({ ...target, contextPage: fallbackPage })
      .then((value) => {
        if (!active) return;
        if (value.blob) url = URL.createObjectURL(value.blob);
        setResult(value.blob ? { ...value, url } : null);
      })
      .catch((e) => {
        if (active && !abort.signal.aborted)
          setResult({
            caption: "Preview unavailable.",
          });
      })
      .finally(() => service.destroy());
    return () => {
      active = false;
      abort.abort();
      service.destroy();
      if (url) URL.revokeObjectURL(url);
    };
  }, [file, report.pages, targets, fallbackPage]);
  if (!file || !target || !result) return null;
  return (
    <figure className="evidence-crop">
      {result.url && (
        <img
          src={result.url}
          alt={result.pageContext ? `Full PDF page ${result.page}. The figure location could not be isolated.` : `Source PDF page ${result.page}: ${result.text}. Approximate evidence outlined in blue.`}
          width={result.width}
          height={result.height}
        />
      )}
      <figcaption>{result.caption || result.unavailable}</figcaption>
    </figure>
  );
}
