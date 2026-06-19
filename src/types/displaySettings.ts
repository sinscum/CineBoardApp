export type TMDBCategoryKey =
  | "popular"
  | "now_playing"
  | "upcoming"
  | "top_rated";

export type DisplaySourceMode = "category" | "genre";
export type PosterFitMode = "contain" | "cover" | "stretch";
export type BannerMode = "auto" | "custom" | "none";

export type BannerFontPreset =
  | "Bebas Neue"
  | "Oswald"
  | "Anton"
  | "Cinzel"
  | "Orbitron"
  | "Rajdhani"
  | "Montserrat"
  | "Audiowide"
  | "Frijole"
  | "Creepster"
  | "Uncial Antiqua"
  | "IM Fell English SC"
  | "MedievalSharp"
  | "Exo 2"
  | "Michroma";

export type BannerContentKind =
  | "auto"
  | "custom"
  | "preset-coming-soon"
  | "preset-now-playing"
  | "preset-now-showing"
  | "preset-sold-out"
  | "preset-intermission"
  | "preset-closed-tonight"
  | "preset-be-right-back"
  | "preset-welcome"
  | "preset-tonight-only"
  | "preset-feature-presentation";

// Actual preset keys — excludes "auto" and "custom" which have special runtime handling
export type BannerPresetKind = Exclude<BannerContentKind, "auto" | "custom">;

export const BANNER_CONTENT_PRESETS: Record<BannerPresetKind, string> = {
  "preset-coming-soon": "COMING SOON",
  "preset-now-playing": "NOW PLAYING",
  "preset-now-showing": "NOW SHOWING",
  "preset-sold-out": "SOLD OUT",
  "preset-intermission": "INTERMISSION",
  "preset-closed-tonight": "CLOSED TONIGHT",
  "preset-be-right-back": "BE RIGHT BACK",
  "preset-welcome": "WELCOME",
  "preset-tonight-only": "TONIGHT ONLY",
  "preset-feature-presentation": "FEATURE PRESENTATION",
};

// All valid BannerContentKind values for validation
export const VALID_CONTENT_KINDS: BannerContentKind[] = [
  "auto",
  "custom",
  ...(Object.keys(BANNER_CONTENT_PRESETS) as BannerPresetKind[]),
];

export interface BannerTheme {
  id: string;
  name: string;
  builtIn: boolean;

  topFont: BannerFontPreset;
  bottomFont: BannerFontPreset;
  titleFont: BannerFontPreset;

  sideTextSize: number;
  titleTextSize: number;

  topBannerMode: BannerMode;
  bottomBannerMode: BannerMode;

  topBannerImage: string | null;
  bottomBannerImage: string | null;

  topBannerHeight: number;
  bottomBannerHeight: number;

  showTopLeft: boolean;
  showTopCenter: boolean;
  showTopRight: boolean;
  showBottomLeft: boolean;
  showBottomCenter: boolean;
  showBottomRight: boolean;

  description?: string;
}

/**
 * Per-display settings. Visual presentation (fonts, banner sizes, modes, images,
 * text visibility) lives exclusively on BannerTheme — only activeThemeId is stored
 * here so the display always reads from the current theme object.
 */
export interface DisplaySettings {
  sourceMode: DisplaySourceMode;
  category: TMDBCategoryKey;
  genreId: number;
  rotationSeconds: number;
  posterFitMode: PosterFitMode;
  theaterName: string;
  activeThemeId: string;

  // Per-zone content (auto, preset, or custom text)
  topLeftContent: BannerContentKind;
  topLeftCustomText: string;
  topCenterContent: BannerContentKind;
  topCenterCustomText: string;
  topRightContent: BannerContentKind;
  topRightCustomText: string;
  bottomLeftContent: BannerContentKind;
  bottomLeftCustomText: string;
  bottomCenterContent: BannerContentKind;
  bottomCenterCustomText: string;
  bottomRightContent: BannerContentKind;
  bottomRightCustomText: string;
}

export interface ActiveMovie {
  id: number;
  title: string;
}

export interface DisplayProfile {
  id: number;
  name: string;
  enabled: boolean;
  settings: DisplaySettings;
  activeMovie: ActiveMovie | null;
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  sourceMode: "genre",
  category: "popular",
  genreId: 27,
  rotationSeconds: 30,
  posterFitMode: "contain",
  theaterName: "CineBoard Theater",
  activeThemeId: "classic-cinema",

  topLeftContent: "auto",
  topLeftCustomText: "",
  topCenterContent: "auto",
  topCenterCustomText: "",
  topRightContent: "auto",
  topRightCustomText: "",
  bottomLeftContent: "auto",
  bottomLeftCustomText: "",
  bottomCenterContent: "auto",
  bottomCenterCustomText: "",
  bottomRightContent: "auto",
  bottomRightCustomText: "",
};

export const DEFAULT_DISPLAY_PROFILES: DisplayProfile[] = [
  {
    id: 1,
    name: "Display 1",
    enabled: true,
    settings: { ...DEFAULT_DISPLAY_SETTINGS },
    activeMovie: null,
  },
  {
    id: 2,
    name: "Display 2",
    enabled: false,
    settings: { ...DEFAULT_DISPLAY_SETTINGS },
    activeMovie: null,
  },
  {
    id: 3,
    name: "Display 3",
    enabled: false,
    settings: { ...DEFAULT_DISPLAY_SETTINGS },
    activeMovie: null,
  },
];
