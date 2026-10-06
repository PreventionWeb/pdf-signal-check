import React, { useEffect, useState } from "react";
import { EvidenceCropService } from "./crops.js";
import { targetQuads } from "./geometry.js";
export function Crop({ file, report, targets = [] }) {
  const [result, setResult] = useState(null);
  useEffect(() => {
    const target =
      targets.find((t) => targetQuads(report, t).length) || targets[0];
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
      .crop(target)
      .then((value) => {
        if (!active) return;
        if (value.blob) url = URL.createObjectURL(value.blob);
        setResult({ ...value, url });
      })
      .catch((e) => {
        if (active && !abort.signal.aborted)
          setResult({
            caption: `Crop unavailable: ${e.message}. Use textual evidence or the full-page preview.`,
          });
      })
      .finally(() => service.destroy());
    return () => {
      active = false;
      abort.abort();
      service.destroy();
      if (url) URL.revokeObjectURL(url);
    };
  }, [file, report.pages, targets]);
  if (!result)
    return (
      <p className="model-note">
        No trustworthy source region is available for a crop. Recovered text and
        metadata remain available below.
      </p>
    );
  return (
    <figure className="evidence-crop">
      {result.url && (
        <img
          src={result.url}
          alt={`Source PDF page ${result.page}: ${result.text}. Approximate evidence outlined in blue.`}
          width={result.width}
          height={result.height}
        />
      )}
      <figcaption>{result.caption || result.unavailable}</figcaption>
    </figure>
  );
}
