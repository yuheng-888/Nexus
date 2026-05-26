import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { ReverseProject, ReverseProjectDraft, ReverseTargetType } from "../reverseContracts.js";

interface ReverseProjectState {
  readonly projects: readonly ReverseProject[];
}

interface ReverseProjectStorePayload extends ReverseProjectState {
  readonly version: number;
}

export interface ReverseProjectServiceOptions {
  readonly storePath?: string;
}

const STORE_VERSION = 1;

export class ReverseProjectService {
  readonly storePath: string;

  constructor(options: ReverseProjectServiceOptions = {}) {
    this.storePath = options.storePath ?? defaultReverseProjectStorePath();
  }

  async listProjects(): Promise<readonly ReverseProject[]> {
    return (await this.load()).projects;
  }

  async addProject(input: {
    readonly draft: ReverseProjectDraft;
    readonly targetType: ReverseTargetType;
  }): Promise<ReverseProject> {
    const state = await this.load();
    const now = Date.now();
    const project = toProject(input.draft, input.targetType, now);

    await this.save({ projects: [...state.projects, project] });
    return project;
  }

  async removeProject(id: string): Promise<boolean> {
    const state = await this.load();
    const projects = state.projects.filter((project) => project.id !== id);
    if (projects.length === state.projects.length) return false;
    await this.save({ projects });
    return true;
  }

  async clear(): Promise<void> {
    await rm(this.storePath, { force: true });
  }

  private async load(): Promise<ReverseProjectState> {
    if (!existsSync(this.storePath)) return { projects: [] };
    return parseState(await readFile(this.storePath, "utf8"), this.storePath);
  }

  private async save(state: ReverseProjectState): Promise<void> {
    const payload: ReverseProjectStorePayload = { projects: state.projects, version: STORE_VERSION };
    await mkdir(dirname(this.storePath), { recursive: true });
    await writeFile(this.storePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }
}

export function defaultReverseProjectStorePath(): string {
  return join(homedir(), ".nexus", "reverse-projects.json");
}

function toProject(draft: ReverseProjectDraft, targetType: ReverseTargetType, now: number): ReverseProject {
  return {
    createdAt: now,
    id: randomUUID(),
    name: draft.name,
    notes: draft.notes,
    targetPath: draft.targetPath,
    targetType,
    updatedAt: now
  };
}

function parseState(source: string, storePath: string): ReverseProjectState {
  const payload = parseJson(source, storePath);
  if (!Array.isArray(payload.projects)) throw new Error(`Reverse project store missing projects array: ${storePath}`);
  return { projects: payload.projects.map(readProject) };
}

function parseJson(source: string, storePath: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(source) as unknown;
    if (isRecord(parsed)) return parsed;
  } catch (error) {
    throw new Error(`Reverse project store is not valid JSON: ${storePath}`, { cause: error });
  }

  throw new Error(`Reverse project store root must be an object: ${storePath}`);
}

function readProject(value: unknown): ReverseProject {
  if (!isRecord(value)) throw new Error("Reverse project entry must be an object");
  return {
    createdAt: readNumber(value.createdAt, "createdAt"),
    id: readString(value.id, "id"),
    name: readString(value.name, "name"),
    notes: readOptionalString(value.notes, "notes"),
    targetPath: readString(value.targetPath, "targetPath"),
    targetType: readTargetType(value.targetType),
    updatedAt: readNumber(value.updatedAt, "updatedAt")
  };
}

function readTargetType(value: unknown): ReverseTargetType {
  if (["asar", "electron-app", "javascript-bundle", "node-project", "unknown"].includes(String(value))) {
    return value as ReverseTargetType;
  }

  throw new Error("Reverse project field targetType is invalid");
}

function readString(value: unknown, field: string): string {
  if (typeof value === "string") return value;
  throw new Error(`Reverse project field ${field} is invalid`);
}

function readOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string") return value;
  throw new Error(`Reverse project field ${field} is invalid`);
}

function readNumber(value: unknown, field: string): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw new Error(`Reverse project field ${field} is invalid`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
