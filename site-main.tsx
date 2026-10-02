import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import HomeFlow from "./app/page";
import "./app/globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("HomeFlow root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <HomeFlow />
  </StrictMode>,
);
