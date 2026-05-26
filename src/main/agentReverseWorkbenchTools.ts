import type {
  ReverseAsarDiffResult,
  ReverseAsarInspectResult,
  ReverseJsHookGenerateResult,
  ReverseJsHookInjectResult,
  ReverseJsHookRestoreResult,
  ReverseProject
} from "../reverseContracts.js";
import type { AgentInteractiveToolContext, AgentInteractiveToolSpec } from "./agentInteractiveTools.js";
import { readOptionalString, readRequiredString } from "./agentToolArgs.js";
import {
  formatReverseAnalysis,
  formatReverseTargetDetection,
  type ReverseContextProvider
} from "./reverseAgentTools.js";
import { resolveWorkspacePath } from "./pathGuards.js";

export function createReverseToolSpecs(provider: ReverseContextProvider | undefined): readonly AgentInteractiveToolSpec[] {
  return [
    readTool(provider, "reverse.detect_target", "Detect reverse-engineering target metadata.", "path?: string", detectTarget),
    readTool(provider, "reverse.scan_javascript", "Scan JS/TS files with reverse-engineering checks.", "path?: string", scanJavaScript),
    readTool(provider, "reverse.asar.inspect", "Inspect an ASAR archive.", "archivePath: string", inspectAsar),
    readTool(provider, "reverse.asar.diff", "Diff two ASAR archives.", "beforePath: string, afterPath: string", diffAsar),
    readTool(provider, "reverse.projects.list", "List saved reverse-engineering projects.", "none", listProjects),
    writeTool(provider, "reverse.asar.extract", "Extract an ASAR archive.", "archivePath: string, destinationPath: string", extractAsar, previewExtractAsar),
    writeTool(provider, "reverse.asar.pack", "Pack a directory into an ASAR archive.", "sourceDirectory: string, archivePath: string", packAsar, previewPackAsar),
    writeTool(provider, "reverse.jshook.generate", "Generate a Nexus jshook script.", "outputDirectory: string, hookFilename?: string", generateHook, previewGenerateHook),
    writeTool(provider, "reverse.jshook.inject", "Inject Nexus jshook into a JS entry.", "targetPath: string, entryPath?: string, hookFilename?: string", injectHook, previewInjectHook),
    writeTool(provider, "reverse.jshook.restore", "Restore a JS entry from a jshook backup.", "entryPath: string, backupPath: string", restoreHook, previewRestoreHook),
    writeTool(provider, "reverse.projects.add", "Add a saved reverse-engineering project.", "name: string, targetPath: string, notes?: string", addProject, previewAddProject),
    writeTool(provider, "reverse.projects.remove", "Remove a saved reverse-engineering project.", "id: string", removeProject, previewRemoveProject)
  ];
}

function readTool(
  provider: ReverseContextProvider | undefined,
  name: string,
  description: string,
  parameters: string,
  run: (provider: ReverseContextProvider, args: Record<string, unknown>, context: AgentInteractiveToolContext) => Promise<string>
): AgentInteractiveToolSpec {
  return { description, name, parameters, permission: "read", run: (args, context) => run(requireProvider(provider), args, context) };
}

function writeTool(
  provider: ReverseContextProvider | undefined,
  name: string,
  description: string,
  parameters: string,
  run: (provider: ReverseContextProvider, args: Record<string, unknown>) => Promise<string>,
  preview: AgentInteractiveToolSpec["preview"]
): AgentInteractiveToolSpec {
  return { description, name, parameters, permission: "write", preview, run: (args) => run(requireProvider(provider), args) };
}

async function detectTarget(provider: ReverseContextProvider, args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatReverseTargetDetection(await provider.detectTarget(resolveToolPath(args, context)));
}

async function scanJavaScript(provider: ReverseContextProvider, args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatReverseAnalysis(await provider.scanJavaScript({ path: resolveToolPath(args, context) }));
}

async function inspectAsar(provider: ReverseContextProvider, args: Record<string, unknown>): Promise<string> {
  return formatAsarInspect(await provider.inspectAsar({ archivePath: readRequiredString(args, "archivePath") }));
}

async function diffAsar(provider: ReverseContextProvider, args: Record<string, unknown>): Promise<string> {
  return formatAsarDiff(await provider.diffAsar({
    afterPath: readRequiredString(args, "afterPath"),
    beforePath: readRequiredString(args, "beforePath")
  }));
}

async function listProjects(provider: ReverseContextProvider): Promise<string> {
  return formatProjects(await provider.listProjects());
}

async function extractAsar(provider: ReverseContextProvider, args: Record<string, unknown>): Promise<string> {
  const result = await provider.extractAsar({ archivePath: readRequiredString(args, "archivePath"), destinationPath: readRequiredString(args, "destinationPath") });
  return [`archivePath: ${result.archivePath}`, `destinationPath: ${result.destinationPath}`, `extractedFiles: ${result.extractedFiles}`].join("\n");
}

async function packAsar(provider: ReverseContextProvider, args: Record<string, unknown>): Promise<string> {
  const result = await provider.packAsar({ archivePath: readRequiredString(args, "archivePath"), sourceDirectory: readRequiredString(args, "sourceDirectory") });
  return [`sourceDirectory: ${result.sourceDirectory}`, `archivePath: ${result.archivePath}`, `packedFiles: ${result.packedFiles}`].join("\n");
}

