import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App.jsx";
import { initializePresentationBrand } from "./brand.js";
import "./style.css";
initializePresentationBrand();
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
