import { mkdir } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import * as asar from "@electron/asar";
import type {
  ReverseAsarDiffEntry,
  ReverseAsarDiffRequest,
  ReverseAsarDiffResult,
  ReverseAsarEntry,
  ReverseAsarEntryType,
  ReverseAsarExtractRequest,
  ReverseAsarExtractResult,
  ReverseAsarInspectRequest,
  ReverseAsarInspectResult,
  ReverseAsarPackRequest,
  ReverseAsarPackResult
} from "../reverseContracts.js";

type AsarMetadata = Record<string, unknown>;

export class AsarService {
  async inspect(request: ReverseAsarInspectRequest): Promise<ReverseAsarInspectResult> {
    const archivePath = resolve(request.archivePath);
    const entries = asar.listPackage(archivePath, { isPack: false }).map((path) => {
      return toEntry(archivePath, normalizeAsarPath(path));
    });

    return summarizeInspect(archivePath, entries);
  }

  async extract(request: ReverseAsarExtractRequest): Promise<ReverseAsarExtractResult> {
    const archivePath = resolve(request.archivePath);
    const destinationPath = resolve(request.destinationPath);
    const inspected = await this.inspect({ archivePath });

    await mkdir(destinationPath, { recursive: true });
    asar.extractAll(archivePath, destinationPath);

    return { archivePath, destinationPath, extractedFiles: inspected.files };
  }

  async pack(request: ReverseAsarPackRequest): Promise<ReverseAsarPackResult> {
    const archivePath = resolve(request.archivePath);
    const sourceDirectory = resolve(request.sourceDirectory);

    await mkdir(dirname(archivePath), { recursive: true });
    await asar.createPackage(sourceDirectory, archivePath);
    const inspected = await this.inspect({ archivePath });

    return { archivePath, packedFiles: inspected.files, sourceDirectory };
  }

  async diff(request: ReverseAsarDiffRequest): Promise<ReverseAsarDiffResult> {
    const before = await this.inspect({ archivePath: request.beforePath });
    const after = await this.inspect({ archivePath: request.afterPath });
    const entries = diffEntries(fileMap(before.entries), fileMap(after.entries));

    return {
      added: countChanges(entries, "added"),
      afterPath: after.archivePath,
      beforePath: before.archivePath,
      entries,
      modified: countChanges(entries, "modified"),
      removed: countChanges(entries, "removed")
    };
  }
}

function summarizeInspect(archivePath: string, entries: readonly ReverseAsarEntry[]): ReverseAsarInspectResult {
  const files = entries.filter((entry) => entry.type === "file");
  const directories = entries.filter((entry) => entry.type === "directory");

  return {
    archivePath,
    directories: directories.length,
    entries: [...entries].sort(compareEntries),
    files: files.length,
    totalSize: files.reduce((total, entry) => total + (entry.size ?? 0), 0)
  };
}

function toEntry(archivePath: string, path: string): ReverseAsarEntry {
  const metadata = asar.statFile(archivePath, path) as AsarMetadata;
  const size = readNumber(metadata.size);

  return {
    integrityHash: readIntegrityHash(metadata),
    name: basename(path),
    path,
    size,
    type: readEntryType(metadata)
  };
}

function readEntryType(metadata: AsarMetadata): ReverseAsarEntryType {
  if (isRecord(metadata.files)) return "directory";
  if (typeof metadata.link === "string") return "link";
  return "file";
}

function diffEntries(
  before: ReadonlyMap<string, ReverseAsarEntry>,
  after: ReadonlyMap<string, ReverseAsarEntry>
): readonly ReverseAsarDiffEntry[] {
  const paths = [...new Set([...before.keys(), ...after.keys()])].sort();

  return paths.flatMap((path) => diffEntry(path, before.get(path), after.get(path)));
}

function diffEntry(
  path: string,
  before: ReverseAsarEntry | undefined,
  after: ReverseAsarEntry | undefined
): readonly ReverseAsarDiffEntry[] {
  if (before === undefined && after !== undefined) return [{ after, change: "added", path }];
  if (before !== undefined && after === undefined) return [{ before, change: "removed", path }];
  if (before !== undefined && after !== undefined && isModified(before, after)) {
    return [{ after, before, change: "modified", path }];
  }

  return [];
}

function isModified(before: ReverseAsarEntry, after: ReverseAsarEntry): boolean {
  return before.size !== after.size || before.integrityHash !== after.integrityHash;
}

function fileMap(entries: readonly ReverseAsarEntry[]): ReadonlyMap<string, ReverseAsarEntry> {
  return new Map(entries.filter((entry) => entry.type === "file").map((entry) => [entry.path, entry]));
}

function countChanges(entries: readonly ReverseAsarDiffEntry[], change: ReverseAsarDiffEntry["change"]): number {
  return entries.filter((entry) => entry.change === change).length;
}

function readIntegrityHash(metadata: AsarMetadata): string | undefined {
  const integrity = metadata.integrity;
  return isRecord(integrity) && typeof integrity.hash === "string" ? integrity.hash : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeAsarPath(path: string): string {
  return path.startsWith("/") ? path.slice(1) : path;
}

function compareEntries(left: ReverseAsarEntry, right: ReverseAsarEntry): number {
  return left.path.localeCompare(right.path);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
