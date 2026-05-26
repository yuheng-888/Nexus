import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Code2, Play, RefreshCw, XCircle } from "lucide-react";
import type { ProjectScript, ScriptDiscoveryResult, ScriptRunResult } from "../../types/script";
import { formatScriptCommand, formatScriptRunSummary } from "./scriptPanelModel";

type ScriptAction = "" | "discover" | "run";

export function ScriptsPanel() {
  const [action, setAction] = useState<ScriptAction>("");
  const [discovery, setDiscovery] = useState<ScriptDiscoveryResult | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScriptRunResult | null>(null);
  const busy = action !== "";
  const discover = useCallback(() => runDiscover(setAction, setDiscovery, setError), []);
  const runScript = useCallback((script: ProjectScript) => {
    return runProjectScript({ name: script.name, setAction, setError, setResult });
  }, []);

  useEffect(() => {
    void discover();
  }, [discover]);

  return (
    <div style={panelStyle}>
      <Header busy={busy} discovery={discovery} onDiscover={discover} />
      {error !== "" && <div style={errorStyle}>{error}</div>}
      <ScriptList busy={busy} discovery={discovery} onRun={runScript} />
      <RunResult result={result} />
    </div>
  );
}

function Header(props: {
  readonly busy: boolean;
  readonly discovery: ScriptDiscoveryResult | null;
  readonly onDiscover: () => Promise<void>;
}) {
  return (
    <section style={cardStyle}>
      <div style={titleRowStyle}>
        <div>
          <div style={titleStyle}>脚本</div>
          <div style={metaStyle}>{props.discovery === null ? "未发现" : `${props.discovery.scripts.length} 个 npm 脚本`}</div>
        </div>
        <button disabled={props.busy} onClick={() => void props.onDiscover()} style={iconButtonStyle(props.busy)} title="刷新">
          <RefreshCw size={13} />
        </button>
      </div>
    </section>
  );
}

function ScriptList(props: {
  readonly busy: boolean;
  readonly discovery: ScriptDiscoveryResult | null;
  readonly onRun: (script: ProjectScript) => Promise<void>;
}) {
  if (props.discovery === null) return <div style={emptyStyle}>正在读取 package.json...</div>;
  if (props.discovery.scripts.length === 0) return <div style={emptyStyle}>未发现 npm scripts</div>;
  return (
    <section style={listStyle}>
      {props.discovery.scripts.map((script) => (
        <div key={script.name} style={scriptRowStyle}>
          <Code2 color="var(--text-muted)" size={14} />
          <div style={scriptTextStyle}>
            <div style={scriptNameStyle}>{script.name}</div>
            <div style={metaStyle}>{formatScriptCommand(script)}</div>
          </div>
          <button disabled={props.busy} onClick={() => void props.onRun(script)} style={runButtonStyle(props.busy)} title="运行脚本">
            <Play size={12} />
          </button>
        </div>
      ))}
    </section>
  );
}

function RunResult({ result }: { readonly result: ScriptRunResult | null }) {
  if (result === null) return null;
  return (
    <section style={cardStyle}>
      <div style={resultHeaderStyle}>
        {result.passed ? <CheckCircle2 color="#22c55e" size={14} /> : <XCircle color="#ef4444" size={14} />}
        <span>{formatScriptRunSummary(result)}</span>
      </div>
      {result.stdout.trim() !== "" && <pre style={outputStyle}>{result.stdout.trimEnd()}</pre>}
      {result.stderr.trim() !== "" && <pre style={errorOutputStyle}>{result.stderr.trimEnd()}</pre>}
    </section>
  );
}

async function runDiscover(
  setAction: (action: ScriptAction) => void,
  setDiscovery: (discovery: ScriptDiscoveryResult | null) => void,
  setError: (error: string) => void
): Promise<void> {
  setAction("discover");
  setError("");
  try {
    setDiscovery(await window.nexus.scripts.discover());
  } catch (error) {
    setDiscovery(null);
    setError(formatError(error));
  } finally {
    setAction("");
  }
}

async function runProjectScript(options: {
  readonly name: string;
  readonly setAction: (action: ScriptAction) => void;
  readonly setError: (error: string) => void;
  readonly setResult: (result: ScriptRunResult | null) => void;
}): Promise<void> {
  options.setAction("run");
  options.setError("");
  try {
    options.setResult(await window.nexus.scripts.run({ name: options.name }));
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
const emptyStyle: React.CSSProperties = { color: "var(--text-muted)", fontSize: 12, padding: "10px 4px" };
const errorStyle: React.CSSProperties = { ...cardStyle, color: "#ef4444", fontSize: 12 };
const listStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const scriptRowStyle: React.CSSProperties = { alignItems: "center", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, display: "flex", gap: 8, padding: 8 };
const scriptTextStyle: React.CSSProperties = { flex: 1, minWidth: 0 };
const scriptNameStyle: React.CSSProperties = { color: "var(--text-primary)", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const resultHeaderStyle: React.CSSProperties = { alignItems: "center", color: "var(--text-primary)", display: "flex", fontSize: 12, gap: 6 };
const outputStyle: React.CSSProperties = { background: "var(--bg-input)", borderRadius: 6, color: "var(--text-secondary)", fontSize: 11, lineHeight: 1.45, margin: 0, maxHeight: 180, overflow: "auto", padding: 8, whiteSpace: "pre-wrap" };
const errorOutputStyle: React.CSSProperties = { ...outputStyle, color: "#ef4444" };

function baseButtonStyle(disabled: boolean): React.CSSProperties {
  return { alignItems: "center", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-secondary)", cursor: disabled ? "not-allowed" : "pointer", display: "flex", fontSize: 12, gap: 4, height: 28, justifyContent: "center", opacity: disabled ? 0.55 : 1 };
}

function iconButtonStyle(disabled: boolean): React.CSSProperties {
  return { ...baseButtonStyle(disabled), padding: 0, width: 28 };
}

function runButtonStyle(disabled: boolean): React.CSSProperties {
  return { ...baseButtonStyle(disabled), background: "var(--accent)", borderColor: "var(--accent)", color: "white", padding: 0, width: 28 };
}
