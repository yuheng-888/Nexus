import { readFile } from "node:fs/promises";
import { join } from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

describe("preload runtime contract", () => {
  it("exposes marketplace and api namespaces used by the renderer", async () => {
    const api = await loadPreloadApi();

    expect(api.api).toMatchObject({
      active: expect.any(Function),
      add: expect.any(Function),
      configs: expect.any(Function),
      presets: expect.any(Function),
      remove: expect.any(Function),
      setActive: expect.any(Function),
      test: expect.any(Function),
      update: expect.any(Function)
    });
    expect((api.file as { find?: unknown }).find).toEqual(expect.any(Function));
    expect((api.file as { list?: unknown }).list).toEqual(expect.any(Function));
    expect((api.file as { read?: unknown }).read).toEqual(expect.any(Function));
    expect((api.file as { readAbsolute?: unknown }).readAbsolute).toEqual(expect.any(Function));
    expect((api.file as { write?: unknown }).write).toEqual(expect.any(Function));
    expect((api.file as { writeAbsolute?: unknown }).writeAbsolute).toEqual(expect.any(Function));
    expect(api.marketplace.plugins.list).toEqual(expect.any(Function));
    expect(api.marketplace.plugins.installed).toEqual(expect.any(Function));
    expect(api.marketplace.plugins.search).toEqual(expect.any(Function));
    expect(api.marketplace.skills.list).toEqual(expect.any(Function));
    expect(api.marketplace.skills.installed).toEqual(expect.any(Function));
    expect(api.marketplace.skills.search).toEqual(expect.any(Function));
    expect((api.dialog as { pickPath?: unknown }).pickPath).toEqual(expect.any(Function));
    expect((api.mcp as { list?: unknown }).list).toEqual(expect.any(Function));
    expect((api.mcp as { search?: unknown }).search).toEqual(expect.any(Function));
    expect((api.mcp as { install?: unknown }).install).toEqual(expect.any(Function));
    expect((api.conversations as { get?: unknown }).get).toEqual(expect.any(Function));
    expect((api.conversations as { list?: unknown }).list).toEqual(expect.any(Function));
    expect((api.conversations as { clear?: unknown }).clear).toEqual(expect.any(Function));
    expect((api.languages as { completions?: unknown }).completions).toEqual(expect.any(Function));
    expect((api.languages as { definition?: unknown }).definition).toEqual(expect.any(Function));
    expect((api.languages as { diagnostics?: unknown }).diagnostics).toEqual(expect.any(Function));
    expect((api.languages as { documentSymbols?: unknown }).documentSymbols).toEqual(expect.any(Function));
    expect((api.languages as { hover?: unknown }).hover).toEqual(expect.any(Function));
    expect((api.languages as { openDocument?: unknown }).openDocument).toEqual(expect.any(Function));
    expect((api.languages as { references?: unknown }).references).toEqual(expect.any(Function));
    expect((api.languages as { updateDocument?: unknown }).updateDocument).toEqual(expect.any(Function));
    expect((api.workspace as { open?: unknown }).open).toEqual(expect.any(Function));
    expect((api.workspace as { openRecent?: unknown }).openRecent).toEqual(expect.any(Function));
    expect((api.workspace as { recent?: unknown }).recent).toEqual(expect.any(Function));
    expect(api.codex).toBeUndefined();
    expect((api.subagents as { start?: unknown }).start).toEqual(expect.any(Function));
    expect((api.subagents as { profiles?: unknown }).profiles).toEqual(expect.any(Function));
    expect((api.workflows as { delete?: unknown }).delete).toEqual(expect.any(Function));
    expect((api.workflows as { get?: unknown }).get).toEqual(expect.any(Function));
    expect((api.workflows as { list?: unknown }).list).toEqual(expect.any(Function));
    expect((api.workflows as { run?: unknown }).run).toEqual(expect.any(Function));
    expect((api.workflows as { runs?: unknown }).runs).toEqual(expect.any(Function));
    expect((api.workflows as { save?: unknown }).save).toEqual(expect.any(Function));
    expect((api.git as { branches?: unknown }).branches).toEqual(expect.any(Function));
    expect((api.git as { abortMerge?: unknown }).abortMerge).toEqual(expect.any(Function));
    expect((api.git as { abortRebase?: unknown }).abortRebase).toEqual(expect.any(Function));
    expect((api.git as { addRemote?: unknown }).addRemote).toEqual(expect.any(Function));
    expect((api.git as { checkoutBranch?: unknown }).checkoutBranch).toEqual(expect.any(Function));
    expect((api.git as { commit?: unknown }).commit).toEqual(expect.any(Function));
    expect((api.git as { createBranch?: unknown }).createBranch).toEqual(expect.any(Function));
    expect((api.git as { createTag?: unknown }).createTag).toEqual(expect.any(Function));
    expect((api.git as { deleteBranch?: unknown }).deleteBranch).toEqual(expect.any(Function));
    expect((api.git as { deleteTag?: unknown }).deleteTag).toEqual(expect.any(Function));
    expect((api.git as { diff?: unknown }).diff).toEqual(expect.any(Function));
    expect((api.git as { discardAll?: unknown }).discardAll).toEqual(expect.any(Function));
    expect((api.git as { discardFile?: unknown }).discardFile).toEqual(expect.any(Function));
    expect((api.git as { fetch?: unknown }).fetch).toEqual(expect.any(Function));
    expect((api.git as { init?: unknown }).init).toEqual(expect.any(Function));
    expect((api.git as { listBranches?: unknown }).listBranches).toEqual(expect.any(Function));
    expect((api.git as { log?: unknown }).log).toEqual(expect.any(Function));
    expect((api.git as { merge?: unknown }).merge).toEqual(expect.any(Function));
    expect((api.git as { pull?: unknown }).pull).toEqual(expect.any(Function));
    expect((api.git as { publishSafetyScan?: unknown }).publishSafetyScan).toEqual(expect.any(Function));
    expect((api.git as { publishToGitHub?: unknown }).publishToGitHub).toEqual(expect.any(Function));
    expect((api.git as { push?: unknown }).push).toEqual(expect.any(Function));
    expect((api.git as { rebase?: unknown }).rebase).toEqual(expect.any(Function));
    expect((api.git as { removeRemote?: unknown }).removeRemote).toEqual(expect.any(Function));
    expect((api.git as { remotes?: unknown }).remotes).toEqual(expect.any(Function));
    expect((api.git as { show?: unknown }).show).toEqual(expect.any(Function));
    expect((api.git as { stage?: unknown }).stage).toEqual(expect.any(Function));
    expect((api.git as { stageAll?: unknown }).stageAll).toEqual(expect.any(Function));
    expect((api.git as { stashApply?: unknown }).stashApply).toEqual(expect.any(Function));
    expect((api.git as { stashDrop?: unknown }).stashDrop).toEqual(expect.any(Function));
    expect((api.git as { stashList?: unknown }).stashList).toEqual(expect.any(Function));
    expect((api.git as { stashPop?: unknown }).stashPop).toEqual(expect.any(Function));
    expect((api.git as { stashPush?: unknown }).stashPush).toEqual(expect.any(Function));
    expect((api.git as { summary?: unknown }).summary).toEqual(expect.any(Function));
    expect((api.git as { tagList?: unknown }).tagList).toEqual(expect.any(Function));
    expect((api.git as { unstage?: unknown }).unstage).toEqual(expect.any(Function));
    expect((api.git as { unstageAll?: unknown }).unstageAll).toEqual(expect.any(Function));
    expect((api.rag as { search?: unknown }).search).toEqual(expect.any(Function));
    expect((api.rag as { context?: unknown }).context).toEqual(expect.any(Function));
    expect(((api.rag as { index?: Record<string, unknown> }).index)?.build).toEqual(expect.any(Function));
    expect(((api.rag as { index?: Record<string, unknown> }).index)?.clear).toEqual(expect.any(Function));
    expect(((api.rag as { index?: Record<string, unknown> }).index)?.status).toEqual(expect.any(Function));
    expect(((api.reverse as { target?: Record<string, unknown> }).target)?.detect).toEqual(expect.any(Function));
    expect(((api.reverse as { asar?: Record<string, unknown> }).asar)?.diff).toEqual(expect.any(Function));
    expect(((api.reverse as { asar?: Record<string, unknown> }).asar)?.extract).toEqual(expect.any(Function));
    expect(((api.reverse as { asar?: Record<string, unknown> }).asar)?.inspect).toEqual(expect.any(Function));
    expect(((api.reverse as { asar?: Record<string, unknown> }).asar)?.pack).toEqual(expect.any(Function));
    expect(((api.reverse as { analysis?: Record<string, unknown> }).analysis)?.scan).toEqual(expect.any(Function));
    expect(((api.reverse as { projects?: Record<string, unknown> }).projects)?.add).toEqual(expect.any(Function));
    expect(((api.reverse as { projects?: Record<string, unknown> }).projects)?.list).toEqual(expect.any(Function));
    expect(((api.reverse as { projects?: Record<string, unknown> }).projects)?.remove).toEqual(expect.any(Function));
    expect(((api.reverse as { jshook?: Record<string, unknown> }).jshook)?.generate).toEqual(expect.any(Function));
    expect(((api.reverse as { jshook?: Record<string, unknown> }).jshook)?.inject).toEqual(expect.any(Function));
    expect(((api.reverse as { jshook?: Record<string, unknown> }).jshook)?.restore).toEqual(expect.any(Function));
    expect((api.shell as { revealPath?: unknown }).revealPath).toEqual(expect.any(Function));
    expect(((api.searchReplace as { apply?: unknown; preview?: unknown })?.apply)).toEqual(expect.any(Function));
    expect(((api.searchReplace as { apply?: unknown; preview?: unknown })?.preview)).toEqual(expect.any(Function));
  });
});

async function loadPreloadApi(): Promise<Record<string, unknown>> {
  const preloadPath = join(process.cwd(), "src/preload/preload.cjs");
  const source = await readFile(preloadPath, "utf8");
  let exposed: Record<string, unknown> | undefined;
  const context = {
    require: (moduleName: string) => {
      if (moduleName !== "electron") {
        throw new Error(`Unexpected require: ${moduleName}`);
      }

      return {
        contextBridge: {
          exposeInMainWorld: (_name: string, api: Record<string, unknown>) => {
            exposed = api;
          }
        },
        ipcRenderer: {
          invoke: () => Promise.resolve(),
          off: () => undefined,
          on: () => undefined
        }
      };
    }
  };

  vm.runInNewContext(source, context);

  if (exposed === undefined) {
    throw new Error("preload did not expose an API");
  }

  return exposed;
}
