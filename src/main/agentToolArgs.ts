export function readRequiredString(args: Record<string, unknown>, key: string): string {
  const value = readOptionalString(args, key);
  if (value === undefined) throw new Error(`Tool argument required: ${key}`);
  return value;
}

export function readOptionalString(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

export function readOptionalBoolean(args: Record<string, unknown>, key: string): boolean | undefined {
  const value = args[key];
  return typeof value === "boolean" ? value : undefined;
}

export function readLimit(args: Record<string, unknown>, defaultLimit: number, maxLimit: number): number {
  const value = args.limit;
  if (typeof value !== "number" || !Number.isFinite(value)) return defaultLimit;
  return Math.min(Math.max(Math.floor(value), 1), maxLimit);
}
