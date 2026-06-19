import type {
  DisplaySettings,
  DisplayProfile,
  ActiveMovie,
  BannerContentKind,
} from "../types/displaySettings";
import {
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_DISPLAY_PROFILES,
  VALID_CONTENT_KINDS,
} from "../types/displaySettings";

const PROFILES_KEY = "cineboard.displays.profiles";
const ACTIVE_DISPLAY_KEY = "cineboard.displays.activeId";

// Legacy keys — read once for migration, then removed
const LEGACY_SETTINGS_KEY = "cineboard.display.settings";
const LEGACY_ACTIVE_MOVIE_KEY = "cineboard.activeMovie";

export const SETTINGS_CHANGED_EVENT = "cineboard-display-settings-changed";
export const ACTIVE_MOVIE_CHANGED_EVENT = "cineboard-active-movie-changed";
export const ACTIVE_DISPLAY_CHANGED_EVENT = "cineboard-active-display-changed";
export const PROFILES_CHANGED_EVENT = "cineboard-profiles-changed";

const MAX_DISPLAYS = DEFAULT_DISPLAY_PROFILES.length;

const validCategories = ["popular", "now_playing", "upcoming", "top_rated"];
const validSourceModes = ["category", "genre"];
const validPosterFitModes = ["contain", "cover", "stretch"];

// Map old fontTheme values to built-in theme IDs for one-time migration
const LEGACY_FONT_THEME_MAP: Record<string, string> = {
  auto: "classic-cinema",
  custom: "classic-cinema",
  default: "classic-cinema",
  horror: "horror-theater",
  scifi: "scifi-bridge",
  fantasy: "fantasy-realm",
  premium: "classic-cinema",
};

function clampNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

function sanitizeActiveThemeId(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !value.trim()) return fallback;
  return value;
}

function sanitizeContentKind(
  value: unknown,
  fallback: BannerContentKind
): BannerContentKind {
  if (typeof value === "string" && VALID_CONTENT_KINDS.includes(value as BannerContentKind)) {
    return value as BannerContentKind;
  }
  return fallback;
}

function sanitizeCustomText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.slice(0, 80);
}

function sanitizeSettings(parsed: any): DisplaySettings {
  let activeThemeId = parsed?.activeThemeId;
  if (!activeThemeId && parsed?.fontTheme) {
    activeThemeId = LEGACY_FONT_THEME_MAP[parsed.fontTheme] ?? "classic-cinema";
  }

  return {
    sourceMode: validSourceModes.includes(parsed?.sourceMode)
      ? parsed.sourceMode
      : DEFAULT_DISPLAY_SETTINGS.sourceMode,
    category: validCategories.includes(parsed?.category)
      ? parsed.category
      : DEFAULT_DISPLAY_SETTINGS.category,
    genreId:
      typeof parsed?.genreId === "number"
        ? parsed.genreId
        : DEFAULT_DISPLAY_SETTINGS.genreId,
    rotationSeconds: clampNumber(
      parsed?.rotationSeconds,
      DEFAULT_DISPLAY_SETTINGS.rotationSeconds,
      5,
      600
    ),
    posterFitMode: validPosterFitModes.includes(parsed?.posterFitMode)
      ? parsed.posterFitMode
      : DEFAULT_DISPLAY_SETTINGS.posterFitMode,
    theaterName:
      typeof parsed?.theaterName === "string" && parsed.theaterName.trim()
        ? parsed.theaterName
        : DEFAULT_DISPLAY_SETTINGS.theaterName,
    activeThemeId: sanitizeActiveThemeId(
      activeThemeId,
      DEFAULT_DISPLAY_SETTINGS.activeThemeId
    ),
    topLeftContent: sanitizeContentKind(
      parsed?.topLeftContent,
      DEFAULT_DISPLAY_SETTINGS.topLeftContent
    ),
    topLeftCustomText: sanitizeCustomText(parsed?.topLeftCustomText),
    topCenterContent: sanitizeContentKind(
      parsed?.topCenterContent,
      DEFAULT_DISPLAY_SETTINGS.topCenterContent
    ),
    topCenterCustomText: sanitizeCustomText(parsed?.topCenterCustomText),
    topRightContent: sanitizeContentKind(
      parsed?.topRightContent,
      DEFAULT_DISPLAY_SETTINGS.topRightContent
    ),
    topRightCustomText: sanitizeCustomText(parsed?.topRightCustomText),
    bottomLeftContent: sanitizeContentKind(
      parsed?.bottomLeftContent,
      DEFAULT_DISPLAY_SETTINGS.bottomLeftContent
    ),
    bottomLeftCustomText: sanitizeCustomText(parsed?.bottomLeftCustomText),
    bottomCenterContent: sanitizeContentKind(
      parsed?.bottomCenterContent,
      DEFAULT_DISPLAY_SETTINGS.bottomCenterContent
    ),
    bottomCenterCustomText: sanitizeCustomText(parsed?.bottomCenterCustomText),
    bottomRightContent: sanitizeContentKind(
      parsed?.bottomRightContent,
      DEFAULT_DISPLAY_SETTINGS.bottomRightContent
    ),
    bottomRightCustomText: sanitizeCustomText(parsed?.bottomRightCustomText),
  };
}

function sanitizeProfile(parsed: any, index: number): DisplayProfile {
  const def = DEFAULT_DISPLAY_PROFILES[index] ?? DEFAULT_DISPLAY_PROFILES[0];
  return {
    id: typeof parsed?.id === "number" ? parsed.id : def.id,
    name:
      typeof parsed?.name === "string" && parsed.name.trim()
        ? parsed.name
        : def.name,
    enabled: typeof parsed?.enabled === "boolean" ? parsed.enabled : def.enabled,
    settings: sanitizeSettings(parsed?.settings),
    activeMovie:
      parsed?.activeMovie &&
      typeof parsed.activeMovie.id === "number" &&
      typeof parsed.activeMovie.title === "string"
        ? { id: parsed.activeMovie.id, title: parsed.activeMovie.title }
        : null,
  };
}