async function generateHook(provider: ReverseContextProvider, args: Record<string, unknown>): Promise<string> {
  return formatGeneratedHook(await provider.generateJavaScriptHook({
    hookFilename: readOptionalString(args, "hookFilename"),
    outputDirectory: readRequiredString(args, "outputDirectory")
  }));
}

async function injectHook(provider: ReverseContextProvider, args: Record<string, unknown>): Promise<string> {
  return formatInjectedHook(await provider.injectJavaScriptHook({
    entryPath: readOptionalString(args, "entryPath"),
    hookFilename: readOptionalString(args, "hookFilename"),
    targetPath: readRequiredString(args, "targetPath")
  }));
}

async function restoreHook(provider: ReverseContextProvider, args: Record<string, unknown>): Promise<string> {
  return formatRestoredHook(await provider.restoreJavaScriptHook({
    backupPath: readRequiredString(args, "backupPath"),
    entryPath: readRequiredString(args, "entryPath")
  }));
}

async function addProject(provider: ReverseContextProvider, args: Record<string, unknown>): Promise<string> {
  const project = await provider.addProject({ name: readRequiredString(args, "name"), notes: readOptionalString(args, "notes"), targetPath: readRequiredString(args, "targetPath") });
  return formatProject(project);
}

async function removeProject(provider: ReverseContextProvider, args: Record<string, unknown>): Promise<string> {
  return `removed: ${await provider.removeProject(readRequiredString(args, "id"))}`;
}

async function previewExtractAsar(args: Record<string, unknown>): Promise<string> {
  return `Extract ASAR ${readRequiredString(args, "archivePath")} -> ${readRequiredString(args, "destinationPath")}`;
}

async function previewPackAsar(args: Record<string, unknown>): Promise<string> {
  return `Pack ASAR ${readRequiredString(args, "sourceDirectory")} -> ${readRequiredString(args, "archivePath")}`;
}

async function previewGenerateHook(args: Record<string, unknown>): Promise<string> {
  return `Generate jshook in ${readRequiredString(args, "outputDirectory")}`;
}

async function previewInjectHook(args: Record<string, unknown>): Promise<string> {
  return `Inject jshook into ${readRequiredString(args, "targetPath")}`;
}

async function previewRestoreHook(args: Record<string, unknown>): Promise<string> {
  return `Restore jshook backup ${readRequiredString(args, "backupPath")}`;
}

async function previewAddProject(args: Record<string, unknown>): Promise<string> {
  return `Add reverse project ${readRequiredString(args, "name")}`;
}

async function previewRemoveProject(args: Record<string, unknown>): Promise<string> {
  return `Remove reverse project ${readRequiredString(args, "id")}`;
}

function formatAsarInspect(result: ReverseAsarInspectResult): string {
  return [
    `archivePath: ${result.archivePath}`,
    `files: ${result.files}`,
    `directories: ${result.directories}`,
    `totalSize: ${result.totalSize}`,
    `entries: ${result.entries.length}`,
    ...result.entries.slice(0, 12).map((entry) => `${entry.type} ${entry.path} ${entry.size ?? ""}`.trim())
  ].join("\n");
}

function formatAsarDiff(result: ReverseAsarDiffResult): string {
  return [
    `beforePath: ${result.beforePath}`,
    `afterPath: ${result.afterPath}`,
    `added: ${result.added}`,
    `modified: ${result.modified}`,
    `removed: ${result.removed}`,
    `entries: ${result.entries.length}`,
    ...result.entries.slice(0, 12).map((entry) => `${entry.change} ${entry.path}`)
  ].join("\n");
}

function formatGeneratedHook(result: ReverseJsHookGenerateResult): string {
  return [
    `hookPath: ${result.hookPath}`,
    `hookFilename: ${result.hookFilename}`,
    `sourceLength: ${result.sourceLength}`,
    `features: ${result.features.join(", ")}`
  ].join("\n");
}

function formatInjectedHook(result: ReverseJsHookInjectResult): string {
  return [
    `targetPath: ${result.targetPath}`,
    `entryPath: ${result.entryPath}`,
    `hookPath: ${result.hookPath}`,
    `backupPath: ${result.backupPath}`,
    `bootstrapLine: ${result.bootstrapLine}`,
    `marker: ${result.marker}`
  ].join("\n");
}

function formatRestoredHook(result: ReverseJsHookRestoreResult): string {
  return [
    `entryPath: ${result.entryPath}`,
    `backupPath: ${result.backupPath}`,
    `restored: ${result.restored}`
  ].join("\n");
}

function formatProjects(projects: readonly ReverseProject[]): string {
  if (projects.length === 0) return "No reverse projects.";
  return projects.map(formatProject).join("\n\n");
}

function formatProject(project: ReverseProject): string {
  return [
    `project: ${project.name} [${project.targetType}]`,
    `id: ${project.id}`,
    `targetPath: ${project.targetPath}`,
    project.notes === undefined ? "" : `notes: ${project.notes}`
  ].filter(Boolean).join("\n");
}

function resolveToolPath(args: Record<string, unknown>, context: AgentInteractiveToolContext): string {
  return resolveWorkspacePath(requireWorkspaceRoot(context), readOptionalString(args, "path") ?? context.cwd);
}

function requireWorkspaceRoot(context: AgentInteractiveToolContext): string {
  if (context.workspaceRoot === null) throw new Error("No workspace is open");
  return context.workspaceRoot;
}

function requireProvider(provider: ReverseContextProvider | undefined): ReverseContextProvider {
  if (provider === undefined) throw new Error("Reverse tools are not configured.");
  return provider;
}
