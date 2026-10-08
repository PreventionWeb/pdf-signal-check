import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { PreviewGate } from "./app/PreviewGate.jsx";
import { initializePresentationBrand } from "./brand.js";
import "./style.css";
initializePresentationBrand();
const App = lazy(() => import('./app/App.jsx').then(module => ({ default: module.App })));
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PreviewGate>
      <Suspense fallback={<p role="status">Opening PDF Signal Check…</p>}><App /></Suspense>
    </PreviewGate>
  </React.StrictMode>,
);
