import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export interface WorkspaceState {
  readonly lastWorkspaceRoot: string | null;
  readonly recentWorkspaceRoots: readonly string[];
}

export interface WorkspaceStateStoreOptions {
  readonly storePath?: string;
}

type JsonRecord = Record<string, unknown>;

const STORE_VERSION = 1;

export class WorkspaceStateStore {
  readonly storePath: string;

  constructor(options: WorkspaceStateStoreOptions = {}) {
    this.storePath = options.storePath ?? defaultWorkspaceStateStorePath();
  }

  load(): WorkspaceState {
    if (!existsSync(this.storePath)) return emptyWorkspaceState();
    return parseState(readFileSync(this.storePath, "utf8"), this.storePath);
  }

  recordOpened(workspaceRoot: string): WorkspaceState {
    const root = resolve(workspaceRoot);
    const state = this.load();
    const recentWorkspaceRoots = uniqueRoots([root, ...state.recentWorkspaceRoots]);
    const nextState = { lastWorkspaceRoot: root, recentWorkspaceRoots };

    this.save(nextState);
    return nextState;
  }

  save(state: WorkspaceState): void {
    const payload = { ...state, version: STORE_VERSION };

    mkdirSync(dirname(this.storePath), { recursive: true });
    writeFileSync(this.storePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }
}

export function defaultWorkspaceStateStorePath(): string {
  return join(homedir(), ".nexus", "workspace-state.json");
}

function emptyWorkspaceState(): WorkspaceState {
  return {
    lastWorkspaceRoot: null,
    recentWorkspaceRoots: []
  };
}

function parseState(source: string, storePath: string): WorkspaceState {
  const payload = parseJson(source, storePath);
  const recentWorkspaceRoots = readRecentWorkspaceRoots(payload.recentWorkspaceRoots, storePath);
  const lastWorkspaceRoot = readLastWorkspaceRoot(payload.lastWorkspaceRoot, storePath);

  return {
    lastWorkspaceRoot,
    recentWorkspaceRoots: uniqueRoots(recentWorkspaceRoots)
  };
}

function parseJson(source: string, storePath: string): JsonRecord {
  try {
    const parsed = JSON.parse(source) as unknown;
    if (isRecord(parsed)) return parsed;
  } catch (error) {
    throw new Error(`工作区状态文件不是合法 JSON: ${storePath}`, { cause: error });
  }

  throw new Error(`工作区状态文件根节点必须是对象: ${storePath}`);
}

function readRecentWorkspaceRoots(value: unknown, storePath: string): readonly string[] {
  if (!Array.isArray(value)) throw new Error(`工作区状态文件缺少 recentWorkspaceRoots 数组: ${storePath}`);
  return value.map((item, index) => readWorkspaceRoot(item, `recentWorkspaceRoots[${index}]`, storePath));
}

function readLastWorkspaceRoot(value: unknown, storePath: string): string | null {
  if (value === null) return null;
  return readWorkspaceRoot(value, "lastWorkspaceRoot", storePath);
}

function readWorkspaceRoot(value: unknown, field: string, storePath: string): string {
  if (typeof value === "string" && value.trim() !== "") return resolve(value);
  throw new Error(`工作区状态字段 ${field} 必须是非空字符串: ${storePath}`);
}

function uniqueRoots(roots: readonly string[]): readonly string[] {
  return Array.from(new Set(roots.map((root) => resolve(root))));
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
