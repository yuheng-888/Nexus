import { useCallback, useEffect, useRef } from "react";
import type { Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useLanguageStore } from "../../store/languageStore";
import { diagnosticsToProblems, languageDiagnosticToMarker } from "./languageClient";

const DIAGNOSTIC_DELAY_MS = 350;

export function useLanguageFeatures(input: {
  readonly language: string;
  readonly path: string;
  readonly value: string;
}) {
  const setProblemsForPath = useLanguageStore((state) => state.setProblemsForPath);
  const setSymbolsForPath = useLanguageStore((state) => state.setSymbolsForPath);
  const timerRef = useRef<number | undefined>(undefined);

  const syncDocument = useCallback(async (model: editor.ITextModel, monaco: Monaco) => {
    if (!isLanguageServiceTarget(input.language)) return;
    await window.nexus.languages.updateDocument({
      content: input.value,
      languageId: input.language,
      path: input.path
    });
    await refreshDiagnostics(input.path, model, monaco, setProblemsForPath);
    await refreshSymbols(input.path, setSymbolsForPath);
  }, [input.language, input.path, input.value, setProblemsForPath, setSymbolsForPath]);

  const scheduleSync = useCallback((model: editor.ITextModel, monaco: Monaco) => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void syncDocument(model, monaco);
    }, DIAGNOSTIC_DELAY_MS);
  }, [syncDocument]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return { scheduleSync, syncDocument };
}

async function refreshDiagnostics(
  path: string,
  model: editor.ITextModel,
  monaco: Monaco,
  setProblemsForPath: (path: string, problems: ReturnType<typeof diagnosticsToProblems>) => void
): Promise<void> {
  const diagnostics = await window.nexus.languages.diagnostics({ path });
  const problems = diagnosticsToProblems(path, diagnostics);
  setProblemsForPath(path, problems);
  monaco.editor.setModelMarkers(model, "nexus-language", diagnostics.map(languageDiagnosticToMarker));
}

async function refreshSymbols(
  path: string,
  setSymbolsForPath: (path: string, symbols: Awaited<ReturnType<typeof window.nexus.languages.documentSymbols>>) => void
): Promise<void> {
  setSymbolsForPath(path, await window.nexus.languages.documentSymbols({ path }));
}

function isLanguageServiceTarget(language: string): boolean {
  return language === "typescript" || language === "javascript";
}
