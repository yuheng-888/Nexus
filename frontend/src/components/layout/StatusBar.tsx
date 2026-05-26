import React from "react";
import { useStore } from "../../store/useStore";
import { useLanguageStore } from "../../store/languageStore";
import { AlertCircle, AlertTriangle, GitBranch, Terminal, Circle } from "lucide-react";
import type { EditorTab } from "../../store/useStore";
import type { ProblemSummary } from "../editor/languageClient";
import { statusBarGitLabel, useStatusBarGitState } from "./statusBarGit";

export function StatusBar() {
  const activeTab = useStore((s) => s.activeTab);
  const tabs = useStore((s) => s.tabs);
  const terminalSessions = useStore((s) => s.terminalSessions);
  const workspaceName = useStore((s) => s.workspaceName);
  const workspaceRoot = useStore((s) => s.workspaceRoot);
  const summary = useLanguageStore((s) => s.problemSummary);
  const gitState = useStatusBarGitState(workspaceRoot);

  const currentTab = tabs.find((t) => t.path === activeTab);

  return (
    <div style={{
      height: "var(--statusbar-height)",
      background: "var(--bg-tertiary)",
      borderTop: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 12px",
      flexShrink: 0,
      fontSize: 11,
      color: "var(--text-muted)",
      zIndex: 100,
    }}>
      <LeftStatus gitError={gitState.error} gitLabel={statusBarGitLabel(gitState)} terminalCount={terminalSessions.length} />
      <RightStatus currentTab={currentTab} summary={summary} workspaceName={workspaceName} />
    </div>
  );
}

function LeftStatus(props: {
  readonly gitError: string;
  readonly gitLabel: string;
  readonly terminalCount: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }} title={props.gitError}>
        <GitBranch size={12} />
        <span>{props.gitLabel}</span>
      </div>
      {props.terminalCount > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Terminal size={12} />
          <span>{props.terminalCount}</span>
        </div>
      )}
    </div>
  );
}

function RightStatus(props: {
  readonly currentTab: EditorTab | undefined;
  readonly summary: ProblemSummary;
  readonly workspaceName: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <ProblemStatus summary={props.summary} />
      <TabStatus currentTab={props.currentTab} />
      <span>UTF-8</span>
      <span style={{ fontWeight: 500, color: "var(--text-secondary)" }}>{props.workspaceName}</span>
    </div>
  );
}

function ProblemStatus({ summary }: { readonly summary: ProblemSummary }) {
  if (summary.total === 0) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 3, color: "var(--error)" }}>
        <AlertCircle size={12} />
        {summary.errors}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 3, color: "var(--warning)" }}>
        <AlertTriangle size={12} />
        {summary.warnings}
      </span>
    </div>
  );
}

function TabStatus({ currentTab }: { readonly currentTab: EditorTab | undefined }) {
  if (currentTab === undefined) return null;

  return (
    <>
      {currentTab.dirty && (
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <Circle size={6} fill="var(--warning)" color="var(--warning)" />
          <span>未保存</span>
        </div>
      )}
      <span>{currentTab.name}</span>
    </>
  );
}
