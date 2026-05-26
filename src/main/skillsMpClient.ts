import type { Skill } from "../contracts.js";

const DEFAULT_LIMIT = 24;
const SEARCH_ENDPOINT = "https://skillsmp.com/api/v1/skills/search";

export interface SkillsMpSearchRequest {
  readonly query?: string;
}

export type FetchLike = (url: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface SkillsMpSkill {
  readonly author?: unknown;
  readonly description?: unknown;
  readonly githubUrl?: unknown;
  readonly id?: unknown;
  readonly name?: unknown;
  readonly skillUrl?: unknown;
  readonly stars?: unknown;
  readonly updatedAt?: unknown;
}

interface SkillsMpResponse {
  readonly data?: {
    readonly skills?: SkillsMpSkill[];
  };
  readonly success?: boolean;
}

export async function searchSkillsMpSkills(
  request: SkillsMpSearchRequest,
  fetcher: FetchLike
): Promise<Skill[]> {
  const url = createSearchUrl(request.query);
  const response = await fetcher(url);

  if (!response.ok) {
    throw new Error(`SkillsMP search failed: HTTP ${response.status}`);
  }

  return parseSearchResponse(await response.json());
}

function createSearchUrl(query: string | undefined): string {
  const url = new URL(SEARCH_ENDPOINT);
  url.searchParams.set("q", normalizeQuery(query));
  url.searchParams.set("limit", String(DEFAULT_LIMIT));
  url.searchParams.set("sortBy", "recent");

  return url.toString();
}

function normalizeQuery(query: string | undefined): string {
  const normalized = query?.trim();
  return normalized === undefined || normalized === "" ? "codex" : normalized;
}

function parseSearchResponse(payload: unknown): Skill[] {
  const response = payload as SkillsMpResponse;
  const remoteSkills = response.data?.skills;

  if (!Array.isArray(remoteSkills)) {
    throw new Error("SkillsMP search returned an invalid skill list");
  }

  return remoteSkills.map(toSkill);
}

function toSkill(skill: SkillsMpSkill): Skill {
  return {
    author: readString(skill.author, "unknown"),
    category: "SkillsMP",
    color: "#3b82f6",
    description: readString(skill.description, ""),
    enabled: false,
    githubUrl: readString(skill.githubUrl, ""),
    icon: "Sparkles",
    id: readString(skill.id, ""),
    installed: false,
    name: readString(skill.name, "Unnamed Skill"),
    rating: readNumber(skill.stars),
    skillUrl: readString(skill.skillUrl, ""),
    source: "skillsmp",
    updatedAt: readString(skill.updatedAt, ""),
    version: "remote"
  };
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value !== "" ? value : fallback;
}

function readNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value) || 0;
}
