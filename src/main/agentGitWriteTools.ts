import type { GitBranchCheckoutRequest, GitFetchRequest, GitPullRequest, GitPushRequest, GitStashPushRequest, GitTagCreateRequest } from "../gitContracts.js";
import type { AgentInteractiveToolContext, AgentInteractiveToolSpec } from "./agentInteractiveTools.js";
import { formatGitCommandResult } from "./agentGitFormatters.js";
import { readOptionalBoolean, readOptionalString, readRequiredString } from "./agentToolArgs.js";

const DEFAULT_STASH_REF = "stash@{0}";

export function createGitWriteToolSpecs(): readonly AgentInteractiveToolSpec[] {
  return [
    ...createCoreWriteSpecs(),
    ...createBranchWriteSpecs(),
    ...createRemoteWriteSpecs(),
    ...createHistoryWriteSpecs(),
    ...createStashWriteSpecs()
  ];
}

function createCoreWriteSpecs(): readonly AgentInteractiveToolSpec[] {
  return [
    writeTool("git.init", "Initialize a Git repository.", "branch?: string, cwd?: string", gitInit, previewGitInit),
    writeTool("git.stage", "Stage one workspace file with git add.", "path: string, cwd?: string", gitStage, previewGitStage),
    writeTool("git.unstage", "Unstage one workspace file.", "path: string, cwd?: string", gitUnstage, previewGitUnstage),
    writeTool("git.stage_all", "Stage all workspace changes.", "cwd?: string", gitStageAll, preview("git add -A")),
    writeTool("git.unstage_all", "Unstage all workspace changes.", "cwd?: string", gitUnstageAll, preview("git restore --staged .")),
    writeTool("git.commit", "Create a git commit from staged changes.", "message: string, cwd?: string", gitCommit, previewGitCommit),
    writeTool("git.discard_file", "Discard worktree changes for one file.", "path: string, cwd?: string", gitDiscardFile, previewGitDiscardFile),
    writeTool("git.discard_all", "Discard all worktree changes.", "cwd?: string", gitDiscardAll, preview("git restore --worktree ."))
  ];
}

function createBranchWriteSpecs(): readonly AgentInteractiveToolSpec[] {
  return [
    writeTool("git.create_branch", "Create a Git branch.", "name: string, startPoint?: string, cwd?: string", gitCreateBranch, previewGitCreateBranch),
    writeTool("git.checkout_branch", "Checkout a Git branch.", "branch: string, create?: boolean, startPoint?: string, cwd?: string", gitCheckoutBranch, previewGitCheckoutBranch),
    writeTool("git.delete_branch", "Delete a Git branch.", "name: string, force?: boolean, cwd?: string", gitDeleteBranch, previewGitDeleteBranch)
  ];
}

function createRemoteWriteSpecs(): readonly AgentInteractiveToolSpec[] {
  return [
    writeTool("git.add_remote", "Add a Git remote.", "name: string, url: string, cwd?: string", gitAddRemote, previewGitAddRemote),
    writeTool("git.remove_remote", "Remove a Git remote.", "name: string, cwd?: string", gitRemoveRemote, previewGitRemoveRemote),
    writeTool("git.fetch", "Fetch from a Git remote.", "remote?: string, prune?: boolean, cwd?: string", gitFetch, previewGitFetch),
    writeTool("git.pull", "Pull from a Git remote.", "remote?: string, branch?: string, rebase?: boolean, cwd?: string", gitPull, previewGitPull),
    writeTool("git.push", "Push to a Git remote.", "remote?: string, branch?: string, setUpstream?: boolean, cwd?: string", gitPush, previewGitPush)
  ];
}

function createHistoryWriteSpecs(): readonly AgentInteractiveToolSpec[] {
  return [
    writeTool("git.merge", "Merge a Git branch.", "branch: string, cwd?: string", gitMerge, previewGitMerge),
    writeTool("git.rebase", "Rebase onto a Git branch.", "branch: string, cwd?: string", gitRebase, previewGitRebase),
    writeTool("git.abort_merge", "Abort an in-progress Git merge.", "cwd?: string", gitAbortMerge, preview("git merge --abort")),
    writeTool("git.abort_rebase", "Abort an in-progress Git rebase.", "cwd?: string", gitAbortRebase, preview("git rebase --abort")),
    writeTool("git.create_tag", "Create a Git tag.", "name: string, message?: string, cwd?: string", gitCreateTag, previewGitCreateTag),
    writeTool("git.delete_tag", "Delete a Git tag.", "name: string, cwd?: string", gitDeleteTag, previewGitDeleteTag)
  ];
}

