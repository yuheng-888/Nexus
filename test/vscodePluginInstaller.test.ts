import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import type { Plugin } from "../src/contracts.js";
import { installVsCodePlugin } from "../src/main/vscodePluginInstaller.js";

const execFileAsync = promisify(execFile);

let tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.map((root) => rm(root, { force: true, recursive: true })));
  tempRoots = [];
});

describe("installVsCodePlugin", () => {
  it("extracts a VSIX manifest and summarizes extension contributions", async () => {
    const pluginsDir = await tempDirectory("nexus-extensions-");
    const vsix = await createVsixPackage();

    const result = await installVsCodePlugin({
      fetch: async () => new Response(new Uint8Array(vsix)),
      plugin: pythonPlugin(),
      pluginsDir
    });

    const manifest = await readFile(result.manifestPath, "utf8");

    expect(result.installedPath).toBe(join(pluginsDir, "ms-python.python", "2026.5.1.vsix"));
    expect(result.extensionPath).toBe(join(pluginsDir, "ms-python.python", "extension"));
    expect(manifest).toContain("Python: Select Interpreter");
    expect(result.contributions).toMatchObject({
      activationEvents: ["onLanguage:python"],
      commands: ["Python: Select Interpreter"],
      configurationKeys: ["python.analysis.typeCheckingMode"],
      grammars: ["source.python"],
      keybindings: ["python.setInterpreter"],
      languages: ["python"],
      menus: ["commandPalette"],
      snippets: ["python"],
      themes: ["Nexus Dark"]
    });
  });
});

async function createVsixPackage(): Promise<Buffer> {
  const root = await tempDirectory("nexus-vsix-");
  const extensionRoot = join(root, "extension");
  const vsixPath = join(root, "plugin.vsix");

  await mkdir(extensionRoot, { recursive: true });
  await writeFile(join(extensionRoot, "package.json"), JSON.stringify(vsixManifest()));
  await execFileAsync("ditto", ["-c", "-k", "--keepParent", "extension", vsixPath], { cwd: root });
  return readFile(vsixPath);
}

async function tempDirectory(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempRoots.push(root);
  return root;
}

function pythonPlugin(): Plugin {
  return {
    author: "Microsoft",
    category: "Programming Languages",
    description: "Python language support",
    downloads: 1234567,
    enabled: false,
    extensionName: "python",
    icon: "🔌",
    id: "vscode:ms-python.python",
    installed: false,
    name: "Python",
    publisher: "ms-python",
    rating: 4.8,
    source: "vscode",
    version: "2026.5.1",
    vsixUrl: "https://example.com/python.vsix"
  };
}

function vsixManifest(): Record<string, unknown> {
  return {
    activationEvents: ["onLanguage:python"],
    contributes: {
      commands: [{ command: "python.setInterpreter", title: "Python: Select Interpreter" }],
      configuration: {
        properties: {
          "python.analysis.typeCheckingMode": {
            default: "basic",
            type: "string"
          }
        },
        title: "Python"
      },
      grammars: [{ language: "python", scopeName: "source.python" }],
      keybindings: [{ command: "python.setInterpreter", key: "cmd+shift+p" }],
      languages: [{ id: "python" }],
      menus: {
        commandPalette: [{ command: "python.setInterpreter" }]
      },
      snippets: [{ language: "python", path: "./snippets/python.json" }],
      themes: [{ label: "Nexus Dark", path: "./themes/nexus-dark.json" }]
    },
    name: "python",
    publisher: "ms-python",
    version: "2026.5.1"
  };
}
