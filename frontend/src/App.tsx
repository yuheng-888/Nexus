import React, { useEffect } from "react";
import { Layout } from "./components/layout/Layout";
import { useStore } from "./store/useStore";
import { useLanguageStore } from "./store/languageStore";
import { getBrowserThemeTarget, loadThemePreference } from "./theme/appTheme";

export function App() {
  const setWorkspaceRoot = useStore((s) => s.setWorkspaceRoot);
  const setAppTheme = useStore((s) => s.setAppTheme);
  const clearLanguageState = useLanguageStore((s) => s.clearLanguageState);

  useEffect(() => {
    async function init() {
      try {
        const info = await window.nexus.workspace.get();
        clearLanguageState();
        setWorkspaceRoot(info.root);
      } catch (err) {
        console.warn("Failed to get workspace info:", err);
        clearLanguageState();
        setWorkspaceRoot(null);
      }
    }
    init();
  }, [clearLanguageState, setWorkspaceRoot]);

  useEffect(() => {
    setAppTheme(loadThemePreference(getBrowserThemeTarget()));
  }, [setAppTheme]);

  return <Layout />;
}
