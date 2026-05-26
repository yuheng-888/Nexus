import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GitService } from "../src/main/gitService.js";

const execFileAsync = promisify(execFile);

let workspaceRoot = "";

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), "nexus-git-"));
  await initRepository(workspaceRoot);
});

afterEach(async () => {
  await rm(workspaceRoot, { force: true, recursive: true });
});

describe("GitService", () => {
  it("returns structured branch and change groups", async () => {
    await writeFile(join(workspaceRoot, "tracked.txt"), "changed\n");
    await writeFile(join(workspaceRoot, "staged.txt"), "staged\n");
    await writeFile(join(workspaceRoot, "untracked.txt"), "new\n");
    await git(["add", "staged.txt"]);

    const summary = await service().summary();

    expect(summary.repository).toBe(true);
    expect(summary.branch.current).toBe("main");
    expect(summary.staged.map((change) => change.path)).toEqual(["staged.txt"]);
    expect(summary.unstaged.map((change) => change.path)).toEqual(["tracked.txt"]);
    expect(summary.untracked.map((change) => change.path)).toEqual(["untracked.txt"]);
  });

  it("returns worktree and staged diffs for a file", async () => {
    await writeFile(join(workspaceRoot, "tracked.txt"), "changed\n");
    const worktree = await service().diff({ path: "tracked.txt" });
    await service().stage("tracked.txt");
    const staged = await service().diff({ path: "tracked.txt", staged: true });

    expect(worktree.exitCode).toBe(0);
    expect(worktree.stdout).toContain("-initial");
    expect(worktree.stdout).toContain("+changed");
    expect(staged.staged).toBe(true);
    expect(staged.stdout).toContain("+changed");
  });

  it("stages and unstages individual files and all files", async () => {
    await writeFile(join(workspaceRoot, "tracked.txt"), "changed\n");
    await service().stage("tracked.txt");
    await expect(service().summary()).resolves.toMatchObject({
      staged: [expect.objectContaining({ path: "tracked.txt" })],
      unstaged: []
    });

    await service().unstage("tracked.txt");
    await expect(service().summary()).resolves.toMatchObject({
      staged: [],
      unstaged: [expect.objectContaining({ path: "tracked.txt" })]
    });

    await service().stageAll();
    await expect(service().summary()).resolves.toMatchObject({
      staged: [expect.objectContaining({ path: "tracked.txt" })],
      unstaged: []
    });

    await service().unstageAll();
    await expect(service().summary()).resolves.toMatchObject({
      staged: [],
      unstaged: [expect.objectContaining({ path: "tracked.txt" })]
    });
  });

  it("commits staged changes and validates empty messages", async () => {
    await writeFile(join(workspaceRoot, "tracked.txt"), "changed\n");
    await service().stage("tracked.txt");

    await expect(service().commit("")).rejects.toThrow(/Commit message is required/);
    const result = await service().commit("update tracked file");
    const summary = await service().summary();

    expect(result.exitCode).toBe(0);
    expect(summary.changes).toEqual([]);
  });

  it("returns branch summary and explicit non-repository state", async () => {
    const branch = await service().branches();
    const otherRoot = await mkdtemp(join(tmpdir(), "nexus-no-git-"));

    try {
      const nonRepo = await new GitService({ workspaceRoot: otherRoot }).summary();

      expect(branch.current).toBe("main");
      expect(nonRepo.repository).toBe(false);
      expect(nonRepo.raw.stderr).toMatch(/not a git repository/i);
    } finally {
      await rm(otherRoot, { force: true, recursive: true });
    }
  });

  it("manages branches and returns commit log entries", async () => {
    await service().createBranch({ name: "feature/git-api" });
    await service().checkoutBranch({ branch: "feature/git-api" });
    await writeFile(join(workspaceRoot, "branch.txt"), "branch\n");
    await service().stage("branch.txt");
    await service().commit("branch commit");

    const branches = await service().listBranches();
    const log = await service().log({ limit: 2 });
    await service().checkoutBranch({ branch: "main" });
    const deleted = await service().deleteBranch({ force: true, name: "feature/git-api" });

    expect(branches.branches).toEqual(expect.arrayContaining([
      expect.objectContaining({ current: true, name: "feature/git-api" }),
      expect.objectContaining({ name: "main" })
    ]));
    expect(log.entries[0]).toMatchObject({ subject: "branch commit" });
    expect(deleted.exitCode).toBe(0);
  });

  it("manages remotes and exposes fetch pull push wrappers", async () => {
    const remoteRoot = await mkdtemp(join(tmpdir(), "nexus-git-remote-"));

    try {
      await git(["init", "--bare"], remoteRoot);
      await service().addRemote({ name: "origin", url: remoteRoot });
      const remotes = await service().remotes();
      const push = await service().push({ branch: "main", remote: "origin", setUpstream: true });
      const fetch = await service().fetch({ remote: "origin" });
      const pull = await service().pull({ branch: "main", remote: "origin" });
      await service().removeRemote("origin");

      expect(remotes).toEqual([{ name: "origin", url: remoteRoot }]);
      expect(push.exitCode).toBe(0);
      expect(fetch.exitCode).toBe(0);
      expect(pull.exitCode).toBe(0);
      await expect(service().remotes()).resolves.toEqual([]);
    } finally {
      await rm(remoteRoot, { force: true, recursive: true });
    }
  });

  it("stashes, applies, drops, and discards changes", async () => {
    await writeFile(join(workspaceRoot, "tracked.txt"), "stash me\n");
    const stash = await service().stashPush({ includeUntracked: true, message: "save tracked" });
    const stashes = await service().stashList();
    const apply = await service().stashApply("stash@{0}");
    const contentAfterApply = await readFile(join(workspaceRoot, "tracked.txt"), "utf8");
    await service().discardFile("tracked.txt");
    const contentAfterDiscard = await readFile(join(workspaceRoot, "tracked.txt"), "utf8");
    const drop = await service().stashDrop("stash@{0}");

    expect(stash.exitCode).toBe(0);
    expect(stashes[0]).toMatchObject({ message: expect.stringContaining("save tracked") });
    expect(apply.exitCode).toBe(0);
    expect(contentAfterApply).toBe("stash me\n");
    expect(contentAfterDiscard).toBe("initial\n");
    expect(drop.exitCode).toBe(0);
  });
});

function service(): GitService {
  return new GitService({ workspaceRoot });
}

async function initRepository(root: string): Promise<void> {
  await initMainBranch(root);
  await git(["config", "user.email", "nexus@example.test"], root);
  await git(["config", "user.name", "Nexus Test"], root);
  await writeFile(join(root, "tracked.txt"), "initial\n");
  await git(["add", "tracked.txt"], root);
  await git(["commit", "-m", "initial commit"], root);
}

async function initMainBranch(root: string): Promise<void> {
  try {
    await git(["init", "-b", "main"], root);
  } catch {
    await git(["init"], root);
    await git(["checkout", "-b", "main"], root);
  }
}

async function git(args: readonly string[], cwd = workspaceRoot): Promise<void> {
  await execFileAsync("git", [...args], { cwd });
}
