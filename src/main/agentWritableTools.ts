import type { AgentInteractiveToolContext, AgentInteractiveToolSpec } from "./agentInteractiveTools.js";
import { readRequiredString } from "./agentToolArgs.js";

const PREVIEW_CHARS = 1200;

export function createWritableToolSpecs(): readonly AgentInteractiveToolSpec[] {
  return [
    writeTool("workspace.write_file", "Write a UTF-8 text file in the workspace.", "path: string, content: string", writeFile, previewWriteFile)
  ];
}

function writeTool(
  name: string,
  description: string,
  parameters: string,
  run: AgentInteractiveToolSpec["run"],
  preview: AgentInteractiveToolSpec["preview"]
): AgentInteractiveToolSpec {
  return { description, name, parameters, permission: "write", preview, run };
}

async function writeFile(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  const path = readRequiredString(args, "path");
  const content = readRequiredString(args, "content");
  const result = await context.files.writeTextFile(path, content);
  return `Wrote ${result.path} (${content.length} chars)`;
}

async function previewWriteFile(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  const path = readRequiredString(args, "path");
  const content = readRequiredString(args, "content");
  const existing = await readExistingFile(path, context);

  return [
    existing === null ? `Create ${path}` : `Overwrite ${existing.path}`,
    `nextChars=${content.length}`,
    existing === null ? "" : `currentChars=${existing.content.length}`,
    existing === null ? "" : `--- current\n${truncate(existing.content)}`,
    `--- next\n${truncate(content)}`
  ].filter(Boolean).join("\n");
}

async function readExistingFile(
  path: string,
  context: AgentInteractiveToolContext
): Promise<{ readonly content: string; readonly path: string } | null> {
  try {
    return await context.files.readTextFile(path);
  } catch (error) {
    if (isMissingFileError(error)) return null;
    throw error;
  }
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function truncate(value: string): string {
  if (value.length <= PREVIEW_CHARS) return value;
  return `${value.slice(0, PREVIEW_CHARS)}\n... truncated ${value.length - PREVIEW_CHARS} chars`;
}
