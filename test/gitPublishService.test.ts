import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GitService } from "../src/main/gitService.js";
import { GitPublishService } from "../src/main/gitPublishService.js";

const execFileAsync = promisify(execFile);

let workspaceRoot = "";

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), "nexus-git-publish-"));
});

afterEach(async () => {
  await rm(workspaceRoot, { force: true, recursive: true });
});

describe("Git publish workflow", () => {
  it("initializes a workspace repository on main", async () => {
    const result = await git().init({ branch: "main" });
    const summary = await git().summary();

    expect(result.exitCode).toBe(0);
    expect(summary.repository).toBe(true);
    expect(summary.branch.current).toBe("main");
  });

  it("blocks publish candidates with local paths and secret files", async () => {
    await writeFile(join(workspaceRoot, ".env"), "TOKEN=secret\n");
    await writeFile(join(workspaceRoot, "README.md"), `local /${"Users"}/demo/project\n`);
    const report = await publisher().publishSafetyScan();

    expect(report.blocked).toBe(true);
    expect(report.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: ".env", type: "file-name" }),
      expect.objectContaining({ path: "README.md", type: "file-content" })
    ]));
  });

  it("creates a GitHub repository, commits safe files, and pushes main", async () => {
    const remoteRoot = await mkdtemp(join(tmpdir(), "nexus-git-remote-"));
    await gitCommand(["init", "--bare"], remoteRoot);
    await writeFile(join(workspaceRoot, "README.md"), "# Demo\n");
    const result = await publisher(fakeGitHubFetch(remoteRoot)).publishToGitHub({
      authorEmail: "nexus@example.test",
      authorName: "Nexus Test",
      branch: "main",
      commitMessage: "Initial publish",
      name: "demo",
      remoteName: "origin",
      token: "test-token",
      visibility: "public"
    });

    expect(result.repository.htmlUrl).toBe("https://github.com/nexus/demo");
    expect(result.init?.exitCode).toBe(0);
    expect(result.commit?.exitCode).toBe(0);
    expect(result.push.exitCode).toBe(0);
    await expect(readFile(join(workspaceRoot, ".gitignore"), "utf8")).resolves.toContain("node_modules/");
    await expect(gitCommand(["ls-remote", remoteRoot, "refs/heads/main"], workspaceRoot)).resolves.toContain("refs/heads/main");
  });
});

function git(): GitService {
  return new GitService({ workspaceRoot });
}

function publisher(fetchImpl: typeof fetch = fetch): GitPublishService {
  return new GitPublishService({ fetch: fetchImpl, git: git(), workspaceRoot });
}

function fakeGitHubFetch(remoteRoot: string): typeof fetch {
  return async (_input, init) => {
    expect(init?.headers).toMatchObject({ Authorization: "Bearer test-token" });
    return new Response(JSON.stringify({
      clone_url: remoteRoot,
      full_name: "nexus/demo",
      html_url: "https://github.com/nexus/demo",
      name: "demo",
      private: false,
      ssh_url: "git@github.com:nexus/demo.git"
    }), { headers: { "content-type": "application/json" }, status: 201 });
  };
}

async function gitCommand(args: readonly string[], cwd: string): Promise<string> {
  const result = await execFileAsync("git", [...args], { cwd });
  return result.stdout;
}
