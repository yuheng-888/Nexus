import { describe, expect, it } from "vitest";
import {
  formatStashMeta,
  latestTags,
  normalizeGitRefInput
} from "../frontend/src/components/sidebar/gitAdvancedModel.js";
import type { GitStashEntry } from "../frontend/src/types/git.js";

describe("git advanced model", () => {
  it("formats stash metadata with branch evidence when present", () => {
    expect(formatStashMeta(stash({ branch: "feature/nexus" }))).toBe("stash@{0} · feature/nexus");
    expect(formatStashMeta(stash({ branch: undefined }))).toBe("stash@{0}");
  });

  it("shows the most recent tags without mutating the original list", () => {
    const tags = ["v1.0.0", "v1.1.0", "v1.2.0", "v2.0.0"];

    expect(latestTags(tags, 2)).toEqual(["v2.0.0", "v1.2.0"]);
    expect(tags).toEqual(["v1.0.0", "v1.1.0", "v1.2.0", "v2.0.0"]);
  });

  it("normalizes git ref inputs before invoking commands", () => {
    expect(normalizeGitRefInput("  feature/nexus  ")).toBe("feature/nexus");
  });
});

function stash(overrides: Partial<GitStashEntry>): GitStashEntry {
  return {
    branch: overrides.branch,
    index: overrides.index ?? 0,
    message: overrides.message ?? "WIP on feature/nexus",
    ref: overrides.ref ?? "stash@{0}"
  };
}
