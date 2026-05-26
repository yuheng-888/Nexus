import React from "react";
import { Box, Braces, Code2, Hash, ListTree, Sigma, Variable } from "lucide-react";
import { useLanguageStore } from "../../store/languageStore";
import { useStore } from "../../store/useStore";
import type { LanguageDocumentSymbol } from "../../types/language";
import { flattenDocumentSymbols, symbolToEditorLocation } from "../editor/editorNavigation";
import { useOpenEditorLocation } from "../editor/useOpenEditorLocation";

export function OutlinePanel() {
  const activeTab = useStore((state) => state.activeTab);
  const symbolsByPath = useLanguageStore((state) => state.symbolsByPath);
  const symbols = activeTab === null ? [] : symbolsByPath.get(activeTab) ?? [];

  if (activeTab === null) return <EmptyOutline text="未打开文件" />;
  if (symbols.length === 0) return <EmptyOutline text="当前文件暂无符号" />;

  return <OutlineList path={activeTab} symbols={symbols} />;
}

function OutlineList(props: {
  readonly path: string;
  readonly symbols: readonly LanguageDocumentSymbol[];
}) {
  const openLocation = useOpenEditorLocation();
  const outline = flattenDocumentSymbols(props.symbols);

  return (
    <div style={{ display: "flex", flexDirection: "column", padding: "0 4px 8px" }}>
      {outline.map((item) => (
        <button
          key={item.id}
          onClick={() => void openLocation(symbolToEditorLocation(props.path, item.symbol))}
          style={{
            alignItems: "center",
            background: "transparent",
            border: "none",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "grid",
            font: "inherit",
            fontSize: 12,
            gap: 7,
            gridTemplateColumns: "16px minmax(0, 1fr) auto",
            minHeight: 26,
            padding: `0 8px 0 ${8 + item.depth * 14}px`,
            textAlign: "left",
            width: "100%"
          }}
          title={`${item.symbol.name} · ${props.path}:${item.symbol.selectionRange.start.line}`}
        >
          {symbolIcon(item.symbol.kind)}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.symbol.name}
          </span>
          <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 10 }}>
            {item.symbol.selectionRange.start.line}
          </span>
        </button>
      ))}
    </div>
  );
}

function EmptyOutline(props: { readonly text: string }) {
  return (
    <div style={{
      alignItems: "center",
      color: "var(--text-muted)",
      display: "flex",
      flexDirection: "column",
      fontSize: 12,
      gap: 8,
      height: "100%",
      justifyContent: "center",
      padding: 16,
      textAlign: "center"
    }}>
      <ListTree size={18} />
      <span>{props.text}</span>
    </div>
  );
}

function symbolIcon(kind: string) {
  const size = 13;
  if (kind === "class" || kind === "interface") return <Box color="var(--text-accent)" size={size} />;
  if (kind === "const" || kind === "let" || kind === "variable") return <Variable color="var(--warning)" size={size} />;
  if (kind === "module") return <Braces color="var(--info)" size={size} />;
  if (kind === "enum") return <Hash color="var(--info)" size={size} />;
  if (kind === "function" || kind === "method") return <Sigma color="var(--success)" size={size} />;
  return <Code2 color="var(--text-muted)" size={size} />;
}