function migrateLegacyData(): DisplayProfile[] {
  const profiles = DEFAULT_DISPLAY_PROFILES.map((p) => ({
    ...p,
    settings: { ...p.settings },
  }));

  try {
    const legacySettingsRaw = localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (legacySettingsRaw) {
      profiles[0].settings = sanitizeSettings(JSON.parse(legacySettingsRaw));
    }
  } catch {
    // ignore
  }

  try {
    const legacyActiveRaw = localStorage.getItem(LEGACY_ACTIVE_MOVIE_KEY);
    if (legacyActiveRaw) {
      const parsed = JSON.parse(legacyActiveRaw);
      if (
        parsed &&
        typeof parsed.id === "number" &&
        typeof parsed.title === "string"
      ) {
        profiles[0].activeMovie = { id: parsed.id, title: parsed.title };
      }
    }
  } catch {
    // ignore
  }

  // Remove legacy keys now that data has been migrated
  try {
    localStorage.removeItem(LEGACY_SETTINGS_KEY);
    localStorage.removeItem(LEGACY_ACTIVE_MOVIE_KEY);
  } catch {
    // ignore
  }

  return profiles;
}

export function loadAllProfiles(): DisplayProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) {
      const migrated = migrateLegacyData();
      saveAllProfiles(migrated);
      return migrated;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_DISPLAY_PROFILES.map((p) => ({
        ...p,
        settings: { ...p.settings },
      }));
    }

    const result: DisplayProfile[] = [];
    for (let i = 0; i < MAX_DISPLAYS; i++) {
      const candidate = parsed.find((p: any) => p?.id === i + 1) ?? parsed[i];
      result.push(sanitizeProfile(candidate, i));
      result[i].id = i + 1;
    }
    return result;
  } catch {
    return DEFAULT_DISPLAY_PROFILES.map((p) => ({
      ...p,
      settings: { ...p.settings },
    }));
  }
}

export function saveAllProfiles(profiles: DisplayProfile[]): void {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    window.dispatchEvent(new Event(PROFILES_CHANGED_EVENT));
    window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT));
  } catch {
    // ignore
  }
}

function isValidDisplayId(id: number): boolean {
  return Number.isInteger(id) && id >= 1 && id <= MAX_DISPLAYS;
}

export function getActiveDisplayId(): number {
  try {
    const raw = localStorage.getItem(ACTIVE_DISPLAY_KEY);
    if (!raw) return 1;
    const n = parseInt(raw, 10);
    return isValidDisplayId(n) ? n : 1;
  } catch {
    return 1;
  }
}

export function setActiveDisplayId(id: number): void {
  if (!isValidDisplayId(id)) return;
  try {
    localStorage.setItem(ACTIVE_DISPLAY_KEY, String(id));
    window.dispatchEvent(new Event(ACTIVE_DISPLAY_CHANGED_EVENT));
  } catch {
    // ignore
  }
}

export function loadProfile(id: number): DisplayProfile {
  const profiles = loadAllProfiles();
  const profile = profiles.find((p) => p.id === id);
  if (profile) return profile;
  return {
    ...DEFAULT_DISPLAY_PROFILES[0],
    id,
    name: `Display ${id}`,
    settings: { ...DEFAULT_DISPLAY_SETTINGS },
  };
}

export function saveProfile(profile: DisplayProfile): void {
  const profiles = loadAllProfiles();
  const idx = profiles.findIndex((p) => p.id === profile.id);
  if (idx >= 0) {
    profiles[idx] = profile;
  } else {
    profiles.push(profile);
  }
  saveAllProfiles(profiles);
}

export function loadDisplaySettings(displayId?: number): DisplaySettings {
  const id = displayId ?? getActiveDisplayId();
  return loadProfile(id).settings;
}

export function saveDisplaySettings(
  settings: DisplaySettings,
  displayId?: number
): void {
  const id = displayId ?? getActiveDisplayId();
  const profile = loadProfile(id);
  profile.settings = settings;
  saveProfile(profile);
}

export function resetDisplaySettings(displayId?: number): DisplaySettings {
  const id = displayId ?? getActiveDisplayId();
  const profile = loadProfile(id);
  profile.settings = { ...DEFAULT_DISPLAY_SETTINGS };
  saveProfile(profile);
  return profile.settings;
}

/**
 * Apply a theme to a display by ID only. All visual properties (fonts, sizes,
 * banner modes/heights/images, text visibility) are now read directly from the
 * theme object at render time — only the activeThemeId pointer is persisted.
 */
export function applyThemeToDisplay(
  themeId: string,
  displayId?: number
): void {
  const id = displayId ?? getActiveDisplayId();
  const profile = loadProfile(id);
  profile.settings.activeThemeId = themeId;
  saveProfile(profile);
}

export function getActiveMovie(displayId?: number): ActiveMovie | null {
  const id = displayId ?? getActiveDisplayId();
  return loadProfile(id).activeMovie;
}

export function setActiveMovie(
  movie: ActiveMovie | null,
  displayId?: number
): void {
  const id = displayId ?? getActiveDisplayId();
  const profile = loadProfile(id);
  profile.activeMovie = movie;
  saveProfile(profile);
  window.dispatchEvent(new Event(ACTIVE_MOVIE_CHANGED_EVENT));
}
