import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { FetchLike } from "./skillsMpClient.js";

interface GitHubTreeInfo {
  readonly owner: string;
  readonly repo: string;
  readonly ref: string;
  readonly path: string;
}

interface GitHubContentFile {
  readonly download_url?: unknown;
  readonly name?: unknown;
  readonly path?: unknown;
  readonly type?: unknown;
}

export async function installGitHubSkill(input: {
  readonly fetch: FetchLike;
  readonly githubUrl: string;
  readonly name: string;
  readonly skillsDir: string;
}): Promise<string> {
  const tree = parseGitHubTreeUrl(input.githubUrl);
  const targetDir = join(input.skillsDir, toSafeDirectoryName(input.name));
  await installTree({ fetch: input.fetch, sourceRoot: tree.path, targetDir, tree });
  return targetDir;
}

function parseGitHubTreeUrl(githubUrl: string): GitHubTreeInfo {
  const url = new URL(githubUrl);
  const segments = url.pathname.split("/").filter(Boolean);

  if (url.hostname !== "github.com" || segments[2] !== "tree") {
    throw new Error(`Unsupported skill source URL: ${githubUrl}`);
  }

  return {
    owner: segments[0] ?? "",
    path: segments.slice(4).join("/"),
    ref: segments[3] ?? "main",
    repo: segments[1] ?? ""
  };
}

async function installTree(input: {
  readonly fetch: FetchLike;
  readonly sourceRoot: string;
  readonly targetDir: string;
  readonly tree: GitHubTreeInfo;
}): Promise<void> {
  const entries = await fetchGitHubContents(input.fetch, input.tree);

  await Promise.all(entries.map((entry) => installEntry({
    entry,
    fetch: input.fetch,
    sourceRoot: input.sourceRoot,
    targetDir: input.targetDir,
    tree: input.tree
  })));
}

async function fetchGitHubContents(
  fetcher: FetchLike,
  tree: GitHubTreeInfo
): Promise<GitHubContentFile[]> {
  const url = new URL(`https://api.github.com/repos/${tree.owner}/${tree.repo}/contents/${tree.path}`);
  url.searchParams.set("ref", tree.ref);

  const response = await fetcher(url.toString());
  if (!response.ok) {
    throw new Error(`GitHub skill fetch failed: HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("GitHub skill source returned an invalid file list");
  }

  return payload as GitHubContentFile[];
}

async function installEntry(input: {
  readonly entry: GitHubContentFile;
  readonly fetch: FetchLike;
  readonly sourceRoot: string;
  readonly targetDir: string;
  readonly tree: GitHubTreeInfo;
}): Promise<void> {
  if (input.entry.type === "dir") {
    await installNestedDirectory(input);
    return;
  }

  if (input.entry.type === "file") {
    await installFile(input);
  }
}

async function installNestedDirectory(input: {
  readonly entry: GitHubContentFile;
  readonly fetch: FetchLike;
  readonly sourceRoot: string;
  readonly targetDir: string;
  readonly tree: GitHubTreeInfo;
}): Promise<void> {
  const nestedTree = {
    ...input.tree,
    path: readPath(input.entry)
  };
  await installTree({
    fetch: input.fetch,
    sourceRoot: input.sourceRoot,
    targetDir: input.targetDir,
    tree: nestedTree
  });
}

async function installFile(input: {
  readonly entry: GitHubContentFile;
  readonly fetch: FetchLike;
  readonly sourceRoot: string;
  readonly targetDir: string;
}): Promise<void> {
  const downloadUrl = readDownloadUrl(input.entry);
  const relativePath = readPath(input.entry).replace(`${input.sourceRoot}/`, "");
  const targetPath = join(input.targetDir, relativePath);
  const response = await input.fetch(downloadUrl);

  if (!response.ok) {
    throw new Error(`GitHub skill file fetch failed: HTTP ${response.status}`);
  }

  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, await response.text(), "utf8");
}

function readDownloadUrl(entry: GitHubContentFile): string {
  if (typeof entry.download_url !== "string" || entry.download_url === "") {
    throw new Error("GitHub skill file is missing a download URL");
  }

  return entry.download_url;
}

function readPath(entry: GitHubContentFile): string {
  if (typeof entry.path !== "string" || entry.path === "") {
    throw new Error("GitHub skill entry is missing a path");
  }

  return entry.path;
}

function toSafeDirectoryName(name: string): string {
  const safe = name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-|-$/g, "");
  return safe === "" ? "skillsmp-skill" : safe;
}
