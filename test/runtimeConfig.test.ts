import { describe, expect, it } from "vitest";
import { createRuntimeConfig } from "../src/main/runtimeConfig.js";

describe("createRuntimeConfig", () => {
  it("uses explicit workspace root from the environment", () => {
    const config = createRuntimeConfig({
      appRoot: "/Applications/Nexus.app/Contents/Resources/app",
      cwd: "/",
      env: { NEXUS_WORKSPACE_ROOT: "/workspace/project" },
      homeDir: "/home/nexus"
    });

    expect(config.root).toBe("/workspace/project");
  });

  it("uses the persisted workspace when no explicit environment root is set", () => {
    const config = createRuntimeConfig({
      appRoot: "/Applications/Nexus.app/Contents/Resources/app",
      cwd: "/workspace",
      env: {},
      homeDir: "/home/nexus",
      persistedWorkspaceRoot: "/workspace/NexusProject"
    });

    expect(config.root).toBe("/workspace/NexusProject");
  });

  it("starts without a workspace instead of exposing the launch cwd", () => {
    const config = createRuntimeConfig({
      appRoot: "/Applications/Nexus.app/Contents/Resources/app",
      cwd: "/workspace",
      env: {},
      homeDir: "/home/nexus",
      persistedWorkspaceRoot: null
    });

    expect(config.root).toBeNull();
  });

  it("starts without a workspace instead of exposing the filesystem root", () => {
    const config = createRuntimeConfig({
      appRoot: "/Applications/Nexus.app/Contents/Resources/app",
      cwd: "/",
      env: {},
      homeDir: "/home/nexus",
      persistedWorkspaceRoot: null
    });

    expect(config.root).toBeNull();
  });
});
