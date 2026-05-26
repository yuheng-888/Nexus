import type { FileFilter, OpenDialogOptions, SaveDialogOptions } from "electron";
import type {
  DialogPathFilter,
  DialogPathPickMode,
  DialogPathPickRequest,
  DialogPathPickResult
} from "../dialogContracts.js";

export interface DialogBridge {
  showOpenDialog(options: OpenDialogOptions): Promise<{ canceled: boolean; filePaths: string[] }>;
  showSaveDialog(options: SaveDialogOptions): Promise<{ canceled: boolean; filePath?: string }>;
}

export function dialogPropertiesForMode(mode: DialogPathPickMode): OpenDialogOptions["properties"] {
  if (mode === "file") return ["openFile"];
  if (mode === "directory") return ["openDirectory"];
  if (mode === "file-or-directory") return ["openFile", "openDirectory"];
  if (mode === "save-file") return [];
  throw new Error(`Unsupported dialog path pick mode: ${String(mode)}`);
}

export function shouldUseSaveDialog(mode: DialogPathPickMode): boolean {
  return mode === "save-file";
}

export async function pickDialogPath(
  bridge: DialogBridge,
  request: DialogPathPickRequest
): Promise<DialogPathPickResult> {
  assertPathPickRequest(request);
  if (shouldUseSaveDialog(request.mode)) return pickSavePath(bridge, request);
  return pickOpenPath(bridge, request);
}

async function pickOpenPath(
  bridge: DialogBridge,
  request: DialogPathPickRequest
): Promise<DialogPathPickResult> {
  const result = await bridge.showOpenDialog(openOptions(request));
  if (result.canceled) return canceledResult();
  return selectedResult(result.filePaths[0]);
}

async function pickSavePath(
  bridge: DialogBridge,
  request: DialogPathPickRequest
): Promise<DialogPathPickResult> {
  const result = await bridge.showSaveDialog(saveOptions(request));
  if (result.canceled) return canceledResult();
  return selectedResult(result.filePath);
}

function openOptions(request: DialogPathPickRequest): OpenDialogOptions {
  return {
    buttonLabel: request.buttonLabel,
    defaultPath: request.defaultPath,
    filters: normalizeFilters(request.filters),
    properties: dialogPropertiesForMode(request.mode),
    title: request.title
  };
}

function saveOptions(request: DialogPathPickRequest): SaveDialogOptions {
  return {
    buttonLabel: request.buttonLabel,
    defaultPath: request.defaultPath,
    filters: normalizeFilters(request.filters),
    title: request.title
  };
}

function assertPathPickRequest(request: DialogPathPickRequest): void {
  if (!isPathPickMode(request.mode)) {
    throw new Error(`Unsupported dialog path pick mode: ${String(request.mode)}`);
  }
}

function isPathPickMode(mode: unknown): mode is DialogPathPickMode {
  return mode === "directory" || mode === "file" || mode === "file-or-directory" || mode === "save-file";
}

function normalizeFilters(filters: readonly DialogPathFilter[] | undefined): FileFilter[] | undefined {
  if (filters === undefined) return undefined;
  return filters.map((filter) => ({ extensions: [...filter.extensions], name: filter.name }));
}

function canceledResult(): DialogPathPickResult {
  return { canceled: true, path: null };
}

function selectedResult(path: string | undefined): DialogPathPickResult {
  if (path === undefined) throw new Error("Dialog completed without a selected path");
  return { canceled: false, path };
}
