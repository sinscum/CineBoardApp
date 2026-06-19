import type { BannerTheme } from "../types/displaySettings";

const CUSTOM_THEMES_KEY = "cineboard.themes.custom";
const BUILTIN_OVERRIDES_KEY = "cineboard.themes.builtinOverrides";
export const THEMES_CHANGED_EVENT = "cineboard-themes-changed";

// =============================================================
// Built-in themes
// =============================================================

export const BUILT_IN_THEMES: BannerTheme[] = [
  {
    id: "classic-cinema",
    name: "Classic Cinema",
    builtIn: true,
    description: "Polished premium look with timeless type",
    topFont: "Bebas Neue",
    bottomFont: "Montserrat",
    titleFont: "Cinzel",
    sideTextSize: 22,
    titleTextSize: 42,
    topBannerMode: "auto",
    bottomBannerMode: "auto",
    topBannerImage: null,
    bottomBannerImage: null,
    topBannerHeight: 90,
    bottomBannerHeight: 110,
    showTopLeft: true,
    showTopCenter: true,
    showTopRight: true,
    showBottomLeft: true,
    showBottomCenter: true,
    showBottomRight: true,
  },
  {
    id: "horror-theater",
    name: "Horror Theater",
    builtIn: true,
    description: "Dark, dripping, drive-in horror vibes",
    topFont: "Frijole",
    bottomFont: "Montserrat",
    titleFont: "Creepster",
    sideTextSize: 22,
    titleTextSize: 48,
    topBannerMode: "auto",
    bottomBannerMode: "auto",
    topBannerImage: null,
    bottomBannerImage: null,
    topBannerHeight: 90,
    bottomBannerHeight: 120,
    showTopLeft: true,
    showTopCenter: true,
    showTopRight: true,
    showBottomLeft: true,
    showBottomCenter: true,
    showBottomRight: true,
  },
  {
    id: "scifi-bridge",
    name: "Sci-Fi Bridge",
    builtIn: true,
    description: "Futuristic ship-bridge display",
    topFont: "Orbitron",
    bottomFont: "Rajdhani",
    titleFont: "Audiowide",
    sideTextSize: 22,
    titleTextSize: 40,
    topBannerMode: "auto",
    bottomBannerMode: "auto",
    topBannerImage: null,
    bottomBannerImage: null,
    topBannerHeight: 90,
    bottomBannerHeight: 110,
    showTopLeft: true,
    showTopCenter: true,
    showTopRight: true,
    showBottomLeft: true,
    showBottomCenter: true,
    showBottomRight: true,
  },
  {
    id: "fantasy-realm",
    name: "Fantasy Realm",
    builtIn: true,
    description: "Medieval gold and parchment",
    topFont: "Uncial Antiqua",
    bottomFont: "IM Fell English SC",
    titleFont: "Cinzel",
    sideTextSize: 22,
    titleTextSize: 44,
    topBannerMode: "auto",
    bottomBannerMode: "auto",
    topBannerImage: null,
    bottomBannerImage: null,
    topBannerHeight: 95,
    bottomBannerHeight: 115,
    showTopLeft: true,
    showTopCenter: true,
    showTopRight: true,
    showBottomLeft: true,
    showBottomCenter: true,
    showBottomRight: true,
  },
  {
    id: "modern-marquee",
    name: "Modern Marquee",
    builtIn: true,
    description: "Minimalist bold theater marquee",
    topFont: "Oswald",
    bottomFont: "Montserrat",
    titleFont: "Anton",
    sideTextSize: 22,
    titleTextSize: 46,
    topBannerMode: "auto",
    bottomBannerMode: "auto",
    topBannerImage: null,
    bottomBannerImage: null,
    topBannerHeight: 85,
    bottomBannerHeight: 105,
    showTopLeft: true,
    showTopCenter: true,
    showTopRight: true,
    showBottomLeft: true,
    showBottomCenter: true,
    showBottomRight: true,
  },
  {
    id: "drive-in",
    name: "Drive-In Diner",
    builtIn: true,
    description: "Retro vintage cinema with attitude",
    topFont: "Frijole",
    bottomFont: "Montserrat",
    titleFont: "Bebas Neue",
    sideTextSize: 22,
    titleTextSize: 44,
    topBannerMode: "auto",
    bottomBannerMode: "auto",
    topBannerImage: null,
    bottomBannerImage: null,
    topBannerHeight: 95,
    bottomBannerHeight: 110,
    showTopLeft: true,
    showTopCenter: true,
    showTopRight: true,
    showBottomLeft: true,
    showBottomCenter: true,
    showBottomRight: true,
  },
];

