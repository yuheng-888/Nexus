import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, FileCode2, Play, RefreshCw, XCircle } from "lucide-react";
import type { TestDiscoveryResult, TestFile, TestRunResult } from "../../types/test";
import { formatTestFileMeta, formatTestRunSummary } from "./testPanelModel";

type TestAction = "" | "discover" | "runAll" | "runFile";

export function TestsPanel() {
  const [action, setAction] = useState<TestAction>("");
  const [discovery, setDiscovery] = useState<TestDiscoveryResult | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TestRunResult | null>(null);
  const busy = action !== "";
  const discover = useCallback(() => runDiscover(setAction, setDiscovery, setError), []);
  const runAll = useCallback(() => runTests({ setAction, setError, setResult, scope: "all" }), []);
  const runFile = useCallback((file: TestFile) => {
    return runTests({ path: file.path, setAction, setError, setResult, scope: "file" });
  }, []);

  useEffect(() => {
    void discover();
  }, [discover]);

  return (
    <div style={panelStyle}>
      <Header busy={busy} discovery={discovery} onDiscover={discover} onRunAll={runAll} />
      {error !== "" && <div style={errorStyle}>{error}</div>}
      <TestList busy={busy} discovery={discovery} onRunFile={runFile} />
      <RunResult result={result} />
    </div>
  );
}

function Header(props: {
  readonly busy: boolean;
  readonly discovery: TestDiscoveryResult | null;
  readonly onDiscover: () => Promise<void>;
  readonly onRunAll: () => Promise<void>;
}) {
  return (
    <section style={cardStyle}>
      <div style={titleRowStyle}>
        <div>
          <div style={titleStyle}>测试</div>
          <div style={metaStyle}>{props.discovery === null ? "未发现" : `${props.discovery.files.length} 个文件 · ${props.discovery.command}`}</div>
        </div>
      </div>
      <div style={buttonRowStyle}>
        <button disabled={props.busy} onClick={() => void props.onDiscover()} style={buttonStyle(props.busy)}>
          <RefreshCw size={12} /> 刷新
        </button>
        <button disabled={props.busy || props.discovery === null} onClick={() => void props.onRunAll()} style={primaryButtonStyle(props.busy || props.discovery === null)}>
          <Play size={12} /> 全部运行
        </button>
      </div>
    </section>
  );
}

function TestList(props: {
  readonly busy: boolean;
  readonly discovery: TestDiscoveryResult | null;
  readonly onRunFile: (file: TestFile) => Promise<void>;
}) {
  if (props.discovery === null) return <div style={emptyStyle}>正在发现测试...</div>;
  if (props.discovery.files.length === 0) return <div style={emptyStyle}>未发现测试文件</div>;
  return (
    <section style={listStyle}>
      {props.discovery.files.map((file) => (
        <div key={file.path} style={fileRowStyle}>
          <FileCode2 color="var(--text-muted)" size={14} />
          <div style={fileTextStyle}>
            <div style={fileNameStyle}>{file.name}</div>
            <div style={metaStyle}>{formatTestFileMeta(file)}</div>
          </div>
          <button disabled={props.busy} onClick={() => void props.onRunFile(file)} style={iconButtonStyle(props.busy)} title="运行测试文件">
            <Play size={12} />
          </button>
        </div>
      ))}
    </section>
  );
}

function RunResult({ result }: { readonly result: TestRunResult | null }) {
  if (result === null) return null;
  return (
    <section style={cardStyle}>
      <div style={resultHeaderStyle}>
        {result.passed ? <CheckCircle2 color="#22c55e" size={14} /> : <XCircle color="#ef4444" size={14} />}
        <span>{formatTestRunSummary(result)}</span>
      </div>
      {result.stdout.trim() !== "" && <pre style={outputStyle}>{result.stdout.trimEnd()}</pre>}
      {result.stderr.trim() !== "" && <pre style={errorOutputStyle}>{result.stderr.trimEnd()}</pre>}
    </section>
  );
}

async function runDiscover(
  setAction: (action: TestAction) => void,
  setDiscovery: (discovery: TestDiscoveryResult | null) => void,
  setError: (error: string) => void
): Promise<void> {
  setAction("discover");
  setError("");
  try {
    setDiscovery(await window.nexus.tests.discover());
  } catch (error) {
    setDiscovery(null);
    setError(formatError(error));
  } finally {
    setAction("");
  }
}

async function runTests(options: {
  readonly path?: string;
  readonly scope: "all" | "file";
  readonly setAction: (action: TestAction) => void;
  readonly setError: (error: string) => void;
  readonly setResult: (result: TestRunResult | null) => void;
}): Promise<void> {
  options.setAction(options.scope === "all" ? "runAll" : "runFile");
  options.setError("");
  try {
    options.setResult(await window.nexus.tests.run({ path: options.path, scope: options.scope }));
  } catch (error) {
    options.setResult(null);
    options.setError(formatError(error));
  } finally {
    options.setAction("");
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const panelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 10, padding: "0 12px 12px" };
const cardStyle: React.CSSProperties = { background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 8, padding: 10 };
const titleRowStyle: React.CSSProperties = { alignItems: "center", display: "flex", justifyContent: "space-between" };
const titleStyle: React.CSSProperties = { color: "var(--text-primary)", fontSize: 13, fontWeight: 650 };
const metaStyle: React.CSSProperties = { color: "var(--text-muted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const buttonRowStyle: React.CSSProperties = { display: "grid", gap: 6, gridTemplateColumns: "1fr 1fr" };
const emptyStyle: React.CSSProperties = { color: "var(--text-muted)", fontSize: 12, padding: "10px 4px" };
const errorStyle: React.CSSProperties = { ...cardStyle, color: "#ef4444", fontSize: 12 };
const listStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const fileRowStyle: React.CSSProperties = { alignItems: "center", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, display: "flex", gap: 8, padding: 8 };
const fileTextStyle: React.CSSProperties = { flex: 1, minWidth: 0 };
const fileNameStyle: React.CSSProperties = { color: "var(--text-primary)", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const resultHeaderStyle: React.CSSProperties = { alignItems: "center", color: "var(--text-primary)", display: "flex", fontSize: 12, gap: 6 };
const outputStyle: React.CSSProperties = { background: "var(--bg-input)", borderRadius: 6, color: "var(--text-secondary)", fontSize: 11, lineHeight: 1.45, margin: 0, maxHeight: 180, overflow: "auto", padding: 8, whiteSpace: "pre-wrap" };
const errorOutputStyle: React.CSSProperties = { ...outputStyle, color: "#ef4444" };

function buttonStyle(disabled: boolean): React.CSSProperties {
  return { alignItems: "center", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-secondary)", cursor: disabled ? "not-allowed" : "pointer", display: "flex", fontSize: 12, gap: 4, height: 28, justifyContent: "center", opacity: disabled ? 0.55 : 1 };
}

function primaryButtonStyle(disabled: boolean): React.CSSProperties {
  return { ...buttonStyle(disabled), background: "var(--accent)", borderColor: "var(--accent)", color: "white" };
}

function iconButtonStyle(disabled: boolean): React.CSSProperties {
  return { ...buttonStyle(disabled), height: 26, padding: 0, width: 28 };
}