function createStashWriteSpecs(): readonly AgentInteractiveToolSpec[] {
  return [
    writeTool("git.stash_push", "Push Git changes to stash.", "message?: string, includeUntracked?: boolean, cwd?: string", gitStashPush, previewGitStashPush),
    writeTool("git.stash_apply", "Apply a Git stash.", "ref?: string, cwd?: string", gitStashApply, previewGitStashCommand("apply")),
    writeTool("git.stash_pop", "Pop a Git stash.", "ref?: string, cwd?: string", gitStashPop, previewGitStashCommand("pop")),
    writeTool("git.stash_drop", "Drop a Git stash.", "ref?: string, cwd?: string", gitStashDrop, previewGitStashCommand("drop"))
  ];
}

function writeTool(name: string, description: string, parameters: string, run: AgentInteractiveToolSpec["run"], preview: AgentInteractiveToolSpec["preview"]): AgentInteractiveToolSpec {
  return { description, name, parameters, permission: "write", preview, run };
}

async function gitInit(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.init({ branch: readOptionalString(args, "branch") }, cwd(args, context)));
}

async function gitStage(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.stage(readRequiredString(args, "path"), cwd(args, context)));
}

async function gitUnstage(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.unstage(readRequiredString(args, "path"), cwd(args, context)));
}

async function gitStageAll(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.stageAll(cwd(args, context)));
}

async function gitUnstageAll(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.unstageAll(cwd(args, context)));
}

async function gitCommit(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.commit(readRequiredString(args, "message"), cwd(args, context)));
}

async function gitCreateBranch(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.createBranch({ name: readRequiredString(args, "name"), startPoint: readOptionalString(args, "startPoint") }, cwd(args, context)));
}

async function gitCheckoutBranch(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.checkoutBranch(readCheckoutRequest(args), cwd(args, context)));
}

async function gitDeleteBranch(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.deleteBranch({ force: readOptionalBoolean(args, "force"), name: readRequiredString(args, "name") }, cwd(args, context)));
}

async function gitAddRemote(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.addRemote({ name: readRequiredString(args, "name"), url: readRequiredString(args, "url") }, cwd(args, context)));
}

async function gitRemoveRemote(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.removeRemote(readRequiredString(args, "name"), cwd(args, context)));
}

async function gitFetch(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.fetch(readFetchRequest(args), cwd(args, context)));
}

async function gitPull(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.pull(readPullRequest(args), cwd(args, context)));
}

async function gitPush(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.push(readPushRequest(args), cwd(args, context)));
}

async function gitMerge(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.merge(readRequiredString(args, "branch"), cwd(args, context)));
}

async function gitRebase(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.rebase(readRequiredString(args, "branch"), cwd(args, context)));
}

async function gitAbortMerge(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.abortMerge(cwd(args, context)));
}

async function gitAbortRebase(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.abortRebase(cwd(args, context)));
}

async function gitStashPush(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.stashPush(readStashPushRequest(args), cwd(args, context)));
}

async function gitStashApply(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.stashApply(readOptionalString(args, "ref") ?? DEFAULT_STASH_REF, cwd(args, context)));
}

async function gitStashPop(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.stashPop(readOptionalString(args, "ref") ?? DEFAULT_STASH_REF, cwd(args, context)));
}

async function gitStashDrop(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.stashDrop(readOptionalString(args, "ref") ?? DEFAULT_STASH_REF, cwd(args, context)));
}

async function gitDiscardFile(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.discardFile(readRequiredString(args, "path"), cwd(args, context)));
}

async function gitDiscardAll(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.discardAll(cwd(args, context)));
}

async function gitCreateTag(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.createTag(readTagCreateRequest(args), cwd(args, context)));
}

async function gitDeleteTag(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.deleteTag(readRequiredString(args, "name"), cwd(args, context)));
}

function readCheckoutRequest(args: Record<string, unknown>): GitBranchCheckoutRequest {
  return { branch: readRequiredString(args, "branch"), create: readOptionalBoolean(args, "create"), startPoint: readOptionalString(args, "startPoint") };
}

function readFetchRequest(args: Record<string, unknown>): GitFetchRequest {
  return { prune: readOptionalBoolean(args, "prune"), remote: readOptionalString(args, "remote") };
}

function readPullRequest(args: Record<string, unknown>): GitPullRequest {
  return { branch: readOptionalString(args, "branch"), rebase: readOptionalBoolean(args, "rebase"), remote: readOptionalString(args, "remote") };
}

function readPushRequest(args: Record<string, unknown>): GitPushRequest {
  return { branch: readOptionalString(args, "branch"), remote: readOptionalString(args, "remote"), setUpstream: readOptionalBoolean(args, "setUpstream") };
}

