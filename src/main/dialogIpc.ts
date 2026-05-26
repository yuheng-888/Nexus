import { dialog, ipcMain } from "electron";
import type { DialogPathPickRequest } from "../dialogContracts.js";
import { pickDialogPath } from "./dialogPathPicker.js";

export function registerDialogHandlers(): void {
  ipcMain.handle("nexus:dialog:pickPath", (_event, request: DialogPathPickRequest) => {
    return pickDialogPath(dialog, request);
  });
}
