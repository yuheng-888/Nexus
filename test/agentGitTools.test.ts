import { describe, expect, it } from "vitest";
import { NativeAgentInteractiveToolRunner } from "../src/main/agentInteractiveTools.js";
import type { AgentInteractiveToolContext } from "../src/main/agentInteractiveTools.js";
import type { AgentToolCall } from "../src/main/agentToolProtocol.js";

describe("NativeAgentInteractiveToolRunner Git tools", () => {
  it("exposes repository state, history, remotes, stash, and tag queries as read-only tools", async () => {
    const runner = new NativeAgentInteractiveToolRunner();
    const context = fakeContext();
    const cases = [
      ["git.status", {}, "## main"],
      ["git.summary", {}, "repository: true"],
      ["git.branches", {}, "current: main"],
      ["git.list_branches", {}, "* main"],
      ["git.diff", { path: "src/app.ts", staged: true }, "staged=true"],
      ["git.remotes", {}, "origin git@example.test:nexus.git"],
      ["git.log", { limit: 3 }, "abc1234 Add Nexus"],
      ["git.show", { ref: "HEAD" }, "commit abc1234"],
      ["git.stash_list", {}, "stash@{0}"],
      ["git.tag_list", {}, "v1.0.0"]
    ] as const;

    for (const [name, args, expected] of cases) {
      const result = await runner.runToolCall(toolCall(name, args), context);
      expect(runner.getToolDefinition(name)).toMatchObject({ permission: "read" });
      expect(result.output).toContain(expected);
    }
  });

  it("exposes Git mutations as approval-gated write tools with command previews", async () => {
    const git = new FakeGit();
    const runner = new NativeAgentInteractiveToolRunner();
    const context = fakeContext(git);
    const cases = [
      ["git.init", { branch: "main" }, "git init -b main"],
      ["git.stage", { path: "src/app.ts" }, "git add -- src/app.ts"],
      ["git.unstage", { path: "src/app.ts" }, "git restore --staged -- src/app.ts"],
      ["git.stage_all", {}, "git add -A"],
      ["git.unstage_all", {}, "git restore --staged ."],
      ["git.commit", { message: "ship" }, "git commit -m \"ship\""],
      ["git.create_branch", { name: "feature/nexus" }, "git branch feature/nexus"],
      ["git.checkout_branch", { branch: "feature/nexus" }, "git checkout feature/nexus"],
      ["git.delete_branch", { name: "feature/nexus" }, "git branch -d feature/nexus"],
      ["git.add_remote", { name: "origin", url: "git@example.test:nexus.git" }, "git remote add origin"],
      ["git.remove_remote", { name: "origin" }, "git remote remove origin"],
      ["git.fetch", { remote: "origin", prune: true }, "git fetch --prune origin"],
      ["git.pull", { branch: "main", remote: "origin", rebase: true }, "git pull --rebase origin main"],
      ["git.push", { branch: "main", remote: "origin", setUpstream: true }, "git push -u origin main"],
      ["git.merge", { branch: "feature/nexus" }, "git merge feature/nexus"],
      ["git.rebase", { branch: "main" }, "git rebase main"],
      ["git.abort_merge", {}, "git merge --abort"],
      ["git.abort_rebase", {}, "git rebase --abort"],
      ["git.stash_push", { includeUntracked: true, message: "save" }, "git stash push -u -m \"save\""],
      ["git.stash_apply", { ref: "stash@{0}" }, "git stash apply stash@{0}"],
      ["git.stash_pop", { ref: "stash@{0}" }, "git stash pop stash@{0}"],
      ["git.stash_drop", { ref: "stash@{0}" }, "git stash drop stash@{0}"],
      ["git.discard_file", { path: "src/app.ts" }, "git restore --worktree -- src/app.ts"],
      ["git.discard_all", {}, "git restore --worktree ."],
      ["git.create_tag", { name: "v1.0.0", message: "release" }, "git tag -a v1.0.0"],
      ["git.delete_tag", { name: "v1.0.0" }, "git tag -d v1.0.0"]
    ] as const;

    for (const [name, args, previewText] of cases) {
      expect(runner.getToolDefinition(name)).toMatchObject({ permission: "write" });
      expect(await runner.previewToolCall(toolCall(name, args), context)).toContain(previewText);
      expect((await runner.runToolCall(toolCall(name, args), context)).output).toContain("exitCode=0");
    }

    expect(git.calls).toContain("push:{\"branch\":\"main\",\"remote\":\"origin\",\"setUpstream\":true}:.");
    expect(git.calls).toContain("createTag:{\"message\":\"release\",\"name\":\"v1.0.0\"}:.");
  });
});

class FakeGit {
  calls: string[] = [];

