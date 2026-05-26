import { access, cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const source = join(process.cwd(), "frontend", "dist");
const target = join(process.cwd(), "dist", "renderer");
const preloadSource = join(process.cwd(), "src", "preload", "preload.cjs");
const preloadTarget = join(process.cwd(), "dist", "preload", "preload.cjs");

await access(source);
await rm(target, { force: true, recursive: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
await cp(preloadSource, preloadTarget);
