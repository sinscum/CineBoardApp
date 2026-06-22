import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/dashboard-page.css";
import {
  loadAllProfiles,
  getActiveDisplayId,
  setActiveDisplayId,
  setActiveMovie,
  PROFILES_CHANGED_EVENT,
  ACTIVE_DISPLAY_CHANGED_EVENT,
  ACTIVE_MOVIE_CHANGED_EVENT,
  SETTINGS_CHANGED_EVENT,
} from "../services/displaySettings";
import {
  getActiveTheme,
  getAllThemes,
  THEMES_CHANGED_EVENT,
} from "../services/themes";
import {
  fetchCategoryMovie,
  fetchGenreMovie,
  fetchMovieById,
  fetchDiscoverMovie,
  fetchCollectionMovie,
} from "../services/tmdb";
import { getCacheStats, clearAllCache } from "../services/cache";
import {
  loadActivity,
  formatRelativeTime,
  formatAbsoluteTime,
  logActivity,
  clearActivity,
  ACTIVITY_CHANGED_EVENT,
  type ActivityEvent,
} from "../services/activityLog";
import type {
  DisplayProfile,
  BannerTheme,
} from "../types/displaySettings";
import type { MovieDisplayData } from "../types/tmdb";

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

function getSourceLabel(profile: DisplayProfile): string {
  const s = profile.settings;
  if (s.sourceMode === "category") {
    const map: Record<string, string> = {
      popular: "Popular",
      now_playing: "Now Playing",
      upcoming: "Coming Soon",
      top_rated: "Top Rated",
    };
    return `Category: ${map[s.category] ?? s.category}`;
  }
  if (s.sourceMode === "genre") {
    return `Genre: ${genreLabels[s.genreId] ?? "Genre"}`;
  }
  if (s.sourceMode === "filters") {
    const parts: string[] = [];
    if (s.filterGenreId !== null) {
      parts.push(genreLabels[s.filterGenreId] ?? "Filtered");
    }
    if (s.filterYearBucket !== "all") parts.push(s.filterYearBucket);
    if (s.filterLanguage !== "all") parts.push(s.filterLanguage.toUpperCase());
    return parts.length > 0 ? `Filters: ${parts.join(" / ")}` : "Filters";
  }
  if (s.sourceMode === "collection") {
    return s.collectionName
      ? `Collection: ${s.collectionName}`
      : "Collection (none selected)";
  }
  return "Unknown";
}

async function fetchPosterForProfile(
  profile: DisplayProfile
): Promise<MovieDisplayData | null> {
  try {
    if (profile.activeMovie && profile.activeMovie.id > 0) {
      return await fetchMovieById(profile.activeMovie.id);
    }
    const s = profile.settings;
    if (s.sourceMode === "filters") {
      return await fetchDiscoverMovie({
        genreId: s.filterGenreId,
        yearBucket: s.filterYearBucket,
        language: s.filterLanguage,
        sortBy: s.filterSortBy,
        minRating: s.filterMinRating,
      });
    }
    if (s.sourceMode === "collection" && s.collectionId) {
      return await fetchCollectionMovie(s.collectionId);
    }
    if (s.sourceMode === "genre") {
      return await fetchGenreMovie(s.genreId);
    }
    return await fetchCategoryMovie(s.category);
  } catch {
    return null;
  }
}

interface DisplayPreviewCardProps {
  profile: DisplayProfile;
  theme: BannerTheme;
  activeId: number;
  onOpen: () => void;
  onEdit: () => void;
}

function DisplayPreviewCard({
  profile,
  theme,
  activeId,
  onOpen,
  onEdit,
}: DisplayPreviewCardProps) {
  const [movie, setMovie] = useState<MovieDisplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const isActive = profile.id === activeId;

  // Stable key so we only refetch when something poster-affecting changes
  const sourceKey = useMemo(() => {
    const s = profile.settings;
    return [
      s.sourceMode,
      s.category,
      s.genreId,
      s.filterGenreId,
      s.filterYearBucket,
      s.filterLanguage,
      s.filterSortBy,
      s.filterMinRating,
      s.collectionId,
      profile.activeMovie?.id ?? 0,
    ].join("|");
  }, [profile]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    fetchPosterForProfile(profile).then((data) => {
      if (live) {
        setMovie(data);
        setLoading(false);
      }
    });
    return () => {
      live = false;
    };
  }, [sourceKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <article
      className={`dash-preview-card ${isActive ? "dash-preview-card-active" : ""}`}
    >
      <div className="dash-preview-header">
        <div className="dash-preview-title-row">
          <h3 className="dash-preview-name">{profile.name}</h3>
          {isActive && <span className="dash-badge dash-badge-active">ACTIVE</span>}
        </div>
        <div className="dash-preview-source">{getSourceLabel(profile)}</div>
      </div>

      <div className="dash-preview-frame">
        {loading ? (
          <div className="dash-preview-loading">Loading...</div>
        ) : movie?.posterUrl ? (
          <img
            src={movie.posterUrl}
            alt={movie?.title ?? "Poster"}
            className="dash-preview-poster"
          />
        ) : (
          <div className="dash-preview-empty">No poster</div>
        )}
      </div>

      <div className="dash-preview-meta">
        <span>
          Theme: <strong>{theme.name}</strong>
        </span>
      </div>

      <div className="dash-preview-actions">
        <button
          type="button"
          className="dash-btn dash-btn-primary"
          onClick={onOpen}
        >
          Open Display
        </button>
        <button type="button" className="dash-btn" onClick={onEdit}>
          Edit Settings
        </button>
      </div>
    </article>
  );
}