  abortMerge(cwd = ".") { return this.command("abortMerge", {}, cwd); }
  abortRebase(cwd = ".") { return this.command("abortRebase", {}, cwd); }
  addRemote(request: Record<string, unknown>, cwd = ".") { return this.command("addRemote", request, cwd); }
  checkoutBranch(request: Record<string, unknown>, cwd = ".") { return this.command("checkoutBranch", request, cwd); }
  commit(message: string, cwd = ".") { return this.command("commit", { message }, cwd); }
  createBranch(request: Record<string, unknown>, cwd = ".") { return this.command("createBranch", request, cwd); }
  createTag(request: Record<string, unknown>, cwd = ".") { return this.command("createTag", sorted(request), cwd); }
  deleteBranch(request: Record<string, unknown>, cwd = ".") { return this.command("deleteBranch", request, cwd); }
  deleteTag(name: string, cwd = ".") { return this.command("deleteTag", { name }, cwd); }
  discardAll(cwd = ".") { return this.command("discardAll", {}, cwd); }
  discardFile(path: string, cwd = ".") { return this.command("discardFile", { path }, cwd); }
  fetch(request: Record<string, unknown>, cwd = ".") { return this.command("fetch", request, cwd); }
  init(request: Record<string, unknown>, cwd = ".") { return this.command("init", request, cwd); }
  merge(branch: string, cwd = ".") { return this.command("merge", { branch }, cwd); }
  pull(request: Record<string, unknown>, cwd = ".") { return this.command("pull", request, cwd); }
  push(request: Record<string, unknown>, cwd = ".") { return this.command("push", request, cwd); }
  rebase(branch: string, cwd = ".") { return this.command("rebase", { branch }, cwd); }
  removeRemote(name: string, cwd = ".") { return this.command("removeRemote", { name }, cwd); }
  stage(path: string, cwd = ".") { return this.command("stage", { path }, cwd); }
  stageAll(cwd = ".") { return this.command("stageAll", {}, cwd); }
  stashApply(ref?: string, cwd = ".") { return this.command("stashApply", { ref }, cwd); }
  stashDrop(ref?: string, cwd = ".") { return this.command("stashDrop", { ref }, cwd); }
  stashPop(ref?: string, cwd = ".") { return this.command("stashPop", { ref }, cwd); }
  stashPush(request: Record<string, unknown>, cwd = ".") { return this.command("stashPush", request, cwd); }
  unstage(path: string, cwd = ".") { return this.command("unstage", { path }, cwd); }
  unstageAll(cwd = ".") { return this.command("unstageAll", {}, cwd); }

  branches() {
    return Promise.resolve({ ahead: 1, behind: 0, current: "main", detached: false, upstream: "origin/main" });
  }

  diff(request: Record<string, unknown>) {
    return Promise.resolve({ ...commandResult("diff -- src/app.ts"), path: request.path, staged: request.staged === true });
  }

  listBranches() {
    return Promise.resolve({ branches: [{ current: true, name: "main", upstream: "origin/main" }], current: "main" });
  }

  log() {
    return Promise.resolve({
      entries: [{ authorEmail: "dev@example.test", authorName: "Dev", date: "2026-05-27T00:00:00Z", hash: "abc123456", shortHash: "abc1234", subject: "Add Nexus" }],
      raw: commandResult("abc1234 Add Nexus")
    });
  }

  remotes() {
    return Promise.resolve([{ name: "origin", url: "git@example.test:nexus.git" }]);
  }

  show(ref: string) {
    return Promise.resolve(commandResult(`commit abc1234\nref ${ref}`));
  }

  stashList() {
    return Promise.resolve([{ branch: "main", index: 0, message: "save", ref: "stash@{0}" }]);
  }

  status() {
    return Promise.resolve(commandResult("## main\n M src/app.ts\n"));
  }

  summary() {
    return Promise.resolve({ branch: { ahead: 1, behind: 0, current: "main", detached: false }, changes: [], raw: commandResult(""), repository: true, staged: [], unstaged: [], untracked: [] });
  }

  tagList() {
    return Promise.resolve(["v1.0.0"]);
  }

  private command(name: string, request: Record<string, unknown>, cwd: string) {
    this.calls = [...this.calls, `${name}:${JSON.stringify(request)}:${cwd}`];
    return Promise.resolve(commandResult(`${name} ok`));
  }
}

function fakeContext(git = new FakeGit()): AgentInteractiveToolContext {
  return {
    cwd: ".",
    files: {} as AgentInteractiveToolContext["files"],
    git: git as AgentInteractiveToolContext["git"],
    prompt: "",
    search: {} as AgentInteractiveToolContext["search"],
    workspaceRoot: "/workspace"
  };
}

function toolCall(name: string, args: Record<string, unknown>): AgentToolCall {
  return { arguments: args, id: name, name };
}

function commandResult(stdout: string) {
  return { exitCode: 0, stderr: "", stdout };
}

function sorted(request: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(request).sort(([left], [right]) => left.localeCompare(right)));
}
