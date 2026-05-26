import { useCallback, useEffect, useState } from "react";
import { useStore } from "../../store/useStore";
import type {
  ReverseAnalysisResult,
  ReverseAsarDiffResult,
  ReverseAsarExtractResult,
  ReverseAsarInspectResult,
  ReverseAsarPackResult,
  ReverseJsHookGenerateResult,
  ReverseJsHookInjectResult,
  ReverseJsHookRestoreResult,
  ReverseProject,
  ReverseTargetDetection
} from "../../types/reverse";
import {
  asarDiffSummary,
  asarInspectSummary,
  defaultReverseTargetPath,
  reverseAnalysisSummary,
  reverseErrorMessage,
  reverseTargetTypeLabel,
  suggestedProjectName
} from "./reversePanelModel";
import type { ReversePanelAction, ReversePanelState } from "./reversePanelStateTypes";
import { useReversePathPickers } from "./useReversePathPickers";
import { useReverseRevealPath } from "./useReverseRevealPath";

const PERCENT_SCALE = 100;

interface RunReverseActionOptions {
  readonly action: ReversePanelAction;
  readonly setAction: (action: ReversePanelAction) => void;
  readonly setError: (error: string) => void;
  readonly setMessage: (message: string) => void;
  readonly task: () => Promise<void>;
}

