import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Plugin } from "../contracts.js";

const STORE_FILE = "installed-plugins.json";

export class PluginInstallStore {
  readonly storePath: string;

  constructor(pluginsDir: string) {
    this.storePath = join(pluginsDir, STORE_FILE);
  }

  async list(): Promise<readonly Plugin[]> {
    const content = await readOptionalFile(this.storePath);
    if (content === null) return [];
    return parseStore(content, this.storePath);
  }

  async upsert(plugin: Plugin): Promise<void> {
    if (plugin.installedPath === undefined || plugin.installedPath === "") {
      throw new Error(`Installed plugin ${plugin.id} is missing installedPath`);
    }

    const plugins = await this.list();
    const next = [...plugins.filter((item) => item.id !== plugin.id), { ...plugin, installed: true }];
    await this.save(next);
  }

  async remove(id: string): Promise<Plugin | null> {
    const plugins = await this.list();
    const plugin = plugins.find((item) => item.id === id);
    if (plugin === undefined) return null;

    await this.save(plugins.filter((item) => item.id !== id));
    return plugin;
  }

  private async save(plugins: readonly Plugin[]): Promise<void> {
    await mkdir(dirname(this.storePath), { recursive: true });
    await writeFile(this.storePath, JSON.stringify({ plugins }, null, 2));
  }
}

async function readOptionalFile(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return null;
    throw error;
  }
}

function parseStore(content: string, storePath: string): readonly Plugin[] {
  try {
    return parsePayload(JSON.parse(content), storePath);
  } catch (error) {
    throw new Error(`Installed plugin store is not valid: ${storePath}`, { cause: error });
  }
}

function parsePayload(payload: unknown, storePath: string): readonly Plugin[] {
  if (!isRecord(payload)) {
    throw new Error(`Installed plugin store root must be an object: ${storePath}`);
  }

  if (!Array.isArray(payload.plugins)) {
    throw new Error(`Installed plugin store missing plugins array: ${storePath}`);
  }

  return payload.plugins.map(readPlugin);
}

function readPlugin(value: unknown): Plugin {
  if (!isRecord(value)) throw new Error("Installed plugin entry must be an object");

  return {
    author: readString(value, "author"),
    category: readString(value, "category"),
    contributions: readContributions(value.contributions),
    description: readString(value, "description"),
    downloads: readNumber(value, "downloads"),
    enabled: readBoolean(value, "enabled"),
    extensionPath: readOptionalString(value, "extensionPath"),
    extensionName: readOptionalString(value, "extensionName"),
    icon: readString(value, "icon"),
    id: readString(value, "id"),
    installed: readBoolean(value, "installed"),
    installedPath: readString(value, "installedPath"),
    manifestPath: readOptionalString(value, "manifestPath"),
    marketplaceUrl: readOptionalString(value, "marketplaceUrl"),
    name: readString(value, "name"),
    publisher: readOptionalString(value, "publisher"),
    rating: readNumber(value, "rating"),
    source: readSource(value.source),
    updatedAt: readOptionalString(value, "updatedAt"),
    version: readString(value, "version"),
    vsixUrl: readOptionalString(value, "vsixUrl")
  };
}

function readString(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value === "string") return value;
  throw new Error(`Installed plugin field ${field} is invalid`);
}

function readOptionalString(record: Record<string, unknown>, field: string): string | undefined {
  const value = record[field];
  if (value === undefined) return undefined;
  if (typeof value === "string") return value;
  throw new Error(`Installed plugin field ${field} is invalid`);
}

function readNumber(record: Record<string, unknown>, field: string): number {
  const value = record[field];
  if (typeof value === "number") return value;
  throw new Error(`Installed plugin field ${field} is invalid`);
}

function readBoolean(record: Record<string, unknown>, field: string): boolean {
  const value = record[field];
  if (typeof value === "boolean") return value;
  throw new Error(`Installed plugin field ${field} is invalid`);
}

function readContributions(value: unknown): Plugin["contributions"] {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new Error("Installed plugin field contributions is invalid");

  return {
    activationEvents: readReadonlyStrings(value, "activationEvents"),
    commands: readReadonlyStrings(value, "commands"),
    configurationKeys: readReadonlyStrings(value, "configurationKeys"),
    grammars: readReadonlyStrings(value, "grammars"),
    keybindings: readReadonlyStrings(value, "keybindings"),
    languages: readReadonlyStrings(value, "languages"),
    menus: readReadonlyStrings(value, "menus"),
    snippets: readReadonlyStrings(value, "snippets"),
    themes: readReadonlyStrings(value, "themes")
  };
}

function readReadonlyStrings(record: Record<string, unknown>, field: string): readonly string[] {
  const value = record[field];
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) return value;
  throw new Error(`Installed plugin contribution field ${field} is invalid`);
}

function readSource(value: unknown): "vscode" | undefined {
  if (value === undefined || value === "vscode") return value;
  throw new Error("Installed plugin field source is invalid");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
