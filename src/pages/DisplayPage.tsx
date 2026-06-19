import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useParams } from "react-router-dom";
import "../styles/display-page.css";
import {
  fetchCategoryMovie,
  fetchGenreMovie,
  fetchMovieById,
} from "../services/tmdb";
import type { MovieDisplayData } from "../types/tmdb";
import {
  loadDisplaySettings,
  SETTINGS_CHANGED_EVENT,
  getActiveMovie,
  ACTIVE_MOVIE_CHANGED_EVENT,
  PROFILES_CHANGED_EVENT,
} from "../services/displaySettings";
import { getActiveTheme, THEMES_CHANGED_EVENT } from "../services/themes";
import type {
  DisplaySettings,
  BannerTheme,
  BannerContentKind,
  BannerPresetKind,
} from "../types/displaySettings";
import { BANNER_CONTENT_PRESETS } from "../types/displaySettings";
import { GENRE_NAMES } from "../constants/genres";

function parseDisplayId(raw: string | undefined): number {
  const n = parseInt(raw ?? "1", 10);
  if (n === 1 || n === 2 || n === 3) return n;
  return 1;
}

function getModeLabel(settings: DisplaySettings): string {
  if (settings.sourceMode === "genre") {
    return `${GENRE_NAMES[settings.genreId] ?? "Genre"} Showcase`;
  }
  if (settings.category === "popular") return "Popular Picks";
  if (settings.category === "now_playing") return "Now Playing";
  if (settings.category === "upcoming") return "Coming Soon";
  if (settings.category === "top_rated") return "Top Rated";
  return "Showcase";
}

