# Nexus Backend API

Nexus exposes its desktop backend through `window.nexus` from Electron preload.
The UI can be replaced freely as long as it calls these APIs from the renderer.

## Workspace

```ts
window.nexus.workspace.get(): Promise<WorkspaceInfo>
```

Returns the opened workspace root. When no project has been opened, `root` is
`null`.

## Files

```ts
window.nexus.file.list(path?: string): Promise<DirectoryEntry[]>
window.nexus.file.read(path: string): Promise<FileReadResult>
window.nexus.file.readAbsolute(path: string): Promise<FileReadResult>
window.nexus.file.write(path: string, content: string): Promise<FileReadResult>
window.nexus.file.writeAbsolute(path: string, content: string): Promise<FileReadResult>
```

`list`, `read`, and `write` use workspace-relative paths. Traversal outside the
workspace throws an explicit error. `readAbsolute` and `writeAbsolute` are for
selected local files and reverse-engineering results outside the workspace;
non-absolute paths throw an explicit error.

## Native Dialogs

```ts
window.nexus.dialog.pickPath({
  mode: "file" | "directory" | "file-or-directory" | "save-file",
  title?,
  buttonLabel?,
  defaultPath?,
  filters?
}): Promise<{ canceled: boolean; path: string | null }>
```

Opens the native Electron file dialog for renderer tools that need absolute
paths, such as reverse engineering targets and ASAR outputs. Cancellation is
reported explicitly with `canceled: true`; invalid modes and completed dialogs
without a selected path throw explicit errors.

## Native Shell

```ts
window.nexus.shell.revealPath(path: string): Promise<ShellRevealResult>
```

Reveals an absolute local path in the platform file manager. Relative paths are
rejected explicitly. Reverse workbench outputs use this to locate generated
hooks, injected backups, extracted folders, and packed ASAR files.

## Search

```ts
window.nexus.search(request: SearchRequest): Promise<SearchMatch[]>
window.nexus.searchReplace.preview(request: SearchReplaceRequest): Promise<SearchReplacePreviewResult>
window.nexus.searchReplace.apply(request: SearchReplaceRequest): Promise<SearchReplaceApplyResult>
```

Uses `rg --json` and returns compact match records with path, line, and preview.
An empty query returns `[]`; a ripgrep execution failure throws the real error.

Search replace uses literal matching. `preview` returns per-file match counts and
line previews without writing files. `apply` recomputes matches against the
current workspace files, writes the replacements, and returns changed-file and
replacement counts.

## Tests

```ts
window.nexus.tests.discover(): Promise<TestDiscoveryResult>
window.nexus.tests.run(request: TestRunRequest): Promise<TestRunResult>
```

The first test explorer backend supports npm projects with a `package.json`
`test` script. Discovery uses ripgrep file listing for common `.test` and
`.spec` JavaScript/TypeScript files while skipping generated/vendor folders.
`run({ scope: "all" })` executes `npm test`; `run({ scope: "file", path })`
executes `npm test -- <path>` and returns stdout, stderr, exit code, duration,
and pass/fail status.

## Project Scripts

```ts
window.nexus.scripts.discover(): Promise<ScriptDiscoveryResult>
window.nexus.scripts.run(request: ScriptRunRequest): Promise<ScriptRunResult>
```

Discovers npm scripts from the opened workspace `package.json`. `run` executes
the selected script as `npm run <name>` without shell string interpolation, then
returns stdout, stderr, exit code, duration, and pass/fail status.

## Local RAG / Code Index

```ts
window.nexus.rag.index.build(): Promise<RagIndexSummary>
window.nexus.rag.index.status(): Promise<RagIndexStatus>
window.nexus.rag.index.clear(): Promise<RagIndexStatus>
window.nexus.rag.search(request: RagSearchRequest): Promise<RagSearchResult[]>
window.nexus.rag.context(request: RagSearchRequest): Promise<RagContextBundle>
```

The first RAG implementation is fully local and lexical. It walks the opened
workspace, skips generated/vendor directories such as `node_modules`, `.git`,
`dist`, and `vendor`, chunks text/code files by line range, tokenizes paths and
symbols, and persists one index per workspace in:

```text
~/.nexus/code-indexes/<workspace-hash>.json
```

`search` returns ranked chunks with path, line range, score, symbols, preview,
and content. `context` returns the same ranked chunks as an AI-ready context
bundle. If no index exists, retrieval throws an explicit missing-index error.

## Git

