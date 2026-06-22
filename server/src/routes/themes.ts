import { Router } from "express";
import { db, nowMs } from "../db.js";
import type {
  BannerTheme,
  BannerFontPreset,
  BannerMode,
  ErrorResponse,
} from "../types.js";

const router = Router();

// =============================================================
// Built-in themes (canonical list, mirrors frontend services/themes.ts)
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

// =============================================================
// Validation helpers
// =============================================================

const validFonts: BannerFontPreset[] = [
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

const validBannerModes: BannerMode[] = ["auto", "custom", "none"];

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
  if (
    !parsed ||
    typeof parsed.id !== "string" ||
    typeof parsed.name !== "string"
  ) {
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
    showTopLeft:
      typeof parsed.showTopLeft === "boolean" ? parsed.showTopLeft : true,
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
    description:
      typeof parsed.description === "string" ? parsed.description : undefined,
  };
}

// =============================================================
// DB-backed reads
// =============================================================

interface CustomThemeRow {
  id: string;
  name: string;
  theme_json: string;
  created_at: number;
  updated_at: number;
}

interface BuiltInOverrideRow {
  builtin_id: string;
  theme_json: string;
  updated_at: number;
}

function loadCustomThemes(): BannerTheme[] {
  const rows = db
    .prepare("SELECT * FROM custom_themes ORDER BY name ASC")
    .all() as CustomThemeRow[];

  const themes: BannerTheme[] = [];
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.theme_json);
      const sanitized = sanitizeTheme(parsed, false);
      if (sanitized) themes.push(sanitized);
    } catch {
      // skip corrupted rows silently
    }
  }
  return themes;
}

function loadBuiltInOverrides(): Record<string, BannerTheme> {
  const rows = db
    .prepare("SELECT * FROM builtin_theme_overrides")
    .all() as BuiltInOverrideRow[];

  const map: Record<string, BannerTheme> = {};
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.theme_json);
      const sanitized = sanitizeTheme(parsed, true);
      if (sanitized && sanitized.id === row.builtin_id) {
        map[row.builtin_id] = sanitized;
      }
    } catch {
      // skip corrupted rows silently
    }
  }
  return map;
}

function getEffectiveBuiltIns(): BannerTheme[] {
  const overrides = loadBuiltInOverrides();
  return BUILT_IN_THEMES.map((t) => {
    const override = overrides[t.id];
    if (!override) return t;
    // Preserve original name + description; user only customizes the look
    return { ...override, name: t.name, description: t.description };
  });
}

function isBuiltInModified(id: string): boolean {
  const row = db
    .prepare("SELECT 1 FROM builtin_theme_overrides WHERE builtin_id = ?")
    .get(id);
  return Boolean(row);
}

// =============================================================
// Routes
// =============================================================

/**
 * GET /api/themes
 *
 * Returns built-ins (with overrides applied) + custom themes
 * + a list of which built-ins have been modified.
 */
router.get("/", (_req, res) => {
  const builtIns = getEffectiveBuiltIns();
  const customs = loadCustomThemes();
  const overrideIds = builtIns.filter((t) => isBuiltInModified(t.id)).map(
    (t) => t.id
  );

  res.json({
    builtIn: builtIns,
    custom: customs,
    modifiedBuiltInIds: overrideIds,
  });
});

/**
 * GET /api/themes/builtin
 * Just the built-ins (with overrides applied).
 */
router.get("/builtin", (_req, res) => {
  res.json(getEffectiveBuiltIns());
});

/**
 * GET /api/themes/builtin/originals
 * The unmodified built-ins (useful for "Restore" preview).
 */
router.get("/builtin/originals", (_req, res) => {
  res.json(BUILT_IN_THEMES);
});

/**
 * GET /api/themes/custom
 * Just the custom themes.
 */
router.get("/custom", (_req, res) => {
  res.json(loadCustomThemes());
});

/**
 * GET /api/themes/:id
 * Single theme by id. Tries built-ins first, then customs.
 */
router.get("/:id", (req, res) => {
  const id = req.params.id;

  const builtIn = getEffectiveBuiltIns().find((t) => t.id === id);
  if (builtIn) {
    res.json(builtIn);
    return;
  }

  const customs = loadCustomThemes();
  const custom = customs.find((t) => t.id === id);
  if (custom) {
    res.json(custom);
    return;
  }

  const err: ErrorResponse = {
    error: "theme_not_found",
    detail: `No theme with id "${id}"`,
  };
  res.status(404).json(err);
});

// Tag `nowMs` as intentionally available for the upcoming write phase.
void nowMs;

export default router;