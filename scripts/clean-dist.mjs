import { rm } from "node:fs/promises";
import { join } from "node:path";

const projectRoot = process.cwd();
const targets = [
  join(projectRoot, "dist", "contracts.js"),
  join(projectRoot, "dist", "main"),
  join(projectRoot, "dist", "preload")
];

await Promise.all(targets.map((target) => rm(target, { force: true, recursive: true })));