```ts
const git = window.nexus.git;

git.status(cwd?): Promise<GitStatusResult>
git.summary(cwd?): Promise<GitSummary>
git.branches(cwd?): Promise<GitBranchSummary>
git.listBranches(cwd?): Promise<GitBranchList>
git.diff(request): Promise<GitDiffResult>
git.stage(path) / git.unstage(path): Promise<GitCommandResult>
git.stageAll() / git.unstageAll(): Promise<GitCommandResult>
git.commit(message): Promise<GitCommandResult>
git.remotes(cwd?): Promise<GitRemote[]>
git.addRemote(request) / git.removeRemote(name): Promise<GitCommandResult>
git.fetch(request?) / git.pull(request?) / git.push(request?): Promise<GitCommandResult>
git.init(request?): Promise<GitCommandResult>
git.publishSafetyScan(): Promise<GitPublishSafetyReport>
git.publishToGitHub(request): Promise<GitHubPublishResult>
git.createPullRequest(request): Promise<GitHubPullRequest>
git.listPullRequests(request): Promise<GitHubPullRequest[]>
git.listPullRequestReviews(request): Promise<GitHubPullRequestReview[]>
git.createBranch(request) / git.checkoutBranch(request) / git.deleteBranch(request): Promise<GitCommandResult>
git.log(request?): Promise<GitLogResult>
git.show(ref) / git.merge(branch) / git.rebase(branch): Promise<GitCommandResult>
git.abortMerge() / git.abortRebase(): Promise<GitCommandResult>
git.stashList(): Promise<GitStashEntry[]>
git.stashPush(request?) / git.stashApply(ref?) / git.stashPop(ref?) / git.stashDrop(ref?): Promise<GitCommandResult>
git.discardFile(path) / git.discardAll(): Promise<GitCommandResult>
git.tagList(): Promise<string[]>
git.createTag(request) / git.deleteTag(name): Promise<GitCommandResult>
```

`status` keeps the legacy raw `git status --short --branch` output. `summary`
uses `git status --porcelain=v1 --branch` and returns structured branch,
staged, unstaged, and untracked groups. `diff` supports worktree and staged
diffs. Stage, unstage, stage all, unstage all, and commit return real
`stdout`, `stderr`, and `exitCode`; command failures are not hidden. Empty
commit messages throw an explicit error before invoking git.

The expanded Git backend covers local workflow, branch management, remotes,
network operations, history, merge/rebase, stash, discard, and tags. Operations
call the real `git` binary in the opened workspace. Destructive
discard/drop/delete operations are explicit API calls and return the real Git
result.

`init` creates a repository in the opened workspace with the requested branch,
defaulting to `main`. `publishSafetyScan` walks publish candidates while
skipping generated folders such as `node_modules`, `dist`, and `vendor`; it
blocks sensitive file names, private key files, local home-directory paths, and
common token-shaped strings. `publishToGitHub` does not call `gh` or any other
third-party CLI. It ensures a publish `.gitignore`, runs the same safety scan,
initializes Git when needed, stages and commits changed files, creates a GitHub
repository through the GitHub REST API, upserts the requested remote, and pushes
the requested branch with upstream tracking. The GitHub token is supplied per
request and is not persisted by Nexus.

GitHub PR APIs infer `owner/repo` from the configured remote when those fields
are omitted. `createPullRequest` defaults `base` to `main` and `head` to the
current branch, then calls the GitHub REST API directly. `listPullRequests` and
`listPullRequestReviews` expose review state for native UI and AI workflows.

## API Configuration

```ts
window.nexus.api.presets(): Promise<ApiProviderPreset[]>
window.nexus.api.configs(): Promise<{ configs: ApiConfig[]; activeId: string | null }>
window.nexus.api.add(config: Omit<ApiConfig, "id">): Promise<ApiConfig>
window.nexus.api.update(id: string, updates: Partial<ApiConfig>): Promise<ApiConfig | null>
window.nexus.api.remove(id: string): Promise<boolean>
window.nexus.api.setActive(id: string | null): Promise<void>
window.nexus.api.active(): Promise<ApiConfig | null>
window.nexus.api.test(id: string): Promise<ApiTestResult>
```

Model provider configurations, API keys, deletion state, and the active config
are persisted in:

```text
~/.nexus/api-configs.json
```

If the file exists but is malformed, the backend throws an explicit error rather
than silently restoring defaults.

## Terminal Sessions

