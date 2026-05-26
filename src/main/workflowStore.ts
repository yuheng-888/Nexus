import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { WorkflowDefinition, WorkflowStep } from "../workflowContracts.js";

interface WorkflowStoreState {
  readonly definitions: readonly WorkflowDefinition[];
}

interface WorkflowStorePayload extends WorkflowStoreState {
  readonly version: number;
}

export interface WorkflowStoreOptions {
  readonly storePath?: string;
}

type JsonRecord = Record<string, unknown>;

const STORE_VERSION = 1;

export class WorkflowStore {
  readonly storePath: string;

  constructor(options: WorkflowStoreOptions = {}) {
    this.storePath = options.storePath ?? defaultWorkflowStorePath();
  }

  load(): WorkflowStoreState {
    if (!existsSync(this.storePath)) return { definitions: [] };
    return parseState(readFileSync(this.storePath, "utf8"), this.storePath);
  }

  save(state: WorkflowStoreState): void {
    const payload: WorkflowStorePayload = { definitions: state.definitions, version: STORE_VERSION };
    mkdirSync(dirname(this.storePath), { recursive: true });
    writeFileSync(this.storePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }
}

export function defaultWorkflowStorePath(): string {
  return join(homedir(), ".nexus", "workflows.json");
}

function parseState(source: string, storePath: string): WorkflowStoreState {
  const payload = parseJson(source, storePath);
  if (!Array.isArray(payload.definitions)) {
    throw new Error(`Workflow store missing definitions array: ${storePath}`);
  }

  return { definitions: payload.definitions.map((item, index) => readDefinition(item, index)) };
}

function parseJson(source: string, storePath: string): JsonRecord {
  try {
    const parsed = JSON.parse(source) as unknown;
    if (isRecord(parsed)) return parsed;
  } catch (error) {
    throw new Error(`Workflow store is not valid JSON: ${storePath}`, { cause: error });
  }

  throw new Error(`Workflow store root must be an object: ${storePath}`);
}

function readDefinition(value: unknown, index: number): WorkflowDefinition {
  const record = requireRecord(value, `Workflow definition ${index + 1} must be an object`);
  const steps = record.steps;
  if (!Array.isArray(steps)) throw new Error(`Workflow definition ${index + 1} steps must be an array`);

  return {
    createdAt: readNumber(record.createdAt, "createdAt", index),
    description: readOptionalString(record.description, "description", index),
    id: readString(record.id, "id", index),
    name: readString(record.name, "name", index),
    source: readSource(record.source, index),
    steps: steps.map((step, stepIndex) => readStep(step, index, stepIndex)),
    updatedAt: readNumber(record.updatedAt, "updatedAt", index)
  };
}

function readStep(value: unknown, workflowIndex: number, stepIndex: number): WorkflowStep {
  const record = requireRecord(value, stepError(workflowIndex, stepIndex, "must be an object"));
  const type = readString(record.type, "type", workflowIndex);
  if (!["command", "git", "rag", "subagent", "todo"].includes(type)) {
    throw new Error(stepError(workflowIndex, stepIndex, "has invalid type"));
  }

  return record as unknown as WorkflowStep;
}

function readSource(value: unknown, index: number): "builtin" | "user" {
  if (value === "builtin" || value === "user") return value;
  throw fieldError("source", index);
}

function readString(value: unknown, field: string, index: number): string {
  if (typeof value === "string") return value;
  throw fieldError(field, index);
}

function readOptionalString(value: unknown, field: string, index: number): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string") return value;
  throw fieldError(field, index);
}

function readNumber(value: unknown, field: string, index: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw fieldError(field, index);
}

function requireRecord(value: unknown, message: string): JsonRecord {
  if (isRecord(value)) return value;
  throw new Error(message);
}

function fieldError(field: string, index: number): Error {
  return new Error(`Workflow definition ${index + 1} field ${field} is invalid`);
}

function stepError(workflowIndex: number, stepIndex: number, message: string): string {
  return `Workflow definition ${workflowIndex + 1} step ${stepIndex + 1} ${message}`;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
