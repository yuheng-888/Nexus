import { useMemo, useState } from "react";
import type {
  GitBranchList,
  GitDiffResult,
  GitLogEntry,
  GitRemote,
  GitStashEntry,
  GitSummary
} from "../../types/git";
import type { DiffSelection } from "./gitPanelStateTypes";

export interface GitDataState {
  readonly branches: GitBranchList | null;
  readonly commitMessage: string;
  readonly diff: GitDiffResult | null;
  readonly log: readonly GitLogEntry[];
  readonly remotes: readonly GitRemote[];
  readonly selected: DiffSelection | null;
  readonly stashes: readonly GitStashEntry[];
  readonly summary: GitSummary | null;
  readonly tags: readonly string[];
}

export interface GitDataSetters {
  readonly setBranches: (branches: GitBranchList | null) => void;
  readonly setCommitMessage: (message: string) => void;
  readonly setDiff: (diff: GitDiffResult | null) => void;
  readonly setLog: (log: readonly GitLogEntry[]) => void;
  readonly setRemotes: (remotes: readonly GitRemote[]) => void;
  readonly setSelected: (selection: DiffSelection | null) => void;
  readonly setStashes: (stashes: readonly GitStashEntry[]) => void;
  readonly setSummary: (summary: GitSummary | null) => void;
  readonly setTags: (tags: readonly string[]) => void;
}

export interface GitDataStore extends GitDataState {
  readonly setters: GitDataSetters;
  setCommitMessage(message: string): void;
}

export function useGitDataState(): GitDataStore {
  const [branches, setBranches] = useState<GitBranchList | null>(null);
  const [commitMessage, setCommitMessage] = useState("");
  const [diff, setDiff] = useState<GitDiffResult | null>(null);
  const [log, setLog] = useState<readonly GitLogEntry[]>([]);
  const [remotes, setRemotes] = useState<readonly GitRemote[]>([]);
  const [selected, setSelected] = useState<DiffSelection | null>(null);
  const [stashes, setStashes] = useState<readonly GitStashEntry[]>([]);
  const [summary, setSummary] = useState<GitSummary | null>(null);
  const [tags, setTags] = useState<readonly string[]>([]);
  const setters = useMemo(() => ({
    setBranches,
    setCommitMessage,
    setDiff,
    setLog,
    setRemotes,
    setSelected,
    setStashes,
    setSummary,
    setTags
  }), []);

  return { branches, commitMessage, diff, log, remotes, selected, setCommitMessage, setters, stashes, summary, tags };
}

export function clearGitData(setters: GitDataSetters): void {
  setters.setBranches(null);
  setters.setDiff(null);
  setters.setLog([]);
  setters.setRemotes([]);
  setters.setSelected(null);
  setters.setStashes([]);
  setters.setSummary(null);
  setters.setTags([]);
}
