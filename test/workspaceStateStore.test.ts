import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WorkspaceStateStore } from "../src/main/workspaceStateStore.js";

let root = "";

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "nexus-workspace-state-"));
});

afterEach(async () => {
  await rm(root, { force: true, recursive: true });
});

describe("WorkspaceStateStore", () => {
  it("starts empty when no workspace state exists", () => {
    const store = new WorkspaceStateStore({ storePath: join(root, "state.json") });

    expect(store.load()).toEqual({
      lastWorkspaceRoot: null,
      recentWorkspaceRoots: []
    });
  });

  it("persists the last opened workspace and recent workspaces", async () => {
    const storePath = join(root, "state.json");
    const store = new WorkspaceStateStore({ storePath });

    store.recordOpened("/workspace/project-a");
    store.recordOpened("/workspace/project-b");
    store.recordOpened("/workspace/project-a");

    expect(new WorkspaceStateStore({ storePath }).load()).toEqual({
      lastWorkspaceRoot: "/workspace/project-a",
      recentWorkspaceRoots: [
        "/workspace/project-a",
        "/workspace/project-b"
      ]
    });
    await expect(readFile(storePath, "utf8")).resolves.toContain("\"version\": 1");
  });
});
