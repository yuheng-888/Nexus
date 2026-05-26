import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";

await rm("dist-packaged/Nexus-darwin-arm64", { force: true, recursive: true });
await run("npx", [
  "electron-packager",
  ".",
  "Nexus",
  "--platform=darwin",
  "--arch=arm64",
  "--out=dist-packaged",
  "--overwrite",
  "--prune=true",
  "--asar=false",
  "--ignore=^/test($|/)",
  "--ignore=^/frontend($|/)",
  "--ignore=^/docs($|/)",
  "--ignore=^/dist-packaged($|/)",
  "--ignore=^/dist/Nexus\\.app($|/)",
  "--ignore=^/dist/mac-arm64($|/)"
]);

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code}`));
    });
  });
}
