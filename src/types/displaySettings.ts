export type TMDBCategoryKey =
  | "popular"
  | "now_playing"
  | "upcoming"
  | "top_rated";

export type DisplaySourceMode =
  | "category"
  | "genre"
  | "filters"
  | "collection";

export type PosterFitMode = "contain" | "cover" | "stretch";
export type BannerMode = "auto" | "custom" | "none";

export type TMDBSortByKey =
  | "popularity.desc"
  | "primary_release_date.desc"
  | "vote_average.desc"
  | "vote_count.desc";

export type YearBucketKey =
  | "all"
  | "2020s"
  | "2010s"
  | "2000s"
  | "1990s"
  | "1980s"
  | "1970s"
  | "pre-1970";

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

export const BANNER_CONTENT_PRESETS: Record<BannerContentKind, string> = {
  auto: "",
  custom: "",
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

export interface DisplaySettings {
  sourceMode: DisplaySourceMode;
  category: TMDBCategoryKey;
  genreId: number;
  rotationSeconds: number;
  posterFitMode: PosterFitMode;

  filterGenreId: number | null;
  filterYearBucket: YearBucketKey;
  filterLanguage: string;
  filterSortBy: TMDBSortByKey;
  filterMinRating: number;

  collectionId: number | null;
  collectionName: string;

  topBannerHeight: number;
  bottomBannerHeight: number;
  topBannerMode: BannerMode;
  bottomBannerMode: BannerMode;
  topBannerImage: string | null;
  bottomBannerImage: string | null;
  theaterName: string;

  activeThemeId: string;

  topFont: BannerFontPreset;
  bottomFont: BannerFontPreset;
  titleFont: BannerFontPreset;
  sideTextSize: number;
  titleTextSize: number;
  showTopLeft: boolean;
  showTopCenter: boolean;
  showTopRight: boolean;
  showBottomLeft: boolean;
  showBottomCenter: boolean;
  showBottomRight: boolean;

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

  filterGenreId: null,
  filterYearBucket: "all",
  filterLanguage: "all",
  filterSortBy: "popularity.desc",
  filterMinRating: 0,

  collectionId: null,
  collectionName: "",

  topBannerHeight: 90,
  bottomBannerHeight: 110,
  topBannerMode: "auto",
  bottomBannerMode: "auto",
  topBannerImage: null,
  bottomBannerImage: null,
  theaterName: "CineBoard Theater",

  activeThemeId: "classic-cinema",

  topFont: "Oswald",
  bottomFont: "Montserrat",
  titleFont: "Bebas Neue",
  sideTextSize: 22,
  titleTextSize: 40,
  showTopLeft: true,
  showTopCenter: true,
  showTopRight: true,
  showBottomLeft: true,
  showBottomCenter: true,
  showBottomRight: true,

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
