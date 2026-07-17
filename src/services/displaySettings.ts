import type {
  DisplaySettings,
  DisplayProfile,
  ActiveMovie,
  BannerContentKind,
  DisplaySourceMode,
  TMDBSortByKey,
  YearBucketKey,
  MediaConnectionConfig,
} from "../types/displaySettings";
import {
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_DISPLAY_PROFILES,
  BANNER_CONTENT_PRESETS,
} from "../types/displaySettings";
import { getThemeById } from "./themes";

const PROFILES_KEY = "cineboard.displays.profiles";
const ACTIVE_DISPLAY_KEY = "cineboard.displays.activeId";

const LEGACY_SETTINGS_KEY = "cineboard.display.settings";
const LEGACY_ACTIVE_MOVIE_KEY = "cineboard.activeMovie";

export const SETTINGS_CHANGED_EVENT = "cineboard-display-settings-changed";
export const ACTIVE_MOVIE_CHANGED_EVENT = "cineboard-active-movie-changed";
export const ACTIVE_DISPLAY_CHANGED_EVENT = "cineboard-active-display-changed";
export const PROFILES_CHANGED_EVENT = "cineboard-profiles-changed";

const validCategories = ["popular", "now_playing", "upcoming", "top_rated"];
const validSourceModes: DisplaySourceMode[] = [
  "category",
  "genre",
  "filters",
  "collection",
];
const validPosterFitModes = ["contain", "cover", "stretch"];
const validBannerModes = ["auto", "custom", "none"];
const validFonts = [
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

const validSortBy: TMDBSortByKey[] = [
  "popularity.desc",
  "primary_release_date.desc",
  "vote_average.desc",
  "vote_count.desc",
];

const validYearBuckets: YearBucketKey[] = [
  "all",
  "2020s",
  "2010s",
  "2000s",
  "1990s",
  "1980s",
  "1970s",
  "pre-1970",
];

const validLanguages = [
  "all",
  "en",
  "es",
  "fr",
  "de",
  "it",
  "ja",
  "ko",
  "zh",
  "hi",
];

const validContentKinds = Object.keys(BANNER_CONTENT_PRESETS);

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
  if (typeof value === "string" && validContentKinds.includes(value)) {
    return value as BannerContentKind;
  }
  return fallback;
}

function sanitizeCustomText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.slice(0, 80);
}

function sanitizeYearBucket(value: unknown): YearBucketKey {
  if (
    typeof value === "string" &&
    validYearBuckets.includes(value as YearBucketKey)
  ) {
    return value as YearBucketKey;
  }
  return "all";
}

function sanitizeLanguage(value: unknown): string {
  if (typeof value === "string" && validLanguages.includes(value)) {
    return value;
  }
  return "all";
}

function sanitizeSortBy(value: unknown): TMDBSortByKey {
  if (
    typeof value === "string" &&
    validSortBy.includes(value as TMDBSortByKey)
  ) {
    return value as TMDBSortByKey;
  }
  return "popularity.desc";
}

function sanitizeMinRating(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  if (value <= 0) return 0;
  if (value < 6.5) return 6;
  if (value < 7.25) return 7;
  if (value < 7.75) return 7.5;
  if (value < 8.25) return 8;
  return 8.5;
}