```ts
window.nexus.terminal.create(options: TerminalCreateOptions): Promise<SessionSnapshot>
window.nexus.session.write(sessionId: string, data: string): Promise<void>
window.nexus.session.resize(sessionId: string, cols: number, rows: number): Promise<void>
window.nexus.session.kill(sessionId: string): Promise<void>
```

Terminal sessions are PTY-backed through `node-pty`.

## Agent Sessions

```ts
window.nexus.agent.start(options: AgentStartOptions): Promise<SessionSnapshot>
```

Starts a Nexus-native agent runtime session. The runtime uses the active model
configuration from `window.nexus.api`, executes Nexus backend tools for project
context, and streams JSON session events through the shared session event API.
During a run, the model can request additional read-only native tools by
emitting `nexus.tool_call` JSON objects. Nexus executes those calls, streams
`agent.tool.requested` and `agent.tool.completed` audit events, sends
`nexus.tool_result` messages back to the model, and only persists the final
assistant response. If a model keeps requesting tools after the runtime limit,
the session fails with an explicit tool-loop error instead of silently falling
back.
Tools marked as `write` require explicit renderer approval. Nexus emits
`agent.tool.approval_requested` with a preview, waits for
`window.nexus.session.write()` to send an `agent.tool.approval` decision, then
emits `agent.tool.approval_resolved` before executing or denying the tool.

Available interactive tools are:

- `workspace.list_directory`
- `workspace.read_file`
- `workspace.search`
- `workspace.replace_preview`
- `workspace.replace_all` (approval required)
- `workspace.write_file` (approval required)
- `git.status`
- `git.summary`
- `git.branches`
- `git.list_branches`
- `git.diff`
- `git.remotes`
- `git.log`
- `git.show`
- `git.stash_list`
- `git.tag_list`
- `git.init` (approval required)
- `git.stage` (approval required)
- `git.unstage` (approval required)
- `git.stage_all` (approval required)
- `git.unstage_all` (approval required)
- `git.commit` (approval required)
- `git.create_branch` (approval required)
- `git.checkout_branch` (approval required)
- `git.delete_branch` (approval required)
- `git.add_remote` (approval required)
- `git.remove_remote` (approval required)
- `git.fetch` (approval required)
- `git.pull` (approval required)
- `git.push` (approval required)
- `git.merge` (approval required)
- `git.rebase` (approval required)
- `git.abort_merge` (approval required)
- `git.abort_rebase` (approval required)
- `git.stash_push` (approval required)
- `git.stash_apply` (approval required)
- `git.stash_pop` (approval required)
- `git.stash_drop` (approval required)
- `git.discard_file` (approval required)
- `git.discard_all` (approval required)
- `git.create_tag` (approval required)
- `git.delete_tag` (approval required)
- `github.publish_safety_scan`
- `github.publish_repository` (approval required)
- `languages.diagnostics`
- `languages.document_symbols`
- `languages.definition`
- `languages.references`
- `languages.hover`
- `marketplace.plugins.search`
- `marketplace.plugins.installed`
- `marketplace.plugins.install` (approval required)
- `marketplace.plugins.uninstall` (approval required)
- `marketplace.plugins.toggle` (approval required)
- `marketplace.skills.search`
- `marketplace.skills.installed`
- `marketplace.skills.install` (approval required)
- `marketplace.skills.uninstall` (approval required)
- `marketplace.skills.toggle` (approval required)
- `mcp.list_tools`
- `mcp.call_tool` (approval required)
- `mcp.marketplace.search`
- `mcp.marketplace.install` (approval required)
- `rag.retrieve_context`
- `reverse.detect_target`
- `reverse.scan_javascript`
- `scripts.discover`
- `scripts.run` (approval required)
- `tests.discover`
- `tests.run` (approval required)
- `workflows.list`
- `workflows.run` (approval required)

Start the main assistant:

```ts
await window.nexus.agent.start({
  prompt: "Summarize this project"
});
```

Pass `model` to run the selected configured model:

```ts
await window.nexus.agent.start({
  conversationId: "main",
  model: "claude-sonnet-4-20250514",
  prompt: "Review this file"
});
```

Image inputs can be sent through `attachments`, each with `dataUrl`,
`mimeType`, and `name`. Nexus forwards them using the active provider's
multimodal message format.

When `conversationId` is provided, Nexus persists the user prompt and assistant
response in the conversation store and includes prior messages in future model
requests. Older messages are compacted into a deterministic local summary when
the estimated context size approaches the configured runtime context budget.

## Nexus Subagents

