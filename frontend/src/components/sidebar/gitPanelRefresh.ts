import type { GitDiffResult } from "../../types/git";
import type { DiffSelection } from "./gitPanelStateTypes";
import type { GitDataSetters } from "./useGitDataState";

export async function refreshGitData(options: {
  readonly selected: DiffSelection | null;
  readonly setters: GitDataSetters;
}): Promise<void> {
  const summary = await window.nexus.git.summary();
  options.setters.setSummary(summary);
  if (!summary.repository) {
    clearRepositoryDetails(options.setters);
    return;
  }

  const [branches, remotes, log, stashes, tags] = await Promise.all([
    window.nexus.git.listBranches(),
    window.nexus.git.remotes(),
    window.nexus.git.log({ limit: 8 }),
    window.nexus.git.stashList(),
    window.nexus.git.tagList()
  ]);
  options.setters.setBranches(branches);
  options.setters.setRemotes(remotes);
  options.setters.setLog(log.entries);
  options.setters.setStashes(stashes);
  options.setters.setTags(tags);
  if (options.selected !== null) await loadGitDiff(options.selected, options.setters.setDiff, () => undefined);
}

export async function loadGitDiff(
  selection: DiffSelection,
  setDiff: (diff: GitDiffResult | null) => void,
  setError: (message: string) => void
): Promise<void> {
  try {
    setDiff(await window.nexus.git.diff(selection));
  } catch (caught) {
    setError(toMessage(caught));
  }
}

function clearRepositoryDetails(setters: GitDataSetters): void {
  setters.setBranches(null);
  setters.setDiff(null);
  setters.setLog([]);
  setters.setRemotes([]);
  setters.setStashes([]);
  setters.setTags([]);
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