const validFonts: BannerTheme["topFont"][] = [
  "Bebas Neue",
  "Oswald",
  "Anton",
  "Cinzel",
  "Orbitron",
  "Rajdhani",
  "Montserrat",
  "Audiowide",
  "Frijole",
  "Creepster",
  "Uncial Antiqua",
  "IM Fell English SC",
  "MedievalSharp",
  "Exo 2",
  "Michroma",
];

const validBannerModes: BannerTheme["topBannerMode"][] = [
  "auto",
  "custom",
  "none",
];

function clampNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

function sanitizeTheme(parsed: any, builtIn: boolean): BannerTheme | null {
  if (!parsed || typeof parsed.id !== "string" || typeof parsed.name !== "string") {
    return null;
  }
  return {
    id: parsed.id,
    name: parsed.name.trim() || "Untitled Theme",
    builtIn,
    topFont: validFonts.includes(parsed.topFont) ? parsed.topFont : "Oswald",
    bottomFont: validFonts.includes(parsed.bottomFont)
      ? parsed.bottomFont
      : "Montserrat",
    titleFont: validFonts.includes(parsed.titleFont)
      ? parsed.titleFont
      : "Bebas Neue",
    sideTextSize: clampNumber(parsed.sideTextSize, 22, 14, 48),
    titleTextSize: clampNumber(parsed.titleTextSize, 40, 22, 80),
    topBannerMode: validBannerModes.includes(parsed.topBannerMode)
      ? parsed.topBannerMode
      : "auto",
    bottomBannerMode: validBannerModes.includes(parsed.bottomBannerMode)
      ? parsed.bottomBannerMode
      : "auto",
    topBannerImage:
      typeof parsed.topBannerImage === "string" ? parsed.topBannerImage : null,
    bottomBannerImage:
      typeof parsed.bottomBannerImage === "string"
        ? parsed.bottomBannerImage
        : null,
    topBannerHeight: clampNumber(parsed.topBannerHeight, 90, 40, 300),
    bottomBannerHeight: clampNumber(parsed.bottomBannerHeight, 110, 40, 300),
    showTopLeft: typeof parsed.showTopLeft === "boolean" ? parsed.showTopLeft : true,
    showTopCenter:
      typeof parsed.showTopCenter === "boolean" ? parsed.showTopCenter : true,
    showTopRight:
      typeof parsed.showTopRight === "boolean" ? parsed.showTopRight : true,
    showBottomLeft:
      typeof parsed.showBottomLeft === "boolean" ? parsed.showBottomLeft : true,
    showBottomCenter:
      typeof parsed.showBottomCenter === "boolean"
        ? parsed.showBottomCenter
        : true,
    showBottomRight:
      typeof parsed.showBottomRight === "boolean"
        ? parsed.showBottomRight
        : true,
    description: typeof parsed.description === "string" ? parsed.description : undefined,
  };
}

// =============================================================
// Custom theme storage
// =============================================================

export function loadCustomThemes(): BannerTheme[] {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((t) => sanitizeTheme(t, false))
      .filter((t): t is BannerTheme => t !== null);
  } catch {
    return [];
  }
}

