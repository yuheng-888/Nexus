import type { AgentInteractiveToolContext, AgentInteractiveToolSpec } from "./agentInteractiveTools.js";
import {
  formatGitBranchList,
  formatGitBranchSummary,
  formatGitCommandResult,
  formatGitDiffResult,
  formatGitLog,
  formatGitRemotes,
  formatGitStashes,
  formatGitSummary,
  formatGitTags
} from "./agentGitFormatters.js";
import { readLimit, readOptionalBoolean, readOptionalString, readRequiredString } from "./agentToolArgs.js";

const DEFAULT_LOG_LIMIT = 20;
const MAX_LOG_LIMIT = 100;

export function createGitReadToolSpecs(): readonly AgentInteractiveToolSpec[] {
  return [
    readTool("git.status", "Read git status for the workspace.", "cwd?: string", gitStatus),
    readTool("git.summary", "Read structured Git status summary.", "cwd?: string", gitSummary),
    readTool("git.branches", "Read current Git branch summary.", "cwd?: string", gitBranches),
    readTool("git.list_branches", "List local Git branches.", "cwd?: string", gitListBranches),
    readTool("git.diff", "Read git diff without modifying files.", "cwd?: string, path?: string, staged?: boolean", gitDiff),
    readTool("git.remotes", "List configured Git remotes.", "cwd?: string", gitRemotes),
    readTool("git.log", "Read Git commit history.", "cwd?: string, ref?: string, limit?: number", gitLog),
    readTool("git.show", "Show a Git ref patch and stat.", "ref: string, cwd?: string", gitShow),
    readTool("git.stash_list", "List Git stashes.", "cwd?: string", gitStashList),
    readTool("git.tag_list", "List Git tags.", "cwd?: string", gitTagList)
  ];
}

function readTool(name: string, description: string, parameters: string, run: AgentInteractiveToolSpec["run"]): AgentInteractiveToolSpec {
  return { description, name, parameters, permission: "read", run };
}

async function gitStatus(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.status(cwd(args, context)));
}

async function gitSummary(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitSummary(await context.git.summary(cwd(args, context)));
}

async function gitBranches(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitBranchSummary(await context.git.branches(cwd(args, context)));
}

async function gitListBranches(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitBranchList(await context.git.listBranches(cwd(args, context)));
}

async function gitDiff(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitDiffResult(await context.git.diff({
    cwd: cwd(args, context),
    path: readOptionalString(args, "path"),
    staged: readOptionalBoolean(args, "staged")
  }));
}

async function gitRemotes(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitRemotes(await context.git.remotes(cwd(args, context)));
}

async function gitLog(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitLog(await context.git.log({
    limit: readLimit(args, DEFAULT_LOG_LIMIT, MAX_LOG_LIMIT),
    ref: readOptionalString(args, "ref")
  }, cwd(args, context)));
}

async function gitShow(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitCommandResult(await context.git.show(readRequiredString(args, "ref"), cwd(args, context)));
}

async function gitStashList(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitStashes(await context.git.stashList(cwd(args, context)));
}

async function gitTagList(args: Record<string, unknown>, context: AgentInteractiveToolContext): Promise<string> {
  return formatGitTags(await context.git.tagList(cwd(args, context)));
}

function cwd(args: Record<string, unknown>, context: AgentInteractiveToolContext): string {
  return readOptionalString(args, "cwd") ?? context.cwd;
}
