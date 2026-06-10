import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Shell } from "./Shell.js";
import "./base.css";

// mount point is guaranteed present by index.html; non-null assertion is safe.
const root = document.getElementById("root");
if (root === null) {
  throw new Error("Root element #root not found in index.html");
}

createRoot(root).render(
  <StrictMode>
    <Shell />
  </StrictMode>,
);
