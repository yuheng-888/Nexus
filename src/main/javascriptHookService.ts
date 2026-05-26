import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, posix, relative, resolve, sep } from "node:path";
import type { Stats } from "node:fs";
import type {
  ReverseJsHookFeature,
  ReverseJsHookGenerateRequest,
  ReverseJsHookGenerateResult,
  ReverseJsHookInjectRequest,
  ReverseJsHookInjectResult,
  ReverseJsHookRestoreRequest,
  ReverseJsHookRestoreResult
} from "../reverseContracts.js";

interface JavaScriptHookServiceOptions {
  readonly now?: () => number;
}

interface EntryResolution {
  readonly entryPath: string;
  readonly rootPath: string;
}

const DEFAULT_HOOK_FILENAME = "nexus-jshook.js";
const JSHOOK_MARKER = "Nexus jshook";
const SCRIPT_EXTENSIONS = new Set([".cjs", ".js", ".mjs"]);
const FEATURES: readonly ReverseJsHookFeature[] = [
  "child-process",
  "electron-ipc",
  "fetch",
  "storage",
  "websocket",
  "xhr"
];
const HOOK_SOURCE_LINES = [
  "(() => {",
  "  const root = globalThis;",
  "  if (root.__NEXUS_JSHOOK_INSTALLED__) return;",
  "  Object.defineProperty(root, '__NEXUS_JSHOOK_INSTALLED__', { value: true });",
  "  const emit = (event) => {",
  "    try { console.log('[Nexus jshook]', JSON.stringify({ at: Date.now(), ...event })); }",
  "    catch (error) { console.warn('[Nexus jshook] emit failed', error); }",
  "  };",
  "  const wrap = (owner, name, type) => {",
  "    if (!owner || typeof owner[name] !== 'function') return;",
  "    const original = owner[name];",
  "    owner[name] = function nexusHookedMethod(...args) { emit({ args: args.map(String), method: name, type }); return original.apply(this, args); };",
  "  };",
  "  const wrapConstructor = (owner, name, type) => {",
  "    if (!owner || typeof owner[name] !== 'function') return;",
  "    const Original = owner[name];",
  "    owner[name] = function nexusHookedConstructor(...args) { emit({ args: args.map(String), method: name, type }); return Reflect.construct(Original, args, new.target || Original); };",
  "    owner[name].prototype = Original.prototype;",
  "  };",
  "  wrap(root, 'fetch', 'fetch');",
  "  wrapConstructor(root, 'WebSocket', 'websocket');",
  "  wrapConstructor(root, 'XMLHttpRequest', 'xhr');",
  "  for (const name of ['localStorage', 'sessionStorage']) wrapStorage(root[name], name, emit);",
  "  hookRequire(emit, wrap);",
  "  emit({ features: ['child-process','electron-ipc','fetch','storage','websocket','xhr'], type: 'installed' });",
  "})();",
  "",
  "function wrapStorage(storage, name, emit) {",
  "  if (!storage) return;",
  "  for (const method of ['getItem', 'setItem', 'removeItem', 'clear']) {",
  "    if (typeof storage[method] !== 'function') continue;",
  "    const original = storage[method];",
  "    storage[method] = function nexusHookedStorage(...args) { emit({ args: args.map(String), method, type: name }); return original.apply(this, args); };",
  "  }",
  "}",
  "",
  "function hookRequire(emit, wrap) {",
  "  try {",
  "    const Module = require('module');",
  "    const originalRequire = Module.prototype.require;",
  "    Module.prototype.require = function nexusHookedRequire(id) {",
  "      const loaded = originalRequire.apply(this, arguments);",
  "      if (id === 'electron') hookElectron(loaded, emit, wrap);",
  "      if (id === 'child_process') hookChildProcess(loaded, wrap);",
  "      return loaded;",
  "    };",
  "  } catch (error) { console.warn('[Nexus jshook] require hook failed', error); }",
  "}",
  "",
  "function hookElectron(electron, emit, wrap) {",
  "  wrap(electron.ipcMain, 'handle', 'electron-ipc');",
  "  wrap(electron.ipcMain, 'on', 'electron-ipc');",
  "  wrap(electron.ipcRenderer, 'invoke', 'electron-ipc');",
  "  wrap(electron.ipcRenderer, 'send', 'electron-ipc');",
  "}",
  "",
  "function hookChildProcess(childProcess, wrap) {",
  "  for (const method of ['exec', 'execFile', 'fork', 'spawn']) wrap(childProcess, method, 'child-process');",
  "}",
  ""
];

export class JavaScriptHookService {
  private readonly now: () => number;

  constructor(options: JavaScriptHookServiceOptions = {}) {
    this.now = options.now ?? Date.now;
  }

