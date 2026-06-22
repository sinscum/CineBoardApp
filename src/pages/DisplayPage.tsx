import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useParams } from "react-router-dom";
import "../styles/display-page.css";
import {
  fetchCategoryMovie,
  fetchGenreMovie,
  fetchMovieById,
  fetchDiscoverMovie,
  fetchCollectionMovie,
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
} from "../types/displaySettings";
import { BANNER_CONTENT_PRESETS } from "../types/displaySettings";

const genreLabels: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  18: "Drama",
  14: "Fantasy",
  27: "Horror",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  53: "Thriller",
  37: "Western",
};

function parseDisplayId(raw: string | undefined): number {
  const n = parseInt(raw ?? "1", 10);
  if (n === 1 || n === 2 || n === 3) return n;
  return 1;
}

function getModeLabel(settings: DisplaySettings): string {
  if (settings.sourceMode === "genre") {
    return `${genreLabels[settings.genreId] ?? "Genre"} Showcase`;
  }
  if (settings.sourceMode === "filters") {
    const genrePart =
      settings.filterGenreId !== null
        ? genreLabels[settings.filterGenreId] ?? "Filtered"
        : "Filtered";
    return `${genrePart} Picks`;
  }
  if (settings.sourceMode === "collection") {
    return settings.collectionName
      ? `${settings.collectionName} Collection`
      : "Collection";
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

  if (settings.sourceMode === "filters") {
    if (settings.filterGenreId === 27) return `banner-theme-horror-${suffix}`;
    if (settings.filterGenreId === 878) return `banner-theme-scifi-${suffix}`;
    if (settings.filterGenreId === 35) return `banner-theme-comedy-${suffix}`;
    if (settings.filterGenreId === 14) return `banner-theme-fantasy-${suffix}`;
    return `banner-theme-default-${suffix}`;
  }

  if (settings.sourceMode === "collection") {
    return `banner-theme-default-${suffix}`;
  }

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
  const preset = BANNER_CONTENT_PRESETS[contentKind];
  return preset || autoText;
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

  const theme: BannerTheme = useMemo(
    () => getActiveTheme(settings.activeThemeId),
    [settings.activeThemeId]
  );

  const modeLabel = useMemo(() => getModeLabel(settings), [settings]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

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

  useEffect(() => {
    let live = true;

    async function loadMovie() {
      try {
        if (live) {
          setLoading(true);
          setError(null);
        }

        let data: MovieDisplayData;
        const active = getActiveMovie(displayId);

        if (active && active.id > 0) {
          data = await fetchMovieById(active.id);
        } else if (settings.sourceMode === "filters") {
          data = await fetchDiscoverMovie({
            genreId: settings.filterGenreId,
            yearBucket: settings.filterYearBucket,
            language: settings.filterLanguage,
            sortBy: settings.filterSortBy,
            minRating: settings.filterMinRating,
          });
        } else if (settings.sourceMode === "collection") {
          if (!settings.collectionId) {
            throw new Error(
              "No collection selected. Pick one in Settings → Display Source."
            );
          }
          data = await fetchCollectionMovie(settings.collectionId);
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

    function handleActiveMovieChanged() {
      loadMovie();
    }
    window.addEventListener(
      ACTIVE_MOVIE_CHANGED_EVENT,
      handleActiveMovieChanged
    );
    window.addEventListener("storage", handleActiveMovieChanged);
    window.addEventListener(PROFILES_CHANGED_EVENT, handleActiveMovieChanged);

    const active = getActiveMovie(displayId);
    const intervalId = active
      ? null
      : window.setInterval(loadMovie, settings.rotationSeconds * 1000);

    return () => {
      live = false;
      window.removeEventListener(
        ACTIVE_MOVIE_CHANGED_EVENT,
        handleActiveMovieChanged
      );
      window.removeEventListener("storage", handleActiveMovieChanged);
      window.removeEventListener(
        PROFILES_CHANGED_EVENT,
        handleActiveMovieChanged
      );
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [settings, displayId]);

  if (loading) {
    return <div className="display-loading">Loading poster...</div>;
  }

  if (error) {
    return <div className="display-error">{error}</div>;
  }

  const contentStyle: CSSProperties = {
    ["--top-banner-height" as string]: `${theme.topBannerHeight}px`,
    ["--bottom-banner-height" as string]: `${theme.bottomBannerHeight}px`,
    ["--top-font" as string]: `'${theme.topFont}', sans-serif`,
    ["--bottom-font" as string]: `'${theme.bottomFont}', sans-serif`,
    ["--title-font" as string]: `'${theme.titleFont}', sans-serif`,
    ["--side-text-size" as string]: `${theme.sideTextSize}px`,
    ["--title-text-size" as string]: `${theme.titleTextSize}px`,
  };

  const topImage = theme.topBannerImage ?? settings.topBannerImage;
  const bottomImage = theme.bottomBannerImage ?? settings.bottomBannerImage;

  const topBannerStyle =
    theme.topBannerMode === "custom" && topImage
      ? {
          backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${topImage})`,
        }
      : undefined;

  const bottomBannerStyle =
    theme.bottomBannerMode === "custom" && bottomImage
      ? {
          backgroundImage: `linear-gradient(rgba(0,0,0,0.42), rgba(0,0,0,0.42)), url(${bottomImage})`,
        }
      : undefined;

  const autoTopLeft = settings.theaterName;
  const autoTopCenter = modeLabel;
  const autoTopRight = `${formatClock(now)} • ${formatCalendar(now)}`;
  const autoBottomLeft = [movie?.genre, movie?.rating]
    .filter(Boolean)
    .join(" • ");
  const autoBottomCenter = movie?.title ?? "";
  const autoBottomRight = [movie?.year, movie?.runtime]
    .filter(Boolean)
    .join(" • ");

  const topLeftText = resolveZoneText(
    settings.topLeftContent,
    settings.topLeftCustomText,
    autoTopLeft
  );
  const topCenterText = resolveZoneText(
    settings.topCenterContent,
    settings.topCenterCustomText,
    autoTopCenter
  );
  const topRightText = resolveZoneText(
    settings.topRightContent,
    settings.topRightCustomText,
    autoTopRight
  );
  const bottomLeftText = resolveZoneText(
    settings.bottomLeftContent,
    settings.bottomLeftCustomText,
    autoBottomLeft
  );
  const bottomCenterText = resolveZoneText(
    settings.bottomCenterContent,
    settings.bottomCenterCustomText,
    autoBottomCenter
  );
  const bottomRightText = resolveZoneText(
    settings.bottomRightContent,
    settings.bottomRightCustomText,
    autoBottomRight
  );

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
          className={`display-banner display-banner-top ${getAutoBannerClass(
            settings,
            "top"
          )} ${
            theme.topBannerMode === "custom" && topImage
              ? "has-banner-image"
              : ""
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
              <img
                src={movie.posterUrl}
                alt={movie.title}
                className={`display-poster-image fit-${settings.posterFitMode}`}
              />
            ) : (
              <div className="display-no-poster">No poster available</div>
            )}
          </div>
        </main>

        <footer
          className={`display-banner display-banner-bottom ${getAutoBannerClass(
            settings,
            "bottom"
          )} ${
            theme.bottomBannerMode === "custom" && bottomImage
              ? "has-banner-image"
              : ""
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