```ts
window.nexus.subagents.profiles(): Promise<SubagentProfile[]>
window.nexus.subagents.start(options: SubagentStartOptions): Promise<SubagentRun>
window.nexus.subagents.list(): Promise<SubagentRun[]>
```

Subagents are Nexus-native runtime sessions with role profiles such as planner,
implementer, reviewer, and verifier. They do not start Codex CLI or Claude Code
CLI processes.

```ts
await window.nexus.subagents.start({
  attachments: [{ dataUrl: "data:image/png;base64,...", mimeType: "image/png", name: "screen.png" }],
  conversationId: "main",
  model: "gpt-5-codex",
  profileId: "reviewer",
  prompt: "Review the current diff"
});
```

The returned `SubagentRun.session` can be observed with `window.nexus.session`
events just like terminal sessions.

## Conversations

```ts
window.nexus.conversations.list(): Promise<ConversationSummary[]>
window.nexus.conversations.get(id: string): Promise<Conversation>
window.nexus.conversations.clear(id: string): Promise<Conversation>
window.nexus.conversations.delete(id: string): Promise<boolean>
```

AI conversation state is persisted in:

```text
~/.nexus/conversations.json
```

Each conversation stores user and assistant messages, a title, and compression
metadata. Compression is explicit: when context is compacted, older messages are
moved into `summary`, recent messages remain as normal messages, and
`context.compressionCount` increments. Terminal PTY sessions are still live
processes and are not resumable after app restart.

## VS Code Plugins

```ts
window.nexus.marketplace.plugins.search({ query: "python" }): Promise<Plugin[]>
window.nexus.marketplace.plugins.installed(): Promise<Plugin[]>
window.nexus.marketplace.plugins.install(id: string): Promise<InstallResult>
window.nexus.marketplace.plugins.uninstall(id: string): Promise<InstallResult>
window.nexus.marketplace.plugins.toggle(id: string): Promise<InstallResult>
```

`search` queries the Visual Studio Code Marketplace public gallery endpoint and
maps extensions into Nexus plugin records. Installing a VS Code plugin downloads
the real `.vsix` package into:

```text
~/.nexus/extensions/<publisher>.<extension>/<version>.vsix
```

The VSIX is also extracted to:

```text
~/.nexus/extensions/<publisher>.<extension>/extension/
```

Nexus reads `extension/package.json` and stores a compact contribution summary
on the plugin record:

```ts
plugin.contributions.commands
plugin.contributions.activationEvents
plugin.contributions.configurationKeys
plugin.contributions.grammars
plugin.contributions.keybindings
plugin.contributions.languages
plugin.contributions.menus
plugin.contributions.snippets
plugin.contributions.themes
```

Installed plugin state is persisted in:

```text
~/.nexus/extensions/installed-plugins.json
```

Search results are merged with that local store, so installed extensions remain
visible after app restart even when the current marketplace query does not
return them. Uninstalling a plugin removes the stored VSIX, extracted extension
directory, and updates the state file. Download, Marketplace, VSIX extraction,
manifest parsing, and local filesystem failures are returned as explicit errors.
`installed()` reads only the local install store and does not call the VS Code
Marketplace.

## SkillsMP Skills

```ts
window.nexus.marketplace.skills.search({ query: "codex" }): Promise<Skill[]>
window.nexus.marketplace.skills.installed(): Promise<Skill[]>
window.nexus.marketplace.skills.install(id: string): Promise<InstallResult>
window.nexus.marketplace.skills.uninstall(id: string): Promise<InstallResult>
window.nexus.marketplace.skills.toggle(id: string): Promise<InstallResult>
```

`search` queries `https://skillsmp.com/api/v1/skills/search`. Installing a
SkillsMP skill downloads its GitHub skill directory into:

```text
~/.codex/skills/<skill-name>/
```

Nexus stores SkillsMP install state in:

```text
~/.codex/skills/installed-skills.json
```

`installed()` reads only this local state and does not call SkillsMP. Toggling
or uninstalling a SkillsMP skill updates the local state; uninstalling removes
the installed skill directory.

Install failures are returned as real errors from SkillsMP, GitHub, or the
filesystem instead of being treated as successful installs.

## MCP Services

```ts
window.nexus.mcp.list(): Promise<McpServer[]>
window.nexus.mcp.add(request: McpServerAddRequest): Promise<InstallResult>
window.nexus.mcp.remove(name: string): Promise<InstallResult>
window.nexus.mcp.toggle(name: string): Promise<InstallResult>
window.nexus.mcp.search({ query: "chrome", source: "all" }): Promise<McpMarketplaceServer[]>
window.nexus.mcp.install(id: string): Promise<InstallResult>
```

