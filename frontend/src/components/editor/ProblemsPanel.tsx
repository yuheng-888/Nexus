import React from "react";
import { AlertCircle, AlertTriangle, Info, Lightbulb } from "lucide-react";
import { useLanguageStore } from "../../store/languageStore";
import type { EditorProblem } from "./languageClient";
import { problemToEditorLocation } from "./editorNavigation";
import { useOpenEditorLocation } from "./useOpenEditorLocation";

export function ProblemsPanel() {
  const problems = useLanguageStore((state) => state.problems);

  return (
    <div style={{ height: "100%", overflow: "auto", background: "var(--bg-panel)" }}>
      {problems.length === 0 ? (
        <EmptyProblems />
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {problems.map((problem, index) => (
            <ProblemRow key={`${problem.path}:${problem.range.start.line}:${index}`} problem={problem} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyProblems() {
  return (
    <div style={{
      alignItems: "center",
      color: "var(--text-muted)",
      display: "flex",
      fontSize: 12,
      height: "100%",
      justifyContent: "center"
    }}>
      当前没有诊断问题
    </div>
  );
}

function ProblemRow({ problem }: { readonly problem: EditorProblem }) {
  const openLocation = useOpenEditorLocation();

  return (
    <button
      onClick={() => void openLocation(problemToEditorLocation(problem))}
      style={{
      alignItems: "center",
      borderBottom: "1px solid var(--border-subtle)",
      background: "transparent",
      borderLeft: "none",
      borderRight: "none",
      borderTop: "none",
      color: "var(--text-secondary)",
      cursor: "pointer",
      display: "grid",
      fontFamily: "inherit",
      fontSize: 12,
      gap: 10,
      gridTemplateColumns: "18px minmax(220px, 1fr) minmax(160px, 280px)",
      minHeight: 32,
      padding: "0 12px",
      textAlign: "left",
      width: "100%"
    }}
      title={`打开 ${problem.path}:${problem.range.start.line}:${problem.range.start.character}`}
    >
      <span style={{ alignItems: "center", display: "flex", justifyContent: "center" }}>
        {severityIcon(problem.severity)}
      </span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {problem.message}
      </span>
      <span style={{
        color: "var(--text-muted)",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }}>
        {problem.path}:{problem.range.start.line}:{problem.range.start.character}
      </span>
    </button>
  );
}

function severityIcon(severity: EditorProblem["severity"]) {
  if (severity === "error") return <AlertCircle size={14} color="var(--error)" />;
  if (severity === "warning") return <AlertTriangle size={14} color="var(--warning)" />;
  if (severity === "hint") return <Lightbulb size={14} color="var(--info)" />;
  return <Info size={14} color="var(--info)" />;
}
