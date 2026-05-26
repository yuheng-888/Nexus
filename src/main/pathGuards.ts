import { isAbsolute, relative, resolve } from "node:path";

export function resolveWorkspacePath(workspaceRoot: string, requestedPath = "."): string {
  const root = resolve(workspaceRoot);
  const target = resolve(root, requestedPath);
  const relation = relative(root, target);

  if (isInsideRoot(relation)) {
    return target;
  }

  throw new Error(`Path is outside workspace: ${requestedPath}`);
}

export function toWorkspaceRelativePath(workspaceRoot: string, absolutePath: string): string {
  const root = resolve(workspaceRoot);
  const target = resolveWorkspacePath(root, absolutePath);
  const relation = relative(root, target);

  return relation === "" ? "." : relation;
}

function isInsideRoot(relation: string): boolean {
  return relation === "" || (relation !== ".." && !relation.startsWith("../") && !isAbsolute(relation));
}
