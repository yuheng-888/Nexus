import React, { useCallback, useEffect, useRef } from "react";
import Editor, { OnMount, OnChange } from "@monaco-editor/react";
import { useStore } from "../../store/useStore";
import { useEditorNavigationStore } from "../../store/editorNavigationStore";
import { getMonacoTheme } from "../../theme/appTheme";
import { registerNexusLanguageProviders } from "./monacoLanguageProviders";
import { useLanguageFeatures } from "./useLanguageFeatures";
import type { EditorNavigationRequest } from "../../store/editorNavigationStore";

interface MonacoEditorProps {
  value: string;
  language: string;
  onChange: OnChange;
  onSave: (content: string) => Promise<void>;
  path: string;
}

type EditorInstance = Parameters<OnMount>[0];
type MonacoInstance = Parameters<OnMount>[1];

export function MonacoEditor({ value, language, onChange, onSave, path }: MonacoEditorProps) {
  const editorRef = useRef<EditorInstance | null>(null);
  const monacoRef = useRef<MonacoInstance | null>(null);
  const appTheme = useStore((state) => state.appTheme);
  const navigationRequest = useEditorNavigationStore((state) => state.request);
  const { scheduleSync, syncDocument } = useLanguageFeatures({ language, path, value });

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    registerNexusLanguageProviders(monaco);
    configureEditor(editor);
    registerSaveShortcut(editor, monaco, onSave);
    const model = editor.getModel();
    if (model !== null) void syncDocument(model, monaco);
    navigateEditor(editor, navigationRequest, path);
  }, [navigationRequest, onSave, path, syncDocument]);

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (editor === null || monaco === null || model === null || model === undefined) return;
    scheduleSync(model, monaco);
  }, [scheduleSync, value]);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor === null) return;
    navigateEditor(editor, navigationRequest, path);
  }, [navigationRequest, path]);

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={onChange}
      theme={getMonacoTheme(appTheme)}
      path={`file:///${path}`}
      onMount={handleMount}
      options={{
        automaticLayout: true,
      }}
    />
  );
}

function configureEditor(editor: EditorInstance): void {
  editor.updateOptions({
    autoClosingBrackets: "always",
    autoClosingQuotes: "always",
    bracketPairColorization: { enabled: true },
    cursorBlinking: "smooth",
    cursorSmoothCaretAnimation: "on",
    fontFamily: "'SF Mono', 'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace",
    fontLigatures: true,
    fontSize: 13,
    formatOnPaste: true,
    lineNumbers: "on",
    minimap: { enabled: true, scale: 1 },
    padding: { top: 8 },
    renderWhitespace: "selection",
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    wordWrap: "off"
  });
}

function registerSaveShortcut(
  editor: EditorInstance,
  monaco: MonacoInstance,
  onSave: (content: string) => Promise<void>
): void {
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    void onSave(editor.getValue()).catch((error: unknown) => {
      console.error("Failed to save file:", error);
    });
  });
}

function navigateEditor(
  editor: EditorInstance,
  request: EditorNavigationRequest | null,
  path: string
): void {
  if (request === null || request.path !== path) return;
  const position = { column: request.column, lineNumber: request.line };
  editor.setPosition(position);
  editor.revealPositionInCenter(position);
  editor.focus();
}
