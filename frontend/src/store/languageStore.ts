import { create } from "zustand";
import type { LanguageDocumentSymbol } from "../types/language";
import type { EditorProblem, ProblemSummary } from "../components/editor/languageClient";
import { compareProblems, summarizeProblems } from "../components/editor/languageClient";

interface LanguageState {
  readonly problemSummary: ProblemSummary;
  readonly problems: readonly EditorProblem[];
  readonly symbolsByPath: ReadonlyMap<string, readonly LanguageDocumentSymbol[]>;
  clearLanguageState(): void;
  setProblemsForPath(path: string, problems: readonly EditorProblem[]): void;
  setSymbolsForPath(path: string, symbols: readonly LanguageDocumentSymbol[]): void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  problemSummary: summarizeProblems([]),
  problems: [],
  symbolsByPath: new Map(),

  clearLanguageState: () => set({ problemSummary: summarizeProblems([]), problems: [], symbolsByPath: new Map() }),

  setProblemsForPath: (path, problems) =>
    set((state) => {
      const nextProblems = [
        ...state.problems.filter((problem) => problem.path !== path),
        ...problems
      ].sort(compareProblems);

      return {
        problemSummary: summarizeProblems(nextProblems),
        problems: nextProblems
      };
    }),

  setSymbolsForPath: (path, symbols) =>
    set((state) => {
      const next = new Map(state.symbolsByPath);
      next.set(path, symbols);
      return { symbolsByPath: next };
    })
}));
