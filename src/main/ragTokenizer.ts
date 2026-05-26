const MIN_TOKEN_LENGTH = 3;
const TOKEN_PATTERN = /[\p{Script=Han}]+|[a-z0-9]+/gu;

export function tokenizeForRag(value: string): readonly string[] {
  const normalized = normalizeSeparators(splitWordBoundaries(value));
  const matches = normalized.toLowerCase().match(TOKEN_PATTERN) ?? [];
  const seen = new Set<string>();

  return matches.filter((token) => keepToken(token, seen));
}

function splitWordBoundaries(value: string): string {
  return value
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

function normalizeSeparators(value: string): string {
  return value.replace(/[^A-Za-z0-9\p{Script=Han}]+/gu, " ");
}

function keepToken(token: string, seen: Set<string>): boolean {
  if (token.length < MIN_TOKEN_LENGTH && !hasHan(token)) return false;
  if (seen.has(token)) return false;
  seen.add(token);
  return true;
}

function hasHan(token: string): boolean {
  return /\p{Script=Han}/u.test(token);
}
