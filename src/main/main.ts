import { app, BrowserWindow, Menu } from "electron";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { registerIpcHandlers, sendSessionData, sendSessionExit } from "./ipc.js";
import { NexusBackend } from "./nexusBackend.js";
import { NodePtyFactory } from "./nodePtyFactory.js";
import { createRuntimeConfig } from "./runtimeConfig.js";
import { SessionManager } from "./sessionManager.js";
import { WorkspaceStateStore } from "./workspaceStateStore.js";

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(moduleDirectory, "../..");

const APPLICATION_MENU_TEMPLATE: Electron.MenuItemConstructorOptions[] = [
  {
    label: "Nexus",
    submenu: [
      { label: "关于 Nexus", role: "about" },
      { type: "separator" },
      { label: "偏好设置...", accelerator: "CmdOrCtrl+,", enabled: false },
      { type: "separator" },
      { label: "隐藏 Nexus", role: "hide" },
      { label: "隐藏其他", role: "hideOthers" },
      { label: "显示全部", role: "unhide" },
      { type: "separator" },
      { label: "退出 Nexus", role: "quit" }
    ]
  },
  {
    label: "编辑",
    submenu: [
      { label: "撤销", role: "undo" },
      { label: "重做", role: "redo" },
      { type: "separator" },
      { label: "剪切", role: "cut" },
      { label: "复制", role: "copy" },
      { label: "粘贴", role: "paste" },
      { label: "全选", role: "selectAll" }
    ]
  },
  {
    label: "视图",
    submenu: [
      { label: "重新加载", role: "reload" },
      { label: "强制重新加载", role: "forceReload" },
      { label: "开发者工具", role: "toggleDevTools" },
      { type: "separator" },
      { label: "实际大小", role: "resetZoom" },
      { label: "放大", role: "zoomIn" },
      { label: "缩小", role: "zoomOut" },
      { type: "separator" },
      { label: "全屏", role: "togglefullscreen" }
    ]
  },
  {
    label: "窗口",
    submenu: [
      { label: "最小化", role: "minimize" },
      { label: "关闭", role: "close" },
      { type: "separator" },
      { label: "前置全部窗口", role: "front" }
    ]
  },
  {
    label: "帮助",
    submenu: [
      { label: "Nexus 官网", enabled: false },
      { label: "报告问题...", enabled: false }
    ]
  }
];

let backend: NexusBackend | undefined;
let mainWindow: BrowserWindow | undefined;

await app.whenReady();
configureApplicationMenu();
mainWindow = createMainWindow();

const sessions = new SessionManager({
  onData: (sessionId, data) => {
    if (mainWindow !== undefined) {
      sendSessionData(mainWindow.webContents, sessionId, data);
    }
  },
  onExit: (sessionId, exit) => {
    backend?.handleSessionExit(sessionId, exit.exitCode);
    if (mainWindow !== undefined) {
      sendSessionExit(mainWindow.webContents, sessionId, exit.exitCode);
    }
  },
  ptyFactory: new NodePtyFactory()
});
const workspaceState = new WorkspaceStateStore();
const persistedWorkspace = workspaceState.load();
const config = createRuntimeConfig({
  appRoot,
  cwd: process.cwd(),
  env: process.env,
  homeDir: app.getPath("home"),
  persistedWorkspaceRoot: persistedWorkspace.lastWorkspaceRoot
});
backend = new NexusBackend(config, sessions, { workspaceState });
registerIpcHandlers(backend);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    height: 900,
    minHeight: 700,
    minWidth: 1000,
    title: "Nexus",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 12, y: 10 },
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(appRoot, "dist/preload/preload.cjs")
    },
    width: 1400
  });

  registerWindowDiagnostics(window);
  void window.loadFile(join(appRoot, "dist/renderer/index.html"));
  return window;
}

function configureApplicationMenu(): void {
  const menu = Menu.buildFromTemplate(APPLICATION_MENU_TEMPLATE);
  Menu.setApplicationMenu(menu);
}

function registerWindowDiagnostics(window: BrowserWindow): void {
  window.webContents.on("did-fail-load", (_event, code, description) => {
    console.error(`[nexus] renderer failed to load: ${code} ${description}`);
  });
  window.webContents.on("did-finish-load", () => {
    console.error("[nexus] renderer loaded");
  });
}