  async generate(request: ReverseJsHookGenerateRequest): Promise<ReverseJsHookGenerateResult> {
    const hookFilename = validateHookFilename(request.hookFilename ?? DEFAULT_HOOK_FILENAME);
    const hookPath = resolve(request.outputDirectory, hookFilename);
    const source = buildHookSource();

    await mkdir(dirname(hookPath), { recursive: true });
    await writeFile(hookPath, source, "utf8");

    return { features: FEATURES, hookFilename, hookPath, sourceLength: source.length };
  }

  async inject(request: ReverseJsHookInjectRequest): Promise<ReverseJsHookInjectResult> {
    const targetPath = resolve(request.targetPath);
    const entry = await resolveEntry({ entryPath: request.entryPath, targetPath });
    const generated = await this.generate({
      hookFilename: request.hookFilename,
      outputDirectory: entry.rootPath
    });
    const source = await readFile(entry.entryPath, "utf8");
    if (source.includes(JSHOOK_MARKER)) throw new Error(`Entry already contains ${JSHOOK_MARKER}: ${entry.entryPath}`);

    const backupPath = `${entry.entryPath}.nexus-bak-${this.now()}`;
    const bootstrapLine = buildBootstrapLine(entry.entryPath, generated.hookPath);
    await copyFile(entry.entryPath, backupPath);
    await writeFile(entry.entryPath, bootstrapSource(bootstrapLine, source), "utf8");

    return { backupPath, bootstrapLine, entryPath: entry.entryPath, hookPath: generated.hookPath, marker: JSHOOK_MARKER, targetPath };
  }

  async restore(request: ReverseJsHookRestoreRequest): Promise<ReverseJsHookRestoreResult> {
    const backupPath = resolve(request.backupPath);
    const entryPath = resolve(request.entryPath);

    await copyFile(backupPath, entryPath);
    return { backupPath, entryPath, restored: true };
  }
}

async function resolveEntry(input: {
  readonly entryPath?: string;
  readonly targetPath: string;
}): Promise<EntryResolution> {
  const metadata = await stat(input.targetPath);
  if (metadata.isFile()) return fileEntry(input.targetPath, metadata);
  if (metadata.isDirectory()) return directoryEntry(input.targetPath, input.entryPath);
  throw new Error(`jshook target is not a file or directory: ${input.targetPath}`);
}

function fileEntry(targetPath: string, metadata: Stats): EntryResolution {
  if (!metadata.isFile() || !isScript(targetPath)) throw new Error(`jshook entry must be a JavaScript file: ${targetPath}`);
  return { entryPath: targetPath, rootPath: dirname(targetPath) };
}

async function directoryEntry(rootPath: string, entryPath: string | undefined): Promise<EntryResolution> {
  const resolved = entryPath === undefined ? await detectEntry(rootPath) : resolve(rootPath, entryPath);
  if (!isScript(resolved)) throw new Error(`jshook entry must be a JavaScript file: ${resolved}`);
  return { entryPath: resolved, rootPath };
}

async function detectEntry(rootPath: string): Promise<string> {
  const packageMain = await readPackageMain(rootPath);
  if (packageMain !== null) return resolve(rootPath, packageMain);
  throw new Error(`jshook entryPath is required when package.json main is missing: ${rootPath}`);
}

async function readPackageMain(rootPath: string): Promise<string | null> {
  try {
    const source = await readFile(join(rootPath, "package.json"), "utf8");
    const parsed = JSON.parse(source) as unknown;
    return isRecord(parsed) && typeof parsed.main === "string" ? parsed.main : null;
  } catch (error) {
    if (isMissingFileError(error)) return null;
    throw error;
  }
}

function buildBootstrapLine(entryPath: string, hookPath: string): string {
  const normalized = relative(dirname(entryPath), hookPath).split(sep).join(posix.sep);
  const requirePath = normalized.startsWith(".") ? normalized : `./${normalized}`;
  return `require('${requirePath}');`;
}

function bootstrapSource(bootstrapLine: string, source: string): string {
  return [
    `/* ${JSHOOK_MARKER}: begin */`,
    bootstrapLine,
    `/* ${JSHOOK_MARKER}: end */`,
    source
  ].join("\n");
}

function buildHookSource(): string {
  return HOOK_SOURCE_LINES.join("\n");
}

function validateHookFilename(filename: string): string {
  if (basename(filename) !== filename || !isScript(filename)) throw new Error(`Invalid jshook filename: ${filename}`);
  return filename;
}

function isScript(path: string): boolean {
  return SCRIPT_EXTENSIONS.has(extname(path).toLowerCase());
}

function isMissingFileError(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
