export type AppTheme = "nexus" | "pure-white" | "pure-black";

export interface ThemeOption {
  readonly description: string;
  readonly id: AppTheme;
  readonly label: string;
}

export interface ThemeTarget {
  getItem(key: string): string | null;
  setAttribute(key: string, value: string): void;
  setItem(key: string, value: string): void;
}

export const THEME_STORAGE_KEY = "nexus-theme";

export const THEME_OPTIONS: readonly ThemeOption[] = [
  { description: "现有霓虹暗色界面", id: "nexus", label: "霓虹" },
  { description: "白底黑字，弱化色彩", id: "pure-white", label: "纯白" },
  { description: "黑底白字，灰阶界面", id: "pure-black", label: "纯黑" }
];

export function resolveThemeId(value: unknown): AppTheme {
  return THEME_OPTIONS.some((option) => option.id === value) ? value as AppTheme : "nexus";
}

export function loadThemePreference(target: Pick<ThemeTarget, "getItem">): AppTheme {
  return resolveThemeId(target.getItem(THEME_STORAGE_KEY));
}

export function applyThemePreference(theme: AppTheme, target: ThemeTarget): AppTheme {
  const resolved = resolveThemeId(theme);

  target.setAttribute("data-theme", resolved);
  target.setItem(THEME_STORAGE_KEY, resolved);

  return resolved;
}

export function applySavedThemePreference(): AppTheme {
  return applyThemePreference(loadThemePreference(getBrowserThemeTarget()), getBrowserThemeTarget());
}

export function getMonacoTheme(theme: AppTheme): "vs" | "vs-dark" {
  return theme === "pure-white" ? "vs" : "vs-dark";
}

export function getBrowserThemeTarget(): ThemeTarget {
  return {
    getItem: (key) => window.localStorage.getItem(key),
    setAttribute: (key, value) => document.documentElement.setAttribute(key, value),
    setItem: (key, value) => window.localStorage.setItem(key, value)
  };
}