When no user MCP configuration exists, Nexus starts with one built-in service:

```json
{
  "name": "chrome-mcp",
  "command": "npx",
  "args": ["-y", "chrome-mcp@latest"]
}
```

Installed MCP services are persisted in:

```text
~/.nexus/mcp-servers.json
```

`search` queries the Glama MCP API at `https://glama.ai/api/mcp/v1/servers`
and the MCP.so directory page at `https://mcp.so/search.html`. Glama results
are shown as directory results; installation is only enabled when a result
contains a real `mcpServers` configuration. MCP.so results with `server_config`
can be installed directly into the Nexus MCP service list.

## Reverse Agent Tools

```ts
window.nexus.reverse.target.detect(path): Promise<ReverseTargetDetection>

window.nexus.reverse.asar.inspect({ archivePath }): Promise<ReverseAsarInspectResult>
window.nexus.reverse.asar.extract({ archivePath, destinationPath }): Promise<ReverseAsarExtractResult>
window.nexus.reverse.asar.pack({ sourceDirectory, archivePath }): Promise<ReverseAsarPackResult>
window.nexus.reverse.asar.diff({ beforePath, afterPath }): Promise<ReverseAsarDiffResult>

window.nexus.reverse.analysis.scan({ path, maxFileBytes? }): Promise<ReverseAnalysisResult>

window.nexus.reverse.jshook.generate({ outputDirectory, hookFilename? }): Promise<ReverseJsHookGenerateResult>
window.nexus.reverse.jshook.inject({ targetPath, entryPath?, hookFilename? }): Promise<ReverseJsHookInjectResult>
window.nexus.reverse.jshook.restore({ entryPath, backupPath }): Promise<ReverseJsHookRestoreResult>

window.nexus.reverse.projects.list(): Promise<ReverseProject[]>
window.nexus.reverse.projects.add({ name, targetPath, notes? }): Promise<ReverseProject>
window.nexus.reverse.projects.remove(id): Promise<boolean>
```

The reverse backend is local and native to Nexus. It is wired for AI and
subagent use instead of a manual reverse workbench panel. The native agent
startup tools currently inject `reverse.detect_target` and
`reverse.scan_javascript` results into the model context when a workspace is
open, so the assistant can reason over target type, JavaScript findings,
dependencies, and skipped files without asking the user to open a separate
tool view. Target detection recognizes `.asar` archives, macOS Electron app
bundles, Node projects, JavaScript bundle/source files, and unknown targets.
ASAR operations use `@electron/asar` directly for archive inspection,
extraction, packing, and metadata-level diffing. Diff entries compare file size
and integrity hash so same-size JavaScript bundle changes are still reported as
modified.

The JavaScript scanner walks files or project directories and reports Electron
IPC usage, network access, browser storage access, dynamic execution, child
process calls, and dependencies imported through `require`, static `import`,
or dynamic `import()`. Files above the configured scan limit are returned in
`skippedFiles` with an explicit reason. Findings, dependencies, and skipped
files include `absolutePath` so the renderer can open exact source locations
even when the target is outside the opened workspace.

`jshook.generate` writes a standalone `nexus-jshook.js` script that instruments
runtime calls and emits JSON events through `console.log` with the
`[Nexus jshook]` prefix. The hook covers `fetch`, `WebSocket`,
`XMLHttpRequest`, browser storage, Electron IPC APIs, and Node child process
methods when those APIs exist in the target runtime.

`jshook.inject` writes the hook into the target directory, prepends an explicit
bootstrap `require(...)` to a JavaScript entry file, and creates a timestamped
backup beside the entry before modifying it. For directories, `entryPath` can
be omitted when `package.json` has a string `main` field. If the entry already
contains the Nexus hook marker, injection throws an explicit error instead of
duplicating the bootstrap. `jshook.restore` restores from an explicit backup
path.

Reverse projects are persisted in:

```text
~/.nexus/reverse-projects.json
```

Malformed reverse project stores throw explicit JSON/schema errors instead of
silently resetting the project list.

## Session Events

```ts
const offData = window.nexus.session.onData(({ sessionId, data }) => {});
const offExit = window.nexus.session.onExit(({ sessionId, exitCode }) => {});
```

Both functions return an unsubscribe callback.

## Type Source

Renderer/backend contract types are split across `src/*Contracts.ts` and
`src/contracts.ts`; implementation lives in `src/main/` and
`src/preload/preload.ts`.