export function useReversePanelState(): ReversePanelState {
  const workspaceRoot = useStore((state) => state.workspaceRoot);
  const [action, setAction] = useState<ReversePanelAction>("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [targetPath, setTargetPath] = useState(defaultReverseTargetPath(workspaceRoot));
  const [outputPath, setOutputPath] = useState(defaultReverseTargetPath(workspaceRoot));
  const [comparePath, setComparePath] = useState("");
  const [entryPath, setEntryPath] = useState("");
  const [backupPath, setBackupPath] = useState("");
  const [hookFilename, setHookFilename] = useState("");
  const [notes, setNotes] = useState("");
  const [target, setTarget] = useState<ReverseTargetDetection | null>(null);
  const [analysis, setAnalysis] = useState<ReverseAnalysisResult | null>(null);
  const [asarInspect, setAsarInspect] = useState<ReverseAsarInspectResult | null>(null);
  const [asarDiff, setAsarDiff] = useState<ReverseAsarDiffResult | null>(null);
  const [asarExtract, setAsarExtract] = useState<ReverseAsarExtractResult | null>(null);
  const [asarPack, setAsarPack] = useState<ReverseAsarPackResult | null>(null);
  const [hookGenerate, setHookGenerate] = useState<ReverseJsHookGenerateResult | null>(null);
  const [hookInject, setHookInject] = useState<ReverseJsHookInjectResult | null>(null);
  const [hookRestore, setHookRestore] = useState<ReverseJsHookRestoreResult | null>(null);
  const [projects, setProjects] = useState<readonly ReverseProject[]>([]);
  const pathPickers = useReversePathPickers({
    backupPath,
    comparePath,
    entryPath,
    outputPath,
    setBackupPath,
    setComparePath,
    setEntryPath,
    setError,
    setMessage,
    setOutputPath,
    setTargetPath,
    targetPath
  });
  const revealPath = useReverseRevealPath({ setAction, setError, setMessage });

  const refreshProjects = useCallback(async () => {
    await runReverseAction({ action: "projects", setAction, setError, setMessage, task: async () => {
      setProjects(sortProjects(await window.nexus.reverse.projects.list()));
    } });
  }, []);

  const detectTarget = useCallback(async () => {
    await runReverseAction({ action: "detect", setAction, setError, setMessage, task: async () => {
      const detected = await window.nexus.reverse.target.detect(requiredInput(targetPath, "目标路径"));
      setTarget(detected);
      setMessage(targetMessage(detected));
    } });
  }, [targetPath]);

  const scanJavaScript = useCallback(async () => {
    await runReverseAction({ action: "scan", setAction, setError, setMessage, task: async () => {
      const result = await window.nexus.reverse.analysis.scan({ path: requiredInput(targetPath, "扫描路径") });
      setAnalysis(result);
      setMessage(reverseAnalysisSummary(result));
    } });
  }, [targetPath]);

  const inspectAsar = useCallback(async () => {
    await runReverseAction({ action: "inspect", setAction, setError, setMessage, task: async () => {
      const result = await window.nexus.reverse.asar.inspect({ archivePath: requiredInput(targetPath, "ASAR 路径") });
      setAsarInspect(result);
      setMessage(asarInspectSummary(result));
    } });
  }, [targetPath]);

  const extractAsar = useCallback(async () => {
    await runReverseAction({ action: "extract", setAction, setError, setMessage, task: async () => {
      const result = await window.nexus.reverse.asar.extract({
        archivePath: requiredInput(targetPath, "ASAR 路径"),
        destinationPath: requiredInput(outputPath, "输出目录")
      });
      setAsarExtract(result);
      setMessage(`已解包 ${result.extractedFiles} 个文件到 ${result.destinationPath}`);
    } });
  }, [outputPath, targetPath]);

  const packAsar = useCallback(async () => {
    await runReverseAction({ action: "pack", setAction, setError, setMessage, task: async () => {
      const result = await window.nexus.reverse.asar.pack({
        archivePath: requiredInput(outputPath, "输出 ASAR 路径"),
        sourceDirectory: requiredInput(targetPath, "源目录")
      });
      setAsarPack(result);
      setMessage(`已打包 ${result.packedFiles} 个文件到 ${result.archivePath}`);
    } });
  }, [outputPath, targetPath]);

  const diffAsar = useCallback(async () => {
    await runReverseAction({ action: "diff", setAction, setError, setMessage, task: async () => {
      const result = await window.nexus.reverse.asar.diff({
        afterPath: requiredInput(comparePath, "对比 ASAR 路径"),
        beforePath: requiredInput(targetPath, "基准 ASAR 路径")
      });
      setAsarDiff(result);
      setMessage(asarDiffSummary(result));
    } });
  }, [comparePath, targetPath]);

  const generateHook = useCallback(async () => {
    await runReverseAction({ action: "generate-hook", setAction, setError, setMessage, task: async () => {
      const result = await window.nexus.reverse.jshook.generate({
        hookFilename: optionalInput(hookFilename),
        outputDirectory: requiredInput(outputPath, "Hook 输出目录")
      });
      setHookGenerate(result);
      setMessage(`已生成 hook: ${result.hookPath}`);
    } });
  }, [hookFilename, outputPath]);

  const injectHook = useCallback(async () => {
    await runReverseAction({ action: "inject-hook", setAction, setError, setMessage, task: async () => {
      const result = await window.nexus.reverse.jshook.inject({
        entryPath: optionalInput(entryPath),
        hookFilename: optionalInput(hookFilename),
        targetPath: requiredInput(targetPath, "目标路径")
      });
      setHookInject(result);
      setBackupPath(result.backupPath);
      setEntryPath(result.entryPath);
      setMessage(`已注入 hook，备份: ${result.backupPath}`);
    } });
  }, [entryPath, hookFilename, targetPath]);

  const restoreHook = useCallback(async () => {
    await runReverseAction({ action: "restore-hook", setAction, setError, setMessage, task: async () => {
      const result = await window.nexus.reverse.jshook.restore({
        backupPath: requiredInput(backupPath, "备份路径"),
        entryPath: requiredInput(entryPath, "入口路径")
      });
      setHookRestore(result);
      setMessage(`已恢复入口文件: ${result.entryPath}`);
    } });
  }, [backupPath, entryPath]);

  const addProject = useCallback(async () => {
    await runReverseAction({ action: "add-project", setAction, setError, setMessage, task: async () => {
      const path = requiredInput(targetPath, "目标路径");
      const project = await window.nexus.reverse.projects.add({
        name: suggestedProjectName(target, path),
        notes: optionalInput(notes),
        targetPath: path
      });
      setProjects((current) => sortProjects([project, ...current.filter((item) => item.id !== project.id)]));
      setMessage(`已添加逆向项目: ${project.name}`);
    } });
  }, [notes, target, targetPath]);

  const removeProject = useCallback(async (id: string) => {
    await runReverseAction({ action: "projects", setAction, setError, setMessage, task: async () => {
      if (!await window.nexus.reverse.projects.remove(id)) throw new Error(`逆向项目不存在: ${id}`);
      setProjects((current) => current.filter((project) => project.id !== id));
      setMessage("已删除逆向项目");
    } });
  }, []);

  useEffect(() => {
    const nextPath = defaultReverseTargetPath(workspaceRoot);
    setTargetPath(nextPath);
    setOutputPath(nextPath);
    setAnalysis(null);
    setAsarDiff(null);
    setAsarExtract(null);
    setAsarInspect(null);
    setAsarPack(null);
    setTarget(null);
  }, [workspaceRoot]);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  return {
    action,
    addProject,
    analysis,
    asarDiff,
    asarExtract,
    asarInspect,
    asarPack,
    backupPath,
    comparePath,
    detectTarget,
    diffAsar,
    entryPath,
    error,
    extractAsar,
    generateHook,
    hookFilename,
    hookGenerate,
    hookInject,
    hookRestore,
    injectHook,
    inspectAsar,
    message,
    notes,
    outputPath,
    packAsar,
    pickBackupPath: pathPickers.pickBackupPath,
    pickComparePath: pathPickers.pickComparePath,
    pickEntryPath: pathPickers.pickEntryPath,
    pickOutputAsarPath: pathPickers.pickOutputAsarPath,
    pickOutputDirectory: pathPickers.pickOutputDirectory,
    pickTargetPath: pathPickers.pickTargetPath,
    projects,
    refreshProjects,
    removeProject,
    revealPath,
    restoreHook,
    scanJavaScript,
    setBackupPath,
    setComparePath,
    setEntryPath,
    setHookFilename,
    setNotes,
    setOutputPath,
    setTargetPath,
    target,
    targetPath
  };
}

async function runReverseAction(options: RunReverseActionOptions): Promise<void> {
  options.setAction(options.action);
  options.setError("");
  options.setMessage("");
  try {
    await options.task();
  } catch (error) {
    options.setError(reverseErrorMessage(error));
  } finally {
    options.setAction("");
  }
}

function requiredInput(value: string, label: string): string {
  const trimmed = value.trim();
  if (trimmed === "") throw new Error(`${label}不能为空`);
  return trimmed;
}

function optionalInput(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function sortProjects(projects: readonly ReverseProject[]): readonly ReverseProject[] {
  return [...projects].sort((left, right) => right.updatedAt - left.updatedAt);
}

function targetMessage(target: ReverseTargetDetection): string {
  const confidence = Math.round(target.confidence * PERCENT_SCALE);
  return `已识别 ${reverseTargetTypeLabel(target.type)} · 置信度 ${confidence}%`;
}
