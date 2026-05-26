import type { GitStashEntry } from "../../types/git";

export function formatStashMeta(stash: GitStashEntry): string {
  return [stash.ref, stash.branch ?? ""].filter(Boolean).join(" · ");
}

export function latestTags(tags: readonly string[], limit: number): readonly string[] {
  return [...tags].reverse().slice(0, limit);
}

export function normalizeGitRefInput(value: string): string {
  return value.trim();
}
