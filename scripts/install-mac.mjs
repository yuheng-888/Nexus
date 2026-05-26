import { execFile } from "node:child_process";
import { rm } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const source = "dist/Nexus.app";
const target = "/Applications/Nexus.app";

await rm(target, { force: true, recursive: true });
await execFileAsync("ditto", [source, target]);

try {
  await execFileAsync("xattr", ["-dr", "com.apple.quarantine", target]);
} catch (error) {
  if (!isNoAttributeError(error)) {
    throw error;
  }
}

console.log(`installed:${target}`);

function isNoAttributeError(error) {
  return error instanceof Error && error.message.includes("No such xattr");
}
