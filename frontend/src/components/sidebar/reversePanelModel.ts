import type {
  ReverseAnalysisFinding,
  ReverseAnalysisResult,
  ReverseAnalysisSeverity,
  ReverseAsarChangeType,
  ReverseAsarDiffEntry,
  ReverseAsarDiffResult,
  ReverseAsarEntry,
  ReverseAsarInspectResult,
  ReverseTargetDetection,
  ReverseTargetType
} from "../../types/reverse";
import type { EditorLocation } from "../editor/editorNavigation";

const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const;
const BYTES_PER_UNIT = 1024;
const RESULT_PREVIEW_LIMIT = 8;

export interface ReverseActionState {
  readonly action: string;
  readonly requiredPath: string;
}

export interface ReverseSeverityCounts {
  readonly critical: number;
  readonly info: number;
  readonly warning: number;
}

export function defaultReverseTargetPath(workspaceRoot: string | null): string {
  return workspaceRoot ?? "";
}

export function reverseTargetTypeLabel(type: ReverseTargetType): string {
  const labels: Record<ReverseTargetType, string> = {
    asar: "ASAR 归档",
    "electron-app": "Electron 应用",
    "javascript-bundle": "JavaScript 包",
    "node-project": "Node 项目",
    unknown: "未知目标"
  };
  return labels[type];
}

export function suggestedProjectName(
  target: ReverseTargetDetection | null,
  targetPath: string
): string {
  if (target !== null && target.name.trim() !== "") return target.name;
  return basename(targetPath.trim()) || "Reverse Target";
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(BYTES_PER_UNIT)), BYTE_UNITS.length - 1);
  const value = bytes / (BYTES_PER_UNIT ** unitIndex);
  return `${formatUnitValue(value)} ${BYTE_UNITS[unitIndex]}`;
}

export function asarInspectSummary(result: ReverseAsarInspectResult | null): string {
  if (result === null) return "尚未读取 ASAR";
  return `${result.files} 文件 · ${result.directories} 目录 · ${formatBytes(result.totalSize)}`;
}

export function asarDiffSummary(result: ReverseAsarDiffResult | null): string {
  if (result === null) return "尚未比较 ASAR";
  return `新增 ${result.added} · 修改 ${result.modified} · 删除 ${result.removed}`;
}

export function topAsarEntries(entries: readonly ReverseAsarEntry[]): readonly ReverseAsarEntry[] {
  return entries.slice(0, RESULT_PREVIEW_LIMIT);
}

export function topAsarDiffEntries(entries: readonly ReverseAsarDiffEntry[]): readonly ReverseAsarDiffEntry[] {
  return entries.slice(0, RESULT_PREVIEW_LIMIT);
}

export function asarEntryMeta(entry: ReverseAsarEntry): string {
  const type = asarEntryTypeLabel(entry.type);
  if (entry.size === undefined) return type;
  return `${type} · ${formatBytes(entry.size)}`;
}

export function asarDiffEntryMeta(entry: ReverseAsarDiffEntry): string {
  const source = entry.after ?? entry.before;
  if (source === undefined) return reverseChangeLabel(entry.change);
  return `${reverseChangeLabel(entry.change)} · ${asarEntryMeta(source)}`;
}

export function reverseChangeLabel(change: ReverseAsarChangeType): string {
  if (change === "added") return "新增";
  if (change === "modified") return "修改";
  return "删除";
}

export function reverseSeverityCounts(
  findings: readonly ReverseAnalysisFinding[]
): ReverseSeverityCounts {
  return findings.reduce(
    (counts, finding) => incrementSeverity(counts, finding.severity),
    { critical: 0, info: 0, warning: 0 }
  );
}

export function reverseAnalysisSummary(result: ReverseAnalysisResult | null): string {
  if (result === null) return "尚未扫描 JavaScript";
  return [
    `扫描 ${result.scannedFiles} 文件`,
    `${result.findings.length} 发现`,
    `${result.dependencies.length} 依赖`,
    `${result.skippedFiles.length} 跳过`
  ].join(" · ");
}

export function isReverseActionDisabled(state: ReverseActionState): boolean {
  return state.action !== "" || state.requiredPath.trim() === "";
}

export function reverseErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `逆向操作失败: ${message}`;
}

export function reverseSeverityLabel(severity: ReverseAnalysisSeverity): string {
  if (severity === "critical") return "严重";
  if (severity === "warning") return "警告";
  return "信息";
}

export function reverseFindingLocation(finding: ReverseAnalysisFinding): string {
  return `${finding.path}:${finding.line}`;
}

export function reverseFindingEditorLocation(finding: ReverseAnalysisFinding): EditorLocation {
  return {
    column: 1,
    line: finding.line,
    path: finding.absolutePath
  };
}

function basename(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts.at(-1) ?? "";
}

function formatUnitValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function incrementSeverity(
  counts: ReverseSeverityCounts,
  severity: ReverseAnalysisSeverity
): ReverseSeverityCounts {
  return { ...counts, [severity]: counts[severity] + 1 };
}

function asarEntryTypeLabel(type: ReverseAsarEntry["type"]): string {
  if (type === "directory") return "目录";
  if (type === "link") return "链接";
  return "文件";
}
