import type {
  ReverseAnalysisRequest,
  ReverseAnalysisResult,
  ReverseAsarDiffRequest,
  ReverseAsarDiffResult,
  ReverseAsarExtractRequest,
  ReverseAsarExtractResult,
  ReverseAsarInspectRequest,
  ReverseAsarInspectResult,
  ReverseAsarPackRequest,
  ReverseAsarPackResult,
  ReverseJsHookGenerateRequest,
  ReverseJsHookGenerateResult,
  ReverseJsHookInjectRequest,
  ReverseJsHookInjectResult,
  ReverseJsHookRestoreRequest,
  ReverseJsHookRestoreResult,
  ReverseProject,
  ReverseProjectDraft,
  ReverseTargetDetection
} from "../reverseContracts.js";

export interface ReverseContextProvider {
  addProject(draft: ReverseProjectDraft): Promise<ReverseProject>;
  detectTarget(path: string): Promise<ReverseTargetDetection>;
  diffAsar(request: ReverseAsarDiffRequest): Promise<ReverseAsarDiffResult>;
  extractAsar(request: ReverseAsarExtractRequest): Promise<ReverseAsarExtractResult>;
  generateJavaScriptHook(request: ReverseJsHookGenerateRequest): Promise<ReverseJsHookGenerateResult>;
  injectJavaScriptHook(request: ReverseJsHookInjectRequest): Promise<ReverseJsHookInjectResult>;
  inspectAsar(request: ReverseAsarInspectRequest): Promise<ReverseAsarInspectResult>;
  listProjects(): Promise<readonly ReverseProject[]>;
  packAsar(request: ReverseAsarPackRequest): Promise<ReverseAsarPackResult>;
  removeProject(id: string): Promise<boolean>;
  restoreJavaScriptHook(request: ReverseJsHookRestoreRequest): Promise<ReverseJsHookRestoreResult>;
  scanJavaScript(request: ReverseAnalysisRequest): Promise<ReverseAnalysisResult>;
}

const MAX_REVERSE_ITEMS = 12;
const SNIPPET_PREVIEW_CHARS = 160;

export function formatReverseTargetDetection(target: ReverseTargetDetection): string {
  return [
    `Detected target: ${target.type}`,
    `confidence=${target.confidence}`,
    `name=${target.name}`,
    `path=${target.absolutePath}`,
    formatSignals(target.signals)
  ].filter(Boolean).join("\n");
}

export function formatReverseAnalysis(result: ReverseAnalysisResult): string {
  return [
    formatReverseAnalysisHeader(result),
    formatReverseFindings(result),
    formatReverseDependencies(result),
    formatSkippedFiles(result)
  ].filter(Boolean).join("\n");
}

function formatReverseAnalysisHeader(result: ReverseAnalysisResult): string {
  return [
    `Scanned ${result.scannedFiles} JS/TS files.`,
    `Findings: ${result.findings.length}.`,
    `Dependencies: ${result.dependencies.length}.`,
    `Skipped: ${result.skippedFiles.length}.`,
    `Target: ${result.targetPath}`
  ].join(" ");
}

function formatReverseFindings(result: ReverseAnalysisResult): string {
  if (result.findings.length === 0) return "Findings: none.";

  return [
    "Top findings:",
    ...result.findings.slice(0, MAX_REVERSE_ITEMS).map((finding) => {
      return [
        `- [${finding.severity}] ${finding.type}`,
        `${finding.path}:${finding.line}`,
        finding.message,
        trimSnippet(finding.snippet)
      ].join(" | ");
    })
  ].join("\n");
}

function formatReverseDependencies(result: ReverseAnalysisResult): string {
  if (result.dependencies.length === 0) return "Dependencies: none.";

  return [
    "Top dependencies:",
    ...result.dependencies.slice(0, MAX_REVERSE_ITEMS).map((dependency) => {
      return `- ${dependency.importKind} ${dependency.name} at ${dependency.path}:${dependency.line}`;
    })
  ].join("\n");
}

function formatSkippedFiles(result: ReverseAnalysisResult): string {
  if (result.skippedFiles.length === 0) return "";

  return [
    "Skipped files:",
    ...result.skippedFiles.slice(0, MAX_REVERSE_ITEMS).map((file) => {
      return `- ${file.path}: ${file.message}`;
    })
  ].join("\n");
}

function formatSignals(signals: readonly string[]): string {
  if (signals.length === 0) return "";
  return `signals=${signals.join("; ")}`;
}

function trimSnippet(snippet: string): string {
  if (snippet.length <= SNIPPET_PREVIEW_CHARS) return snippet;
  return `${snippet.slice(0, SNIPPET_PREVIEW_CHARS)}...`;
}
