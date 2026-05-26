import type { SearchReplaceApplyResult, SearchReplaceFilePreview, SearchReplacePreviewResult, SearchReplaceRequest } from "../contracts.js";
import type { AgentInteractiveToolContext, AgentInteractiveToolSpec } from "./agentInteractiveTools.js";
import { readOptionalString, readRequiredString } from "./agentToolArgs.js";

export function createSearchReplaceToolSpecs(): readonly AgentInteractiveToolSpec[] {
  return [
    {
      description: "Preview literal replacements across workspace files without writing.",
      name: "workspace.replace_preview",
      parameters: "query: string, replacement: string, cwd?: string, paths?: string[]",
      permission: "read",
      run: previewReplace
    },
    {
      description: "Apply literal replacements across workspace files.",
      name: "workspace.replace_all",
      parameters: "query: string, replacement: string, cwd?: string, paths?: string[]",
      permission: "write",
      preview: previewReplace,
      run: applyReplace
    }
  ];
}

async function previewReplace(
  args: Record<string, unknown>,
  context: AgentInteractiveToolContext
): Promise<string> {
  return formatReplacePreview(await context.search.previewReplace(readReplaceRequest(args, context)));
}

async function applyReplace(
  args: Record<string, unknown>,
  context: AgentInteractiveToolContext
): Promise<string> {
  return formatApplyResult(await context.search.applyReplace(readReplaceRequest(args, context)));
}

function readReplaceRequest(
  args: Record<string, unknown>,
  context: AgentInteractiveToolContext
): SearchReplaceRequest {
  return {
    cwd: readOptionalString(args, "cwd") ?? context.cwd,
    paths: readOptionalPaths(args.paths),
    query: readRequiredString(args, "query"),
    replacement: readRequiredString(args, "replacement")
  };
}

function readOptionalPaths(value: unknown): readonly string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error("Tool argument paths must be strings");
  }
  return value;
}

function formatReplacePreview(result: SearchReplacePreviewResult): string {
  const header = `${result.totalMatches} matches in ${result.files.length} files`;
  return [header, ...result.files.flatMap(formatPreviewFile)].join("\n");
}

function formatPreviewFile(file: SearchReplaceFilePreview): readonly string[] {
  return [
    `${file.path} (${file.matches})`,
    ...file.previews.flatMap((line) => [
      `${line.line}: ${line.before}`,
      `=> ${line.after}`
    ])
  ];
}

function formatApplyResult(result: SearchReplaceApplyResult): string {
  return [
    `Replaced ${result.totalMatches} matches in ${result.filesChanged} files`,
    ...result.paths
  ].join("\n");
}
