export interface AgentToolCall {
  readonly arguments: Record<string, unknown>;
  readonly id: string;
  readonly name: string;
}

const TOOL_CALL_TYPE = "nexus.tool_call";

export function parseAgentToolCalls(text: string): readonly AgentToolCall[] {
  return findJsonObjects(text).reduce<AgentToolCall[]>((calls, value) => {
    const call = toToolCall(value, calls.length);
    return call === null ? calls : [...calls, call];
  }, []);
}

function findJsonObjects(text: string): readonly unknown[] {
  const values: unknown[] = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? "";
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString && char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "\"") {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") {
      start = depth === 0 ? index : start;
      depth += 1;
    }
    if (char === "}" && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) values.push(parseJson(text.slice(start, index + 1)));
    }
  }

  return values.filter((value) => value !== null);
}

function parseJson(text: string): unknown | null {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function toToolCall(value: unknown, index: number): AgentToolCall | null {
  if (!isRecord(value) || value.type !== TOOL_CALL_TYPE) return null;
  if (typeof value.name !== "string" || value.name.trim() === "") return null;

  return {
    arguments: isRecord(value.arguments) ? value.arguments : {},
    id: typeof value.id === "string" && value.id.trim() !== "" ? value.id : `tool-${index + 1}`,
    name: value.name
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
