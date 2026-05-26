import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import type { Plugin, PluginContributionSummary } from "../contracts.js";
import type { FetchLike } from "./skillsMpClient.js";

const execFileAsync = promisify(execFile);

export interface VsCodePluginInstallInput {
  readonly fetch: FetchLike;
  readonly plugin: Plugin;
  readonly pluginsDir: string;
}

export interface VsCodePluginInstallResult {
  readonly contributions: PluginContributionSummary;
  readonly extensionPath: string;
  readonly installedPath: string;
  readonly manifestPath: string;
}

export async function installVsCodePlugin(input: VsCodePluginInstallInput): Promise<VsCodePluginInstallResult> {
  const location = getVsixLocation(input.plugin, input.pluginsDir);
  const response = await input.fetch(requireVsixUrl(input.plugin));

  if (!response.ok) {
    throw new Error(`下载 VS Code 插件失败: HTTP ${response.status}`);
  }

  await mkdir(location.directory, { recursive: true });
  await writeFile(location.filePath, Buffer.from(await response.arrayBuffer()));
  await extractVsix(location.filePath, location.extensionPath);

  return {
    contributions: await readContributionSummary(location.manifestPath),
    extensionPath: location.extensionPath,
    installedPath: location.filePath,
    manifestPath: location.manifestPath
  };
}

function getVsixLocation(plugin: Plugin, pluginsDir: string): {
  readonly directory: string;
  readonly extensionPath: string;
  readonly filePath: string;
  readonly manifestPath: string;
} {
  const extensionId = sanitizePathSegment(`${plugin.publisher}.${plugin.extensionName}`);
  const version = sanitizePathSegment(plugin.version);
  const directory = join(pluginsDir, extensionId);
  const extensionPath = join(directory, "extension");

  return {
    directory,
    extensionPath,
    filePath: join(directory, `${version}.vsix`),
    manifestPath: join(extensionPath, "package.json")
  };
}

async function extractVsix(vsixPath: string, extensionPath: string): Promise<void> {
  await rm(extensionPath, { force: true, recursive: true });
  await execFileAsync("ditto", ["-x", "-k", vsixPath, join(extensionPath, "..")]);
}

async function readContributionSummary(manifestPath: string): Promise<PluginContributionSummary> {
  const manifest = parseManifest(await readFile(manifestPath, "utf8"), manifestPath);
  const contributes = isRecord(manifest.contributes) ? manifest.contributes : {};

  return {
    activationEvents: readStringArray(manifest.activationEvents),
    commands: readNamedContributions(contributes.commands, "title", "command"),
    configurationKeys: readConfigurationKeys(contributes.configuration),
    grammars: readNamedContributions(contributes.grammars, "scopeName", "language"),
    keybindings: readNamedContributions(contributes.keybindings, "command"),
    languages: readNamedContributions(contributes.languages, "id"),
    menus: readMenuNames(contributes.menus),
    snippets: readNamedContributions(contributes.snippets, "language"),
    themes: readNamedContributions(contributes.themes, "label", "id")
  };
}

function parseManifest(content: string, manifestPath: string): Record<string, unknown> {
  try {
    const payload = JSON.parse(content);
    if (isRecord(payload)) return payload;
  } catch (error) {
    throw new Error(`VSIX manifest is not valid JSON: ${manifestPath}`, { cause: error });
  }

  throw new Error(`VSIX manifest root must be an object: ${manifestPath}`);
}

function readNamedContributions(value: unknown, ...fields: readonly string[]): readonly string[] {
  if (!Array.isArray(value)) return [];

  return value.filter(isRecord).flatMap((item) => readFirstString(item, fields));
}

function readFirstString(record: Record<string, unknown>, fields: readonly string[]): readonly string[] {
  const value = fields.map((field) => record[field]).find((item) => typeof item === "string");
  return typeof value === "string" && value !== "" ? [value] : [];
}

function readStringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function readConfigurationKeys(value: unknown): readonly string[] {
  const configurations = Array.isArray(value) ? value : [value];

  return configurations.filter(isRecord).flatMap((item) => readPropertyKeys(item.properties));
}

function readPropertyKeys(value: unknown): readonly string[] {
  return isRecord(value) ? Object.keys(value) : [];
}

function readMenuNames(value: unknown): readonly string[] {
  return isRecord(value) ? Object.keys(value).filter((key) => Array.isArray(value[key])) : [];
}

function requireVsixUrl(plugin: Plugin): string {
  if (plugin.vsixUrl === undefined || plugin.vsixUrl === "") {
    throw new Error(`插件 ${plugin.name} 缺少 VSIX 下载地址`);
  }

  return plugin.vsixUrl;
}

function sanitizePathSegment(value: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9._-]/g, "-");

  if (sanitized === "" || sanitized.includes("..")) {
    throw new Error(`非法插件路径片段: ${value}`);
  }

  return sanitized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
