import type { GitBranchSummary, GitCommandResult, GitFileChange, GitSummary } from "../gitContracts.js";

export function parseGitSummary(raw: GitCommandResult): GitSummary {
  if (raw.exitCode !== 0) return toSummary(raw, emptyBranch(), []);

  const lines = raw.stdout.trimEnd().split(/\r?\n/).filter(Boolean);
  const branch = parseBranch(lines.find((line) => line.startsWith("## ")));
  const changes = lines.filter((line) => !line.startsWith("## ")).map(parseChange);

  return toSummary(raw, branch, changes);
}

function toSummary(
  raw: GitCommandResult,
  branch: GitBranchSummary,
  changes: readonly GitFileChange[]
): GitSummary {
  return {
    branch,
    changes,
    raw,
    repository: raw.exitCode === 0,
    staged: changes.filter((change) => change.staged && !change.untracked),
    unstaged: changes.filter((change) => change.unstaged && !change.untracked),
    untracked: changes.filter((change) => change.untracked)
  };
}

function parseBranch(line: string | undefined): GitBranchSummary {
  if (line === undefined) return emptyBranch();
  const raw = line.slice(3);
  if (raw.startsWith("No commits yet on ")) {
    return { ...emptyBranch(), current: raw.replace("No commits yet on ", "") };
  }

  if (raw.startsWith("HEAD ")) return { ...emptyBranch(), current: "HEAD", detached: true };
  return parseTrackingBranch(raw);
}

function parseTrackingBranch(raw: string): GitBranchSummary {
  const [current = "", rest = ""] = raw.split("...");
  const upstream = rest.split(" ")[0] || undefined;
  const tracking = raw.match(/\[(.+)]/)?.[1] ?? "";

  return {
    ahead: readTrackingCount(tracking, "ahead"),
    behind: readTrackingCount(tracking, "behind"),
    current,
    detached: false,
    upstream
  };
}

function parseChange(line: string): GitFileChange {
  const indexStatus = line[0] ?? " ";
  const workingTreeStatus = line[1] ?? " ";
  const [originalPath, path] = parsePath(line.slice(3));
  const untracked = indexStatus === "?" && workingTreeStatus === "?";

  return {
    indexStatus,
    originalPath,
    path,
    staged: indexStatus !== " " && indexStatus !== "?",
    status: toChangeStatus(indexStatus, workingTreeStatus),
    untracked,
    unstaged: workingTreeStatus !== " " && workingTreeStatus !== "?",
    workingTreeStatus
  };
}

function parsePath(raw: string): readonly [string | undefined, string] {
  const parts = raw.split(" -> ");
  return parts.length === 2 ? [parts[0], parts[1] ?? raw] : [undefined, raw];
}

function toChangeStatus(indexStatus: string, workingTreeStatus: string): GitFileChange["status"] {
  const status = indexStatus === " " || indexStatus === "?" ? workingTreeStatus : indexStatus;
  if (indexStatus === "?" && workingTreeStatus === "?") return "untracked";
  if (status === "A") return "added";
  if (status === "C") return "copied";
  if (status === "D") return "deleted";
  if (status === "M") return "modified";
  if (status === "R") return "renamed";
  return "unknown";
}

function readTrackingCount(tracking: string, label: "ahead" | "behind"): number {
  const match = tracking.match(new RegExp(`${label} (\\d+)`));
  return match?.[1] === undefined ? 0 : Number(match[1]);
}

function emptyBranch(): GitBranchSummary {
  return { ahead: 0, behind: 0, current: "", detached: false };
}