function readStashPushRequest(args: Record<string, unknown>): GitStashPushRequest {
  return { includeUntracked: readOptionalBoolean(args, "includeUntracked"), message: readOptionalString(args, "message") };
}

function readTagCreateRequest(args: Record<string, unknown>): GitTagCreateRequest {
  return { message: readOptionalString(args, "message"), name: readRequiredString(args, "name") };
}

function cwd(args: Record<string, unknown>, context: AgentInteractiveToolContext): string {
  return readOptionalString(args, "cwd") ?? context.cwd;
}

function preview(command: string): AgentInteractiveToolSpec["preview"] {
  return async () => command;
}

async function previewGitInit(args: Record<string, unknown>): Promise<string> {
  return `git init -b ${readOptionalString(args, "branch") ?? "main"}`;
}

async function previewGitStage(args: Record<string, unknown>): Promise<string> {
  return `git add -- ${readRequiredString(args, "path")}`;
}

async function previewGitUnstage(args: Record<string, unknown>): Promise<string> {
  return `git restore --staged -- ${readRequiredString(args, "path")}`;
}

async function previewGitCommit(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  const status = await context.git.status(cwd(args, context));
  return [`git commit -m ${JSON.stringify(readRequiredString(args, "message"))}`, status.stdout.trimEnd()].filter(Boolean).join("\n");
}

async function previewGitDiscardFile(args: Record<string, unknown>): Promise<string> {
  return `git restore --worktree -- ${readRequiredString(args, "path")}`;
}

async function previewGitCreateBranch(args: Record<string, unknown>): Promise<string> {
  return joinCommand(["git", "branch", readRequiredString(args, "name"), readOptionalString(args, "startPoint")]);
}

async function previewGitCheckoutBranch(args: Record<string, unknown>): Promise<string> {
  return joinCommand(["git", "checkout", readOptionalBoolean(args, "create") === true ? "-b" : "", readRequiredString(args, "branch"), readOptionalString(args, "startPoint")]);
}

async function previewGitDeleteBranch(args: Record<string, unknown>): Promise<string> {
  return joinCommand(["git", "branch", readOptionalBoolean(args, "force") === true ? "-D" : "-d", readRequiredString(args, "name")]);
}

async function previewGitAddRemote(args: Record<string, unknown>): Promise<string> {
  return `git remote add ${readRequiredString(args, "name")} ${readRequiredString(args, "url")}`;
}

async function previewGitRemoveRemote(args: Record<string, unknown>): Promise<string> {
  return `git remote remove ${readRequiredString(args, "name")}`;
}

async function previewGitFetch(args: Record<string, unknown>): Promise<string> {
  return joinCommand(["git", "fetch", readOptionalBoolean(args, "prune") === true ? "--prune" : "", readOptionalString(args, "remote")]);
}

async function previewGitPull(args: Record<string, unknown>): Promise<string> {
  return joinCommand(["git", "pull", readOptionalBoolean(args, "rebase") === true ? "--rebase" : "", readOptionalString(args, "remote"), readOptionalString(args, "branch")]);
}

async function previewGitPush(args: Record<string, unknown>): Promise<string> {
  return joinCommand(["git", "push", readOptionalBoolean(args, "setUpstream") === true ? "-u" : "", readOptionalString(args, "remote"), readOptionalString(args, "branch")]);
}

async function previewGitMerge(args: Record<string, unknown>): Promise<string> {
  return `git merge ${readRequiredString(args, "branch")}`;
}

async function previewGitRebase(args: Record<string, unknown>): Promise<string> {
  return `git rebase ${readRequiredString(args, "branch")}`;
}

function previewGitStashCommand(command: string): AgentInteractiveToolSpec["preview"] {
  return async (args) => `git stash ${command} ${readOptionalString(args, "ref") ?? DEFAULT_STASH_REF}`;
}

async function previewGitStashPush(args: Record<string, unknown>): Promise<string> {
  return joinCommand(["git", "stash", "push", readOptionalBoolean(args, "includeUntracked") === true ? "-u" : "", messagePreview(args)]);
}

async function previewGitCreateTag(args: Record<string, unknown>): Promise<string> {
  return joinCommand(["git", "tag", readOptionalString(args, "message") === undefined ? "" : "-a", readRequiredString(args, "name"), messagePreview(args)]);
}

async function previewGitDeleteTag(args: Record<string, unknown>): Promise<string> {
  return `git tag -d ${readRequiredString(args, "name")}`;
}

function messagePreview(args: Record<string, unknown>): string {
  const message = readOptionalString(args, "message");
  return message === undefined ? "" : `-m ${JSON.stringify(message)}`;
}

function joinCommand(parts: readonly (string | undefined)[]): string {
  return parts.filter((part) => part !== undefined && part !== "").join(" ");
}