function sanitizeNullableNumber(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  if (value <= 0) return null;
  return Math.floor(value);
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

    filterGenreId: sanitizeNullableNumber(parsed?.filterGenreId),
    filterYearBucket: sanitizeYearBucket(parsed?.filterYearBucket),
    filterLanguage: sanitizeLanguage(parsed?.filterLanguage),
    filterSortBy: sanitizeSortBy(parsed?.filterSortBy),
    filterMinRating: sanitizeMinRating(parsed?.filterMinRating),

    collectionId: sanitizeNullableNumber(parsed?.collectionId),
    collectionName:
      typeof parsed?.collectionName === "string"
        ? parsed.collectionName.slice(0, 120)
        : "",

    topBannerHeight: clampNumber(
      parsed?.topBannerHeight,
      DEFAULT_DISPLAY_SETTINGS.topBannerHeight,
      40,
      300
    ),
    bottomBannerHeight: clampNumber(
      parsed?.bottomBannerHeight,
      DEFAULT_DISPLAY_SETTINGS.bottomBannerHeight,
      40,
      300
    ),
    topBannerMode: validBannerModes.includes(parsed?.topBannerMode)
      ? parsed.topBannerMode
      : DEFAULT_DISPLAY_SETTINGS.topBannerMode,
    bottomBannerMode: validBannerModes.includes(parsed?.bottomBannerMode)
      ? parsed.bottomBannerMode
      : DEFAULT_DISPLAY_SETTINGS.bottomBannerMode,
    topBannerImage:
      typeof parsed?.topBannerImage === "string" ? parsed.topBannerImage : null,
    bottomBannerImage:
      typeof parsed?.bottomBannerImage === "string"
        ? parsed.bottomBannerImage
        : null,
    theaterName:
      typeof parsed?.theaterName === "string" && parsed.theaterName.trim()
        ? parsed.theaterName
        : DEFAULT_DISPLAY_SETTINGS.theaterName,

    activeThemeId: sanitizeActiveThemeId(
      activeThemeId,
      DEFAULT_DISPLAY_SETTINGS.activeThemeId
    ),

    topFont: validFonts.includes(parsed?.topFont)
      ? parsed.topFont
      : DEFAULT_DISPLAY_SETTINGS.topFont,
    bottomFont: validFonts.includes(parsed?.bottomFont)
      ? parsed.bottomFont
      : DEFAULT_DISPLAY_SETTINGS.bottomFont,
    titleFont: validFonts.includes(parsed?.titleFont)
      ? parsed.titleFont
      : DEFAULT_DISPLAY_SETTINGS.titleFont,
    sideTextSize: clampNumber(
      parsed?.sideTextSize,
      DEFAULT_DISPLAY_SETTINGS.sideTextSize,
      14,
      48
    ),
    titleTextSize: clampNumber(
      parsed?.titleTextSize,
      DEFAULT_DISPLAY_SETTINGS.titleTextSize,
      22,
      80
    ),
    showTopLeft:
      typeof parsed?.showTopLeft === "boolean"
        ? parsed.showTopLeft
        : DEFAULT_DISPLAY_SETTINGS.showTopLeft,
    showTopCenter:
      typeof parsed?.showTopCenter === "boolean"
        ? parsed.showTopCenter
        : DEFAULT_DISPLAY_SETTINGS.showTopCenter,
    showTopRight:
      typeof parsed?.showTopRight === "boolean"
        ? parsed.showTopRight
        : DEFAULT_DISPLAY_SETTINGS.showTopRight,
    showBottomLeft:
      typeof parsed?.showBottomLeft === "boolean"
        ? parsed.showBottomLeft
        : DEFAULT_DISPLAY_SETTINGS.showBottomLeft,
    showBottomCenter:
      typeof parsed?.showBottomCenter === "boolean"
        ? parsed.showBottomCenter
        : DEFAULT_DISPLAY_SETTINGS.showBottomCenter,
    showBottomRight:
      typeof parsed?.showBottomRight === "boolean"
        ? parsed.showBottomRight
        : DEFAULT_DISPLAY_SETTINGS.showBottomRight,

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
  const profiles = [
    ...DEFAULT_DISPLAY_PROFILES.map((p) => ({
      ...p,
      settings: { ...p.settings },
    })),
  ];

  try {
    const legacySettingsRaw = localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (legacySettingsRaw) {
      const parsed = JSON.parse(legacySettingsRaw);
      profiles[0].settings = sanitizeSettings(parsed);
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
    for (let i = 0; i < 3; i++) {
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

export function getActiveDisplayId(): number {
  try {
    const raw = localStorage.getItem(ACTIVE_DISPLAY_KEY);
    if (!raw) return 1;
    const n = parseInt(raw, 10);
    if (n === 1 || n === 2 || n === 3) return n;
    return 1;
  } catch {
    return 1;
  }
}

export function setActiveDisplayId(id: number): void {
  if (id !== 1 && id !== 2 && id !== 3) return;
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
  const profile = loadProfile(id);
  return profile.settings;
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

export function applyThemeToDisplay(
  themeId: string,
  displayId?: number
): void {
  const id = displayId ?? getActiveDisplayId();
  const profile = loadProfile(id);
  const theme = getThemeById(themeId);

  profile.settings.activeThemeId = themeId;

  if (theme) {
    profile.settings.topFont = theme.topFont;
    profile.settings.bottomFont = theme.bottomFont;
    profile.settings.titleFont = theme.titleFont;
    profile.settings.sideTextSize = theme.sideTextSize;
    profile.settings.titleTextSize = theme.titleTextSize;
    profile.settings.topBannerMode = theme.topBannerMode;
    profile.settings.bottomBannerMode = theme.bottomBannerMode;
    profile.settings.topBannerImage = theme.topBannerImage;
    profile.settings.bottomBannerImage = theme.bottomBannerImage;
    profile.settings.topBannerHeight = theme.topBannerHeight;
    profile.settings.bottomBannerHeight = theme.bottomBannerHeight;
    profile.settings.showTopLeft = theme.showTopLeft;
    profile.settings.showTopCenter = theme.showTopCenter;
    profile.settings.showTopRight = theme.showTopRight;
    profile.settings.showBottomLeft = theme.showBottomLeft;
    profile.settings.showBottomCenter = theme.showBottomCenter;
    profile.settings.showBottomRight = theme.showBottomRight;
  }

  saveProfile(profile);
}

export function getActiveMovie(displayId?: number): ActiveMovie | null {
  const id = displayId ?? getActiveDisplayId();
  const profile = loadProfile(id);
  return profile.activeMovie;
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

export function loadMediaConnections(): MediaConnectionConfig {
  try {
    const raw = localStorage.getItem("cineboard.media.connections");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveMediaConnections(config: MediaConnectionConfig): void {
  localStorage.setItem("cineboard.media.connections", JSON.stringify(config));
}