export function saveCustomThemes(themes: BannerTheme[]): void {
  try {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
    window.dispatchEvent(new Event(THEMES_CHANGED_EVENT));
  } catch {
    // ignore
  }
}

export function addCustomTheme(theme: BannerTheme): BannerTheme {
  const themes = loadCustomThemes();
  const finalTheme: BannerTheme = {
    ...theme,
    builtIn: false,
    id: theme.id.startsWith("user-")
      ? theme.id
      : `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  themes.push(finalTheme);
  saveCustomThemes(themes);
  return finalTheme;
}

export function updateCustomTheme(theme: BannerTheme): void {
  const themes = loadCustomThemes();
  const idx = themes.findIndex((t) => t.id === theme.id);
  if (idx >= 0) {
    themes[idx] = { ...theme, builtIn: false };
    saveCustomThemes(themes);
  }
}

export function deleteCustomTheme(id: string): void {
  const themes = loadCustomThemes().filter((t) => t.id !== id);
  saveCustomThemes(themes);
}

// =============================================================
// Built-in theme overrides (edit-in-place layer)
// =============================================================

function loadBuiltInOverrides(): Record<string, BannerTheme> {
  try {
    const raw = localStorage.getItem(BUILTIN_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const result: Record<string, BannerTheme> = {};
    for (const [id, theme] of Object.entries(parsed)) {
      const sanitized = sanitizeTheme(theme, true);
      if (sanitized && sanitized.id === id) {
        result[id] = sanitized;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function saveBuiltInOverrides(map: Record<string, BannerTheme>): void {
  try {
    localStorage.setItem(BUILTIN_OVERRIDES_KEY, JSON.stringify(map));
    window.dispatchEvent(new Event(THEMES_CHANGED_EVENT));
  } catch {
    // ignore
  }
}

/**
 * Save user edits to a built-in theme.
 * The default stays untouched in BUILT_IN_THEMES — this just overlays a patch.
 */
export function updateBuiltInTheme(theme: BannerTheme): void {
  const original = BUILT_IN_THEMES.find((t) => t.id === theme.id);
  if (!original) return; // not actually a built-in id
  const overrides = loadBuiltInOverrides();
  // Keep the original name and description — only customize the look
  overrides[theme.id] = {
    ...theme,
    builtIn: true,
    name: original.name,
    description: original.description,
  };
  saveBuiltInOverrides(overrides);
}

/**
 * Restore a built-in theme to its original default by removing the override.
 */
export function restoreBuiltInTheme(id: string): void {
  const overrides = loadBuiltInOverrides();
  if (overrides[id]) {
    delete overrides[id];
    saveBuiltInOverrides(overrides);
  }
}

/**
 * Check whether a built-in theme has been modified by the user.
 */
export function isBuiltInModified(id: string): boolean {
  const overrides = loadBuiltInOverrides();
  return Boolean(overrides[id]);
}

/**
 * Get the original (unmodified) version of a built-in theme.
 */
export function getBuiltInOriginal(id: string): BannerTheme | null {
  return BUILT_IN_THEMES.find((t) => t.id === id) ?? null;
}

// =============================================================
// Lookup helpers
// =============================================================

/**
 * Get the effective version of all built-in themes,
 * applying any user overrides on top of the defaults.
 */
function getEffectiveBuiltIns(): BannerTheme[] {
  const overrides = loadBuiltInOverrides();
  return BUILT_IN_THEMES.map((t) => overrides[t.id] ?? t);
}

export function getAllThemes(): BannerTheme[] {
  return [...getEffectiveBuiltIns(), ...loadCustomThemes()];
}

export function getThemeById(id: string): BannerTheme | null {
  if (!id) return null;
  const all = getAllThemes();
  return all.find((t) => t.id === id) ?? null;
}

export function getActiveTheme(
  activeThemeId: string | undefined | null
): BannerTheme {
  if (activeThemeId) {
    const found = getThemeById(activeThemeId);
    if (found) return found;
  }
  return getEffectiveBuiltIns()[0];
}