import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { applySavedThemePreference } from "./theme/appTheme";
import "./styles/globals.css";
import "./styles/themes.css";

applySavedThemePreference();

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