function getAutoBannerClass(
  settings: DisplaySettings,
  position: "top" | "bottom"
): string {
  const suffix = position === "top" ? "top" : "bottom";
  if (settings.sourceMode === "category") {
    if (settings.category === "popular")
      return `banner-theme-popular-${suffix}`;
    if (settings.category === "now_playing")
      return `banner-theme-now-playing-${suffix}`;
    if (settings.category === "upcoming")
      return `banner-theme-upcoming-${suffix}`;
    if (settings.category === "top_rated")
      return `banner-theme-top-rated-${suffix}`;
    return `banner-theme-default-${suffix}`;
  }
  if (settings.genreId === 27) return `banner-theme-horror-${suffix}`;
  if (settings.genreId === 878) return `banner-theme-scifi-${suffix}`;
  if (settings.genreId === 35) return `banner-theme-comedy-${suffix}`;
  if (settings.genreId === 14) return `banner-theme-fantasy-${suffix}`;
  return `banner-theme-default-${suffix}`;
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCalendar(date: Date): string {
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function resolveZoneText(
  contentKind: BannerContentKind,
  customText: string,
  autoText: string
): string {
  if (contentKind === "auto") return autoText;
  if (contentKind === "custom") return customText.trim();
  return BANNER_CONTENT_PRESETS[contentKind as BannerPresetKind] ?? autoText;
}

function DisplayPage() {
  const { id: idParam } = useParams<{ id: string }>();
  const displayId = parseDisplayId(idParam);

  const [movie, setMovie] = useState<MovieDisplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<DisplaySettings>(
    loadDisplaySettings(displayId)
  );
  const [now, setNow] = useState(new Date());
  const [activeMovie, setActiveMovieState] = useState(
    () => getActiveMovie(displayId)
  );
  // Incrementing this triggers a new random movie when rotating
  const [rotationTick, setRotationTick] = useState(0);

  const theme: BannerTheme = useMemo(
    () => getActiveTheme(settings.activeThemeId),
    [settings.activeThemeId]
  );

  const modeLabel = useMemo(() => getModeLabel(settings), [settings]);

  // Clock
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Settings sync
  useEffect(() => {
    function reload() {
      setSettings(loadDisplaySettings(displayId));
    }
    window.addEventListener("storage", reload);
    window.addEventListener(SETTINGS_CHANGED_EVENT, reload);
    window.addEventListener(PROFILES_CHANGED_EVENT, reload);
    window.addEventListener(THEMES_CHANGED_EVENT, reload);
    return () => {
      window.removeEventListener("storage", reload);
      window.removeEventListener(SETTINGS_CHANGED_EVENT, reload);
      window.removeEventListener(PROFILES_CHANGED_EVENT, reload);
      window.removeEventListener(THEMES_CHANGED_EVENT, reload);
    };
  }, [displayId]);

  // Active movie sync — updating this state drives both the loader and rotation effects
  useEffect(() => {
    function onMovieChanged() {
      setActiveMovieState(getActiveMovie(displayId));
    }
    window.addEventListener(ACTIVE_MOVIE_CHANGED_EVENT, onMovieChanged);
    window.addEventListener("storage", onMovieChanged);
    window.addEventListener(PROFILES_CHANGED_EVENT, onMovieChanged);
    return () => {
      window.removeEventListener(ACTIVE_MOVIE_CHANGED_EVENT, onMovieChanged);
      window.removeEventListener("storage", onMovieChanged);
      window.removeEventListener(PROFILES_CHANGED_EVENT, onMovieChanged);
    };
  }, [displayId]);

  // Rotation interval — only runs when no movie is pinned; clears immediately on pin
  useEffect(() => {
    if (activeMovie) return;
    const id = window.setInterval(
      () => setRotationTick((t) => t + 1),
      settings.rotationSeconds * 1000
    );
    return () => window.clearInterval(id);
  }, [activeMovie, settings.rotationSeconds]);

  // Movie loader — reruns on pin/unpin, settings change, displayId change, or rotation tick
  useEffect(() => {
    let live = true;

    async function loadMovie() {
      if (live) {
        setLoading(true);
        setError(null);
      }
      try {
        let data: MovieDisplayData;
        if (activeMovie && activeMovie.id > 0) {
          data = await fetchMovieById(activeMovie.id);
        } else if (settings.sourceMode === "genre") {
          data = await fetchGenreMovie(settings.genreId);
        } else {
          data = await fetchCategoryMovie(settings.category);
        }
        if (live) setMovie(data);
      } catch (err) {
        if (live) {
          setError(
            err instanceof Error
              ? err.message
              : "Unknown display loading error."
          );
        }
      } finally {
        if (live) setLoading(false);
      }
    }

    loadMovie();
    return () => {
      live = false;
    };
  }, [activeMovie, settings, displayId, rotationTick]);

  if (loading) {
    return <div className="display-loading">Loading poster...</div>;
  }

  if (error) {
    return <div className="display-error">{error}</div>;
  }

  // ---- Theme drives all visual layout ----
  const contentStyle: CSSProperties = {
    ["--top-banner-height" as string]: `${theme.topBannerHeight}px`,
    ["--bottom-banner-height" as string]: `${theme.bottomBannerHeight}px`,
    ["--top-font" as string]: `'${theme.topFont}', sans-serif`,
    ["--bottom-font" as string]: `'${theme.bottomFont}', sans-serif`,
    ["--title-font" as string]: `'${theme.titleFont}', sans-serif`,
    ["--side-text-size" as string]: `${theme.sideTextSize}px`,
    ["--title-text-size" as string]: `${theme.titleTextSize}px`,
  };

  const topBannerStyle =
    theme.topBannerMode === "custom" && theme.topBannerImage
      ? {
          backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${theme.topBannerImage})`,
        }
      : undefined;

  const bottomBannerStyle =
    theme.bottomBannerMode === "custom" && theme.bottomBannerImage
      ? {
          backgroundImage: `linear-gradient(rgba(0,0,0,0.42), rgba(0,0,0,0.42)), url(${theme.bottomBannerImage})`,
        }
      : undefined;

  // ---- Auto-text defaults for each zone ----
  const autoTopLeft = settings.theaterName;
  const autoTopCenter = modeLabel;
  const autoTopRight = `${formatClock(now)} • ${formatCalendar(now)}`;
  const autoBottomLeft = [movie?.genre, movie?.rating].filter(Boolean).join(" • ");
  const autoBottomCenter = movie?.title ?? "";
  const autoBottomRight = [movie?.year, movie?.runtime].filter(Boolean).join(" • ");

  // ---- Resolved text per zone ----
  const topLeftText = resolveZoneText(settings.topLeftContent, settings.topLeftCustomText, autoTopLeft);
  const topCenterText = resolveZoneText(settings.topCenterContent, settings.topCenterCustomText, autoTopCenter);
  const topRightText = resolveZoneText(settings.topRightContent, settings.topRightCustomText, autoTopRight);
  const bottomLeftText = resolveZoneText(settings.bottomLeftContent, settings.bottomLeftCustomText, autoBottomLeft);
  const bottomCenterText = resolveZoneText(settings.bottomCenterContent, settings.bottomCenterCustomText, autoBottomCenter);
  const bottomRightText = resolveZoneText(settings.bottomRightContent, settings.bottomRightCustomText, autoBottomRight);

  const topHasImage = theme.topBannerMode === "custom" && Boolean(theme.topBannerImage);
  const bottomHasImage = theme.bottomBannerMode === "custom" && Boolean(theme.bottomBannerImage);

  return (
    <div className="display-page">
      {movie?.backdropUrl && (
        <div
          className="display-background"
          style={{ backgroundImage: `url(${movie.backdropUrl})` }}
        />
      )}

      <div className="display-overlay" />

      <div className="display-content" style={contentStyle}>
        <header
          className={`display-banner display-banner-top ${getAutoBannerClass(settings, "top")} ${
            topHasImage ? "has-banner-image" : ""
          } ${theme.topBannerMode === "none" ? "banner-none" : ""}`}
          style={topBannerStyle}
        >
          <div className="display-banner-zone display-banner-zone-left top-zone">
            {theme.showTopLeft && topLeftText && (
              <span className="display-top-text">{topLeftText}</span>
            )}
          </div>
          <div className="display-banner-zone display-banner-zone-center top-zone">
            {theme.showTopCenter && topCenterText && (
              <span className="display-top-text display-top-text-center">
                {topCenterText}
              </span>
            )}
          </div>
          <div className="display-banner-zone display-banner-zone-right top-zone">
            {theme.showTopRight && topRightText && (
              <span className="display-top-text display-top-text-right">
                {topRightText}
              </span>
            )}
          </div>
        </header>

        <main className="display-stage">
          <div className="display-poster">
            {movie?.posterUrl ? (
              <img src={movie.posterUrl} alt={movie.title} />
            ) : (
              <div className="display-no-poster">No poster available</div>
            )}
          </div>
        </main>

        <footer
          className={`display-banner display-banner-bottom ${getAutoBannerClass(settings, "bottom")} ${
            bottomHasImage ? "has-banner-image" : ""
          } ${theme.bottomBannerMode === "none" ? "banner-none" : ""}`}
          style={bottomBannerStyle}
        >
          <div className="display-banner-zone display-banner-zone-left bottom-zone">
            {theme.showBottomLeft && bottomLeftText && (
              <span className="display-bottom-side-text">{bottomLeftText}</span>
            )}
          </div>
          <div className="display-banner-zone display-banner-zone-center bottom-zone">
            {theme.showBottomCenter && bottomCenterText && (
              <span className="display-movie-title">{bottomCenterText}</span>
            )}
          </div>
          <div className="display-banner-zone display-banner-zone-right bottom-zone">
            {theme.showBottomRight && bottomRightText && (
              <span className="display-bottom-side-text display-bottom-side-text-right">
                {bottomRightText}
              </span>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

export default DisplayPage;
