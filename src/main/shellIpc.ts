import { ipcMain, shell } from "electron";
import { ShellService } from "./shellService.js";

const shellService = new ShellService({ bridge: shell });

export function registerShellHandlers(): void {
  ipcMain.handle("nexus:shell:revealPath", (_event, path: string) => shellService.revealPath(path));
}
