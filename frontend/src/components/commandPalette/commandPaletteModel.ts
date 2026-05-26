export interface CommandPaletteItem {
  readonly category: string;
  readonly id: string;
  readonly keywords?: readonly string[];
  readonly run: () => Promise<void> | void;
  readonly shortcut?: string;
  readonly title: string;
}

interface ShortcutLikeEvent {
  readonly ctrlKey: boolean;
  readonly key: string;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
}

export function isCommandPaletteShortcut(event: ShortcutLikeEvent): boolean {
  return (event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "p";
}

export function filterCommandPaletteItems(
  items: readonly CommandPaletteItem[],
  query: string
): readonly CommandPaletteItem[] {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return items;

  return items.filter((item) => matchesTokens(searchText(item), tokens));
}

export async function runCommandPaletteItem(item: CommandPaletteItem): Promise<void> {
  await item.run();
}

function queryTokens(query: string): readonly string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function matchesTokens(text: string, tokens: readonly string[]): boolean {
  return tokens.every((token) => text.includes(token));
}

function searchText(item: CommandPaletteItem): string {
  return [
    item.category,
    item.id,
    item.shortcut ?? "",
    item.title,
    ...(item.keywords ?? [])
  ].join(" ").toLowerCase();
}