function DashboardPage() {
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<DisplayProfile[]>(loadAllProfiles());
  const [activeId, setActiveIdState] = useState<number>(getActiveDisplayId());
  const [activity, setActivity] = useState<ActivityEvent[]>(loadActivity());
  const [cacheStats, setCacheStats] = useState(getCacheStats());
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 30 * 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    function refreshAll() {
      setProfiles(loadAllProfiles());
      setActiveIdState(getActiveDisplayId());
      setCacheStats(getCacheStats());
    }
    function refreshActivity() {
      setActivity(loadActivity());
    }
    window.addEventListener(PROFILES_CHANGED_EVENT, refreshAll);
    window.addEventListener(ACTIVE_DISPLAY_CHANGED_EVENT, refreshAll);
    window.addEventListener(ACTIVE_MOVIE_CHANGED_EVENT, refreshAll);
    window.addEventListener(SETTINGS_CHANGED_EVENT, refreshAll);
    window.addEventListener(THEMES_CHANGED_EVENT, refreshAll);
    window.addEventListener("storage", refreshAll);
    window.addEventListener(ACTIVITY_CHANGED_EVENT, refreshActivity);
    return () => {
      window.removeEventListener(PROFILES_CHANGED_EVENT, refreshAll);
      window.removeEventListener(ACTIVE_DISPLAY_CHANGED_EVENT, refreshAll);
      window.removeEventListener(ACTIVE_MOVIE_CHANGED_EVENT, refreshAll);
      window.removeEventListener(SETTINGS_CHANGED_EVENT, refreshAll);
      window.removeEventListener(THEMES_CHANGED_EVENT, refreshAll);
      window.removeEventListener("storage", refreshAll);
      window.removeEventListener(ACTIVITY_CHANGED_EVENT, refreshActivity);
    };
  }, []);

  const enabledProfiles = useMemo(
    () => profiles.filter((p) => p.enabled),
    [profiles]
  );

  const tmdbTokenPresent = Boolean(import.meta.env.VITE_TMDB_READ_TOKEN);
  const allThemes = getAllThemes();
  const builtInCount = allThemes.filter((t) => t.builtIn).length;
  const customCount = allThemes.filter((t) => !t.builtIn).length;

  const localStorageUsage = useMemo(() => {
    let bytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) ?? "";
        const val = localStorage.getItem(key) ?? "";
        bytes += key.length + val.length;
      }
    } catch {
      // ignore
    }
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }, [profiles, cacheStats]);

  function handleOpenDisplay(profile: DisplayProfile) {
    window.open(`/display/${profile.id}`, "_blank");
  }

  function handleEditDisplay(profile: DisplayProfile) {
    setActiveDisplayId(profile.id);
    navigate("/settings");
  }

  function handleOpenLibrary() {
    navigate("/library");
  }

  function handleOpenActiveDisplay() {
    window.open(`/display/${activeId}`, "_blank");
  }

  function handleClearAllPinned() {
    const pinnedCount = profiles.filter((p) => p.activeMovie).length;
    if (pinnedCount === 0) return;
    const ok = window.confirm(
      `Clear pinned movies on ${pinnedCount} display${
        pinnedCount > 1 ? "s" : ""
      }?`
    );
    if (!ok) return;
    profiles.forEach((p) => {
      if (p.activeMovie) {
        setActiveMovie(null, p.id);
        logActivity(
          "movie-cleared",
          `Cleared "${p.activeMovie.title}" from ${p.name}`,
          p.id,
          p.name
        );
      }
    });
  }

  function handleRefreshAll() {
    clearAllCache();
    setCacheStats(getCacheStats());
    logActivity("settings-saved", `Refreshed all displays (cache cleared)`);
    window.dispatchEvent(new Event(PROFILES_CHANGED_EVENT));
  }

  function handleClearActivity() {
    const ok = window.confirm("Clear all activity log entries?");
    if (!ok) return;
    clearActivity();
  }

  const pinnedCount = profiles.filter((p) => p.activeMovie).length;

  return (
    <div className="dashboard-page">
      <section className="dash-heading">
        <h1>Dashboard</h1>
        <p className="dash-subtitle">
          Live overview of enabled displays, service status, and recent activity.
        </p>
      </section>

      {/* ---- Service status row ---- */}
      <section className="dash-status-row">
        <div
          className={`dash-status-chip ${
            tmdbTokenPresent ? "chip-online" : "chip-offline"
          }`}
          title={
            tmdbTokenPresent
              ? "TMDB API token is configured"
              : "TMDB token is missing — set VITE_TMDB_READ_TOKEN"
          }
        >
          <span className="dash-status-dot" />
          <span className="dash-status-label">TMDB</span>
          <span className="dash-status-value">
            {tmdbTokenPresent ? "Online" : "Token Missing"}
          </span>
        </div>

        <div
          className="dash-status-chip chip-idle"
          title="Plex integration not yet configured"
        >
          <span className="dash-status-dot" />
          <span className="dash-status-label">Plex</span>
          <span className="dash-status-value">Not Connected</span>
        </div>

        <div className="dash-status-chip chip-neutral">
          <span className="dash-status-label">Cache</span>
          <span className="dash-status-value">
            {cacheStats.entries} entries \u2022 {cacheStats.approximateSize}
          </span>
        </div>

        <div className="dash-status-chip chip-neutral">
          <span className="dash-status-label">Themes</span>
          <span className="dash-status-value">
            {builtInCount} built-in \u2022 {customCount} custom
          </span>
        </div>

        <div className="dash-status-chip chip-neutral">
          <span className="dash-status-label">Storage</span>
          <span className="dash-status-value">{localStorageUsage}</span>
        </div>
      </section>

      {/* ---- Quick actions ---- */}
      <section className="dash-quick-actions">
        <button
          type="button"
          className="dash-btn"
          onClick={handleOpenLibrary}
        >
          Open Library
        </button>
        <button
          type="button"
          className="dash-btn"
          onClick={handleOpenActiveDisplay}
        >
          Open Active Display
        </button>
        <button
          type="button"
          className="dash-btn"
          onClick={handleClearAllPinned}
          disabled={pinnedCount === 0}
        >
          Clear All Pinned ({pinnedCount})
        </button>
        <button
          type="button"
          className="dash-btn"
          onClick={handleRefreshAll}
        >
          Refresh All Displays
        </button>
      </section>

      {/* ---- Display previews ---- */}
      <section>
        <h2 className="dash-section-title">
          Active Displays
          <span className="dash-section-count">
            ({enabledProfiles.length})
          </span>
        </h2>

        {enabledProfiles.length === 0 ? (
          <div className="dash-empty">
            No enabled displays. Enable one on the{" "}
            <strong>Displays</strong> page.
          </div>
        ) : (
          <div className="dash-preview-grid">
            {enabledProfiles.map((profile) => {
              const theme = getActiveTheme(profile.settings.activeThemeId);
              return (
                <DisplayPreviewCard
                  key={profile.id}
                  profile={profile}
                  theme={theme}
                  activeId={activeId}
                  onOpen={() => handleOpenDisplay(profile)}
                  onEdit={() => handleEditDisplay(profile)}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* ---- Recent activity ---- */}
      <section>
        <h2 className="dash-section-title">
          Recent Activity
          <span className="dash-section-count">
            ({activity.length}/{20})
          </span>
          {activity.length > 0 && (
            <button
              type="button"
              className="dash-clear-link"
              onClick={handleClearActivity}
            >
              Clear
            </button>
          )}
        </h2>

        {activity.length === 0 ? (
          <div className="dash-empty">
            No activity yet. Push a movie, apply a theme, or change settings
            and it'll show up here.
          </div>
        ) : (
          <ul className="dash-activity-list">
            {activity.slice(0, 5).map((e) => (
              <li key={e.id} className="dash-activity-row">
                <span
                  className={`dash-activity-kind kind-${e.kind}`}
                  title={e.kind}
                >
                  {labelForKind(e.kind)}
                </span>
                <span className="dash-activity-detail">{e.detail}</span>
                <span
                  className="dash-activity-time"
                  title={formatAbsoluteTime(e.ts)}
                >
                  {formatRelativeTime(e.ts, nowTick)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function labelForKind(kind: ActivityEvent["kind"]): string {
  switch (kind) {
    case "movie-pinned":
      return "Pin";
    case "movie-cleared":
      return "Clear";
    case "theme-applied":
      return "Theme";
    case "theme-created":
      return "Theme+";
    case "theme-deleted":
      return "Theme-";
    case "settings-saved":
      return "Save";
    case "display-reset":
      return "Reset";
    case "display-renamed":
      return "Rename";
    default:
      return "Event";
  }
}

export default DashboardPage;