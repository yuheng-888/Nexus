import { execFile } from "node:child_process";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const APP_NAME = "Nexus";
const BUNDLE_ID = "dev.nexus.ide";
const VERSION = "0.1.0";

const projectRoot = process.cwd();
const appIconSource = join(projectRoot, "assets", "icon", "Nexus.icns");
const electronApp = join(projectRoot, "node_modules", "electron", "dist", "Electron.app");
const outputApp = join(projectRoot, "dist", `${APP_NAME}.app`);
const resources = join(outputApp, "Contents", "Resources");
const macos = join(outputApp, "Contents", "MacOS");
const appResources = join(resources, "app");
const CONTRACT_FILES = [
  "contracts.js",
  "dialogContracts.js",
  "gitContracts.js",
  "languageContracts.js",
  "marketplaceContracts.js",
  "ragContracts.js",
  "reverseContracts.js",
  "shellContracts.js",
  "workflowContracts.js"
];
const RUNTIME_NODE_MODULES = [
  "@electron/asar",
  "commander",
  "concat-map",
  "fs.realpath",
  "glob",
  "inflight",
  "inherits",
  "node-pty",
  "once",
  "path-is-absolute",
  "typescript",
  "wrappy"
];

await rm(outputApp, { force: true, recursive: true });
await execFileAsync("ditto", [electronApp, outputApp]);
await updatePlist();
await writeAppResources();

console.log(outputApp);

async function updatePlist() {
  const plist = join(outputApp, "Contents", "Info.plist");
  const pairs = {
    CFBundleDisplayName: APP_NAME,
    CFBundleExecutable: "Electron",
    CFBundleIconFile: "Nexus.icns",
    CFBundleIdentifier: BUNDLE_ID,
    CFBundleName: APP_NAME,
    CFBundleShortVersionString: VERSION,
    CFBundleVersion: VERSION,
    NSMicrophoneUsageDescription: "Nexus 需要麦克风来监听语音唤醒词天枢。",
    NSSpeechRecognitionUsageDescription: "Nexus 需要语音识别来检测唤醒词天枢。"
  };

  for (const [key, value] of Object.entries(pairs)) {
    await setOrAddPlistValue(plist, key, value);
  }

  await deletePlistKey(plist, "ElectronAsarIntegrity");
}

async function setPlistValue(plist, key, value) {
  await execFileAsync("/usr/libexec/PlistBuddy", ["-c", `Set :${key} ${value}`, plist]);
}

async function setOrAddPlistValue(plist, key, value) {
  try {
    await setPlistValue(plist, key, value);
  } catch (error) {
    if (!isMissingPlistKey(error)) {
      throw error;
    }

    await execFileAsync("/usr/libexec/PlistBuddy", ["-c", `Add :${key} string ${value}`, plist]);
  }
}

async function deletePlistKey(plist, key) {
  try {
    await execFileAsync("/usr/libexec/PlistBuddy", ["-c", `Delete :${key}`, plist]);
  } catch (error) {
    if (!isMissingPlistKey(error)) {
      throw error;
    }
  }
}

function isMissingPlistKey(error) {
  return error instanceof Error && error.message.includes("Does Not Exist");
}

async function writeAppResources() {
  const appDist = join(appResources, "dist");
  const appNodeModules = join(appResources, "node_modules");

  await mkdir(appDist, { recursive: true });
  await mkdir(appNodeModules, { recursive: true });
  await Promise.all([
    cp(join(projectRoot, "dist", "main"), join(appDist, "main"), { recursive: true }),
    cp(join(projectRoot, "dist", "preload"), join(appDist, "preload"), { recursive: true }),
    cp(join(projectRoot, "dist", "renderer"), join(appDist, "renderer"), { recursive: true }),
    ...CONTRACT_FILES.map((file) => cp(join(projectRoot, "dist", file), join(appDist, file))),
    cp(appIconSource, join(resources, "Nexus.icns")),
    cp(join(projectRoot, "main.cjs"), join(appResources, "main.cjs")),
    ...RUNTIME_NODE_MODULES.map((name) => copyRuntimeModule(appNodeModules, name)),
    writeFile(join(appResources, "package.json"), appPackageJson(), "utf8")
  ]);
}

async function copyRuntimeModule(appNodeModules, name) {
  const target = targetModulePath(appNodeModules, name);
  await mkdir(dirname(target), { recursive: true });
  return cp(sourceModulePath(name), target, { recursive: true });
}

function sourceModulePath(name) {
  return join(projectRoot, "node_modules", ...name.split("/"));
}

function targetModulePath(appNodeModules, name) {
  return join(appNodeModules, ...name.split("/"));
}

function appPackageJson() {
  return JSON.stringify(
    {
      main: "main.cjs",
      name: "nexus",
      private: true,
      type: "module",
      version: VERSION
    },
    null,
    2
  );
}
