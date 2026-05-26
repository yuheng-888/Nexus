import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Skill } from "../contracts.js";

const STORE_FILE = "installed-skills.json";

export class SkillInstallStore {
  readonly storePath: string;

  constructor(skillsDir: string) {
    this.storePath = join(skillsDir, STORE_FILE);
  }

  async list(): Promise<readonly Skill[]> {
    const content = await readOptionalFile(this.storePath);
    if (content === null) return [];
    return parseStore(content, this.storePath);
  }

  async upsert(skill: Skill): Promise<void> {
    if (skill.installedPath === undefined || skill.installedPath === "") {
      throw new Error(`Installed skill ${skill.id} is missing installedPath`);
    }

    const skills = await this.list();
    const next = [...skills.filter((item) => item.id !== skill.id), { ...skill, installed: true }];
    await this.save(next);
  }

  async remove(id: string): Promise<Skill | null> {
    const skills = await this.list();
    const skill = skills.find((item) => item.id === id);
    if (skill === undefined) return null;

    await this.save(skills.filter((item) => item.id !== id));
    return skill;
  }

  private async save(skills: readonly Skill[]): Promise<void> {
    await mkdir(dirname(this.storePath), { recursive: true });
    await writeFile(this.storePath, JSON.stringify({ skills }, null, 2));
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

function parseStore(content: string, storePath: string): readonly Skill[] {
  try {
    return parsePayload(JSON.parse(content), storePath);
  } catch (error) {
    throw new Error(`Installed skill store is not valid: ${storePath}`, { cause: error });
  }
}

function parsePayload(payload: unknown, storePath: string): readonly Skill[] {
  if (!isRecord(payload)) throw new Error(`Installed skill store root must be an object: ${storePath}`);
  if (!Array.isArray(payload.skills)) throw new Error(`Installed skill store missing skills array: ${storePath}`);
  return payload.skills.map(readSkill);
}

function readSkill(value: unknown): Skill {
  if (!isRecord(value)) throw new Error("Installed skill entry must be an object");

  return {
    author: readString(value, "author"),
    category: readString(value, "category"),
    color: readString(value, "color"),
    description: readString(value, "description"),
    enabled: readBoolean(value, "enabled"),
    githubUrl: readOptionalString(value, "githubUrl"),
    icon: readString(value, "icon"),
    id: readString(value, "id"),
    installed: readBoolean(value, "installed"),
    installedPath: readString(value, "installedPath"),
    name: readString(value, "name"),
    rating: readNumber(value, "rating"),
    skillUrl: readOptionalString(value, "skillUrl"),
    source: readSource(value.source),
    updatedAt: readOptionalString(value, "updatedAt"),
    version: readString(value, "version")
  };
}

function readString(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value === "string") return value;
  throw new Error(`Installed skill field ${field} is invalid`);
}

function readOptionalString(record: Record<string, unknown>, field: string): string | undefined {
  const value = record[field];
  if (value === undefined) return undefined;
  if (typeof value === "string") return value;
  throw new Error(`Installed skill field ${field} is invalid`);
}

function readNumber(record: Record<string, unknown>, field: string): number {
  const value = record[field];
  if (typeof value === "number") return value;
  throw new Error(`Installed skill field ${field} is invalid`);
}

function readBoolean(record: Record<string, unknown>, field: string): boolean {
  const value = record[field];
  if (typeof value === "boolean") return value;
  throw new Error(`Installed skill field ${field} is invalid`);
}

function readSource(value: unknown): "builtin" | "skillsmp" | undefined {
  if (value === undefined || value === "builtin" || value === "skillsmp") return value;
  throw new Error("Installed skill field source is invalid");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
