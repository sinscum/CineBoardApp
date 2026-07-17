import { useEffect, useMemo, useState } from "react";
import "../styles/settings-page.css";
import type {
  DisplaySettings,
  BannerContentKind,
  TMDBSortByKey,
  YearBucketKey,
} from "../types/displaySettings";
import {
  loadDisplaySettings,
  saveDisplaySettings,
  resetDisplaySettings,
  getActiveDisplayId,
  loadProfile,
  applyThemeToDisplay,
  ACTIVE_DISPLAY_CHANGED_EVENT,
  PROFILES_CHANGED_EVENT,
} from "../services/displaySettings";
import {
  getAllThemes,
  getActiveTheme,
  THEMES_CHANGED_EVENT,
} from "../services/themes";
import { clearAllCache, getCacheStats } from "../services/cache";
import {
  searchCollections,
  fetchCollectionMovies,
  type CollectionSearchResult,
} from "../services/tmdb";
import { getStoredConnections, saveConnections, testConnections } from "../services/connections";
import type { MediaConnectionConfig } from "../types/displaySettings";

const CONTENT_OPTIONS: { value: BannerContentKind; label: string }[] = [
  { value: "auto", label: "Auto (default for this zone)" },
  { value: "custom", label: "Custom text..." },
  { value: "preset-coming-soon", label: "COMING SOON" },
  { value: "preset-now-playing", label: "NOW PLAYING" },
  { value: "preset-now-showing", label: "NOW SHOWING" },
  { value: "preset-sold-out", label: "SOLD OUT" },
  { value: "preset-intermission", label: "INTERMISSION" },
  { value: "preset-closed-tonight", label: "CLOSED TONIGHT" },
  { value: "preset-be-right-back", label: "BE RIGHT BACK" },
  { value: "preset-welcome", label: "WELCOME" },
  { value: "preset-tonight-only", label: "TONIGHT ONLY" },
  { value: "preset-feature-presentation", label: "FEATURE PRESENTATION" },
];

const yearBucketOptions: { value: YearBucketKey; label: string }[] = [
  { value: "all", label: "All Years" },
  { value: "2020s", label: "2020s" },
  { value: "2010s", label: "2010s" },
  { value: "2000s", label: "2000s" },
  { value: "1990s", label: "1990s" },
  { value: "1980s", label: "1980s" },
  { value: "1970s", label: "1970s" },
  { value: "pre-1970", label: "Pre-1970" },
];

const languageOptions: { value: string; label: string }[] = [
  { value: "all", label: "All Languages" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Mandarin" },
  { value: "hi", label: "Hindi" },
];

const sortByOptions: { value: TMDBSortByKey; label: string }[] = [
  { value: "popularity.desc", label: "Popular" },
  { value: "primary_release_date.desc", label: "Newest" },
  { value: "vote_average.desc", label: "Top Rated" },
  { value: "vote_count.desc", label: "Most Voted" },
];

const minRatingOptions: { value: number; label: string }[] = [
  { value: 0, label: "Any Rating" },
  { value: 6, label: "6.0+" },
  { value: 7, label: "7.0+" },
  { value: 7.5, label: "7.5+" },
  { value: 8, label: "8.0+" },
  { value: 8.5, label: "8.5+" },
];

interface EnrichedCollection extends CollectionSearchResult {
  movieCount: number;
}

function SettingsPage() {
  const [activeId, setActiveId] = useState<number>(getActiveDisplayId());
  const [activeName, setActiveName] = useState<string>(
    loadProfile(getActiveDisplayId()).name
  );
  const [settings, setSettings] = useState<DisplaySettings>(
    loadDisplaySettings(getActiveDisplayId())
  );
  const [statusMessage, setStatusMessage] = useState("");
  const [cacheStats, setCacheStats] = useState(getCacheStats());
  const [themesRefresh, setThemesRefresh] = useState(0);

  const [collectionQuery, setCollectionQuery] = useState("");
  const [collectionResults, setCollectionResults] = useState<
    EnrichedCollection[]
  >([]);
  const [collectionLoading, setCollectionLoading] = useState(false);

  const [connections, setConnections] = useState<MediaConnectionConfig>(
    getStoredConnections()
  );
  const [connectionsSaving, setConnectionsSaving] = useState(false);
  const [connectionsTesting, setConnectionsTesting] = useState(false);
  const [connectionsMessage, setConnectionsMessage] = useState("");

  useEffect(() => {
    function refresh() {
      const id = getActiveDisplayId();
      setActiveId(id);
      setActiveName(loadProfile(id).name);
      setSettings(loadDisplaySettings(id));
    }
    function refreshThemes() {
      setThemesRefresh((n) => n + 1);
      refresh();
    }
    window.addEventListener(ACTIVE_DISPLAY_CHANGED_EVENT, refresh);
    window.addEventListener(PROFILES_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener(THEMES_CHANGED_EVENT, refreshThemes);
    return () => {
      window.removeEventListener(ACTIVE_DISPLAY_CHANGED_EVENT, refresh);
      window.removeEventListener(PROFILES_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener(THEMES_CHANGED_EVENT, refreshThemes);
    };
  }, []);

  useEffect(() => {
    function onSave() {
      handleSave();
    }
    function onReset() {
      handleReset();
    }
    window.addEventListener("cineboard-save-settings", onSave);
    window.addEventListener("cineboard-reset-settings", onReset);
    return () => {
      window.removeEventListener("cineboard-save-settings", onSave);
      window.removeEventListener("cineboard-reset-settings", onReset);
    };
  }, [settings, activeId]);

  const allThemes = useMemo(() => getAllThemes(), [themesRefresh]);
  const activeTheme = useMemo(
    () => getActiveTheme(settings.activeThemeId),
    [settings.activeThemeId, themesRefresh]
  );

  function updateSetting<K extends keyof DisplaySettings>(
    key: K,
    value: DisplaySettings[K]
  ) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleThemeChange(themeId: string) {
    applyThemeToDisplay(themeId, activeId);
    setSettings(loadDisplaySettings(activeId));
    setStatusMessage(`Applied theme to ${activeName}.`);
    window.setTimeout(() => setStatusMessage(""), 2000);
  }

  function handleSave() {
    saveDisplaySettings(settings, activeId);
    setStatusMessage(`Saved settings for ${activeName}.`);
    window.setTimeout(() => setStatusMessage(""), 2000);
  }

  function handleReset() {
    const defaults = resetDisplaySettings(activeId);
    setSettings(defaults);
    setStatusMessage(`Reset ${activeName} to defaults.`);
    window.setTimeout(() => setStatusMessage(""), 2000);
  }

  function refreshCacheStats() {
    setCacheStats(getCacheStats());
  }

  function handleClearCache() {
    clearAllCache();
    refreshCacheStats();
    setStatusMessage("Cache cleared.");
    window.setTimeout(() => setStatusMessage(""), 2000);
  }

  async function handleCollectionSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!collectionQuery.trim()) return;
    try {
      setCollectionLoading(true);

      const raw = await searchCollections(collectionQuery);
      const enriched = await Promise.all(
        raw.map(async (c) => {
          try {
            const movies = await fetchCollectionMovies(c.id);
            return { ...c, movieCount: movies.length };
          } catch {
            return { ...c, movieCount: 0 };
          }
        })
      );

      const filtered = enriched
        .filter((c) => c.movieCount >= 2)
        .sort((a, b) => b.movieCount - a.movieCount);

      setCollectionResults(filtered);
    } catch {
      setStatusMessage("Collection search failed.");
      window.setTimeout(() => setStatusMessage(""), 2500);
    } finally {
      setCollectionLoading(false);
    }
  }

  function handleSelectCollection(c: EnrichedCollection) {
    setSettings((prev) => ({
      ...prev,
      collectionId: c.id,
      collectionName: c.name,
    }));
    setCollectionResults([]);
    setCollectionQuery("");
    setStatusMessage(
      `Selected "${c.name}". Click Save Settings to apply to ${activeName}.`
    );
    window.setTimeout(() => setStatusMessage(""), 3000);
  }

  function handleClearCollection() {
    setSettings((prev) => ({
      ...prev,
      collectionId: null,
      collectionName: "",
    }));
  }

  async function handleSaveConnections() {
    try {
      setConnectionsSaving(true);
      await saveConnections(connections);
      setConnectionsMessage("Connections saved.");
      window.setTimeout(() => setConnectionsMessage(""), 2500);
    } catch (error) {
      setConnectionsMessage(
        error instanceof Error ? error.message : "Unable to save connections."
      );
    } finally {
      setConnectionsSaving(false);
    }
  }

  async function handleTestConnections() {
    try {
      setConnectionsTesting(true);
      const result = await testConnections(connections);
      const enabled = Object.entries(result.checks)
        .filter(([, ok]) => ok)
        .map(([name]) => name.toUpperCase())
        .join(", ");
      setConnectionsMessage(
        enabled ? `Validated: ${enabled}` : "No enabled services were validated."
      );
      window.setTimeout(() => setConnectionsMessage(""), 2500);
    } catch (error) {
      setConnectionsMessage(
        error instanceof Error ? error.message : "Unable to test connections."
      );
    } finally {
      setConnectionsTesting(false);
    }
  }

  function updateConnectionField(
    service: "plex" | "radarr" | "sonarr",
    field: "enabled" | "url" | "token" | "apiKey",
    value: string | boolean
  ) {
    setConnections((prev) => ({
      ...prev,
      [service]: {
        ...(prev[service] ?? {
          enabled: false,
          url: "",
          token: "",
          apiKey: "",
        }),
        [field]: value,
      },
    }));
  }

  function renderConnectionSection(
    service: "plex" | "radarr" | "sonarr",
    title: string,
    fields: Array<{ label: string; key: "url" | "token" | "apiKey"; type?: string }>
  ) {
    const current = connections[service] as
      | (Record<string, string | boolean | undefined> & {
          enabled?: boolean;
        })
      | undefined;

    return (
      <div className="settings-field" key={service}>
        <label className="settings-field-label">{title}</label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={Boolean(current?.enabled)}
            onChange={(e) =>
              updateConnectionField(service, "enabled", e.target.checked)
            }
          />
          Enable {title}
        </label>
        {fields.map((field) => (
          <input
            key={`${service}-${field.key}`}
            type={field.type ?? "text"}
            value={String(current?.[field.key] ?? "")}
            onChange={(e) =>
              updateConnectionField(service, field.key, e.target.value)
            }
            placeholder={field.label}
            style={{ marginTop: 4 }}
          />
        ))}
      </div>
    );
  }

  function renderZoneEditor(
    label: string,
    autoHint: string,
    contentKey: keyof Pick<
      DisplaySettings,
      | "topLeftContent"
      | "topCenterContent"
      | "topRightContent"
      | "bottomLeftContent"
      | "bottomCenterContent"
      | "bottomRightContent"
    >,
    customKey: keyof Pick<
      DisplaySettings,
      | "topLeftCustomText"
      | "topCenterCustomText"
      | "topRightCustomText"
      | "bottomLeftCustomText"
      | "bottomCenterCustomText"
      | "bottomRightCustomText"
    >
  ) {
    const contentValue = settings[contentKey];
    const customValue = settings[customKey];
    const isCustom = contentValue === "custom";

    return (
      <div className="settings-field">
        <label className="settings-field-label">
          {label}{" "}
          <span style={{ color: "#9fb0bf", fontWeight: 400 }}>
            (auto: {autoHint})
          </span>
        </label>
        <select
          value={contentValue}
          onChange={(e) =>
            updateSetting(contentKey, e.target.value as BannerContentKind)
          }
        >
          {CONTENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {isCustom && (
          <input
            type="text"
            value={customValue as string}
            onChange={(e) =>
              updateSetting(customKey, e.target.value as never)
            }
            placeholder="Type custom text..."
            maxLength={80}
            style={{ marginTop: 6 }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="settings-page">
      <section className="settings-heading">
        <h1>Settings</h1>
        <p className="settings-subtitle">
          Editing settings for{" "}
          <strong style={{ color: "#f5c14b" }}>{activeName}</strong>. Switch
          displays from the header to edit a different profile.
        </p>
      </section>

      <section className="settings-grid">
        <div className="settings-panel">
          <h2 className="settings-panel-title">Media Connections</h2>
          <p className="settings-subtitle" style={{ marginTop: -4, marginBottom: 12 }}>
            Connect CineBoard to Plex, Radarr, and Sonarr so your display can reflect your media stack.
          </p>

          {renderConnectionSection("plex", "Plex", [
            { label: "Plex URL", key: "url" },
            { label: "Plex Token", key: "token", type: "password" },
          ])}

          {renderConnectionSection("radarr", "Radarr", [
            { label: "Radarr URL", key: "url" },
            { label: "Radarr API Key", key: "apiKey", type: "password" },
          ])}

          {renderConnectionSection("sonarr", "Sonarr", [
            { label: "Sonarr URL", key: "url" },
            { label: "Sonarr API Key", key: "apiKey", type: "password" },
          ])}

          <div className="settings-actions" style={{ marginTop: 10 }}>
            <button
              className="settings-button"
              onClick={handleSaveConnections}
              disabled={connectionsSaving}
            >
              {connectionsSaving ? "Saving..." : "Save Connections"}
            </button>
            <button
              className="settings-button"
              onClick={handleTestConnections}
              disabled={connectionsTesting}
            >
              {connectionsTesting ? "Testing..." : "Test Connections"}
            </button>
          </div>

          {connectionsMessage && (
            <p className="settings-status" style={{ marginTop: 10 }}>
              {connectionsMessage}
            </p>
          )}
        </div>

        <div className="settings-panel">
          <h2 className="settings-panel-title">Display Source</h2>

          <div className="settings-field">
            <label className="settings-field-label">Source Mode</label>
            <select
              value={settings.sourceMode}
              onChange={(e) =>
                updateSetting(
                  "sourceMode",
                  e.target.value as DisplaySettings["sourceMode"]
                )
              }
            >
              <option value="category">Category</option>
              <option value="genre">Genre</option>
              <option value="filters">Filters (Discover)</option>
              <option value="collection">Collection (Franchise)</option>
            </select>
          </div>

          {settings.sourceMode === "category" && (
            <div className="settings-field">
              <label className="settings-field-label">TMDB Category</label>
              <select
                value={settings.category}
                onChange={(e) =>
                  updateSetting(
                    "category",
                    e.target.value as DisplaySettings["category"]
                  )
                }
              >
                <option value="popular">Popular</option>
                <option value="now_playing">Now Playing</option>
                <option value="upcoming">Coming Soon</option>
                <option value="top_rated">Top Rated</option>
              </select>
            </div>
          )}

          {settings.sourceMode === "genre" && (
            <div className="settings-field">
              <label className="settings-field-label">TMDB Genre</label>
              <select
                value={String(settings.genreId)}
                onChange={(e) =>
                  updateSetting("genreId", Number(e.target.value))
                }
              >
                <option value="28">Action</option>
                <option value="12">Adventure</option>
                <option value="16">Animation</option>
                <option value="35">Comedy</option>
                <option value="80">Crime</option>
                <option value="18">Drama</option>
                <option value="14">Fantasy</option>
                <option value="27">Horror</option>
                <option value="9648">Mystery</option>
                <option value="10749">Romance</option>
                <option value="878">Science Fiction</option>
                <option value="53">Thriller</option>
                <option value="37">Western</option>
              </select>
            </div>
          )}

          {settings.sourceMode === "filters" && (
            <>
              <div className="settings-field">
                <label className="settings-field-label">Genre</label>
                <select
                  value={
                    settings.filterGenreId === null
                      ? "all"
                      : String(settings.filterGenreId)
                  }
                  onChange={(e) =>
                    updateSetting(
                      "filterGenreId",
                      e.target.value === "all" ? null : Number(e.target.value)
                    )
                  }
                >
                  <option value="all">All Genres</option>
                  <option value="28">Action</option>
                  <option value="12">Adventure</option>
                  <option value="16">Animation</option>
                  <option value="35">Comedy</option>
                  <option value="80">Crime</option>
                  <option value="18">Drama</option>
                  <option value="14">Fantasy</option>
                  <option value="27">Horror</option>
                  <option value="9648">Mystery</option>
                  <option value="10749">Romance</option>
                  <option value="878">Science Fiction</option>
                  <option value="53">Thriller</option>
                  <option value="37">Western</option>
                </select>
              </div>

              <div className="settings-field">
                <label className="settings-field-label">Year</label>
                <select
                  value={settings.filterYearBucket}
                  onChange={(e) =>
                    updateSetting(
                      "filterYearBucket",
                      e.target.value as YearBucketKey
                    )
                  }
                >
                  {yearBucketOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="settings-field">
                <label className="settings-field-label">Language</label>
                <select
                  value={settings.filterLanguage}
                  onChange={(e) =>
                    updateSetting("filterLanguage", e.target.value)
                  }
                >
                  {languageOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="settings-field">
                <label className="settings-field-label">Sort</label>
                <select
                  value={settings.filterSortBy}
                  onChange={(e) =>
                    updateSetting(
                      "filterSortBy",
                      e.target.value as TMDBSortByKey
                    )
                  }
                >
                  {sortByOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="settings-field">
                <label className="settings-field-label">Min Rating</label>
                <select
                  value={String(settings.filterMinRating)}
                  onChange={(e) =>
                    updateSetting("filterMinRating", Number(e.target.value))
                  }
                >
                  {minRatingOptions.map((o) => (
                    <option key={o.value} value={String(o.value)}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {settings.sourceMode === "collection" && (
            <>
              {settings.collectionId !== null && (
                <div className="settings-field">
                  <label className="settings-field-label">
                    Active Collection
                  </label>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      background: "#0c1a24",
                      border: "1px solid rgba(245, 193, 75, 0.35)",
                      borderRadius: 10,
                      padding: "10px 14px",
                    }}
                  >
                    <span
                      style={{ flex: 1, color: "#f5c14b", fontWeight: 600 }}
                    >
                      {settings.collectionName || `Collection #${settings.collectionId}`}
                    </span>
                    <button
                      type="button"
                      className="settings-button"
                      onClick={handleClearCollection}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              <form
                className="settings-field"
                onSubmit={handleCollectionSearch}
              >
                <label className="settings-field-label">
                  {settings.collectionId !== null
                    ? "Search for a different collection"
                    : "Search for a collection"}
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    placeholder="e.g. Halloween, Star Wars, Marvel..."
                    value={collectionQuery}
                    onChange={(e) => setCollectionQuery(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="settings-button">
                    {collectionLoading ? "Searching..." : "Search"}
                  </button>
                </div>
              </form>

              {collectionResults.length > 0 && (
                <div className="settings-field">
                  <label className="settings-field-label">
                    Pick a collection ({collectionResults.length} found)
                  </label>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      maxHeight: 300,
                      overflowY: "auto",
                      background: "#0c1a24",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: 10,
                      padding: 8,
                    }}
                  >
                    {collectionResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCollection(c)}
                        style={{
                          textAlign: "left",
                          background: "#101a24",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                          color: "#f5f7fa",
                          borderRadius: 8,
                          padding: "10px 12px",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>{c.name}</span>
                        <span style={{ color: "#9fb0bf", fontSize: "0.85rem" }}>
                          {c.movieCount} movies
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="settings-field">
            <label className="settings-field-label">Rotation Interval</label>
            <select
              value={String(settings.rotationSeconds)}
              onChange={(e) =>
                updateSetting("rotationSeconds", Number(e.target.value))
              }
            >
              <option value="15">15 seconds</option>
              <option value="30">30 seconds</option>
              <option value="60">60 seconds</option>
              <option value="120">120 seconds</option>
            </select>
          </div>

          <div className="settings-field">
            <label className="settings-field-label">Poster Fit Mode</label>
            <select
              value={settings.posterFitMode}
              onChange={(e) =>
                updateSetting(
                  "posterFitMode",
                  e.target.value as DisplaySettings["posterFitMode"]
                )
              }
            >
              <option value="contain">Contain</option>
              <option value="cover">Cover</option>
              <option value="stretch">Stretch</option>
            </select>
          </div>
        </div>

        <div className="settings-panel">
          <h2 className="settings-panel-title">Theater Name</h2>

          <div className="settings-field">
            <label className="settings-field-label">
              Theater / App Name (default top-left text)
            </label>
            <input
              type="text"
              value={settings.theaterName}
              onChange={(e) => updateSetting("theaterName", e.target.value)}
            />
          </div>
        </div>

        <div className="settings-panel">
          <h2 className="settings-panel-title">Banner Theme</h2>

          <div className="settings-field">
            <label className="settings-field-label">Active Theme</label>
            <select
              value={settings.activeThemeId}
              onChange={(e) => handleThemeChange(e.target.value)}
            >
              <optgroup label="Built-in">
                {allThemes
                  .filter((t) => t.builtIn)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </optgroup>
              {allThemes.some((t) => !t.builtIn) && (
                <optgroup label="Custom">
                  {allThemes
                    .filter((t) => !t.builtIn)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="settings-field">
            <label className="settings-field-label">Theme Preview</label>
            <div className="font-preview-card">
              <div
                className="font-preview-top"
                style={{ fontFamily: `'${activeTheme.topFont}', sans-serif` }}
              >
                {settings.theaterName} • Now Playing
              </div>
              <div
                className="font-preview-title"
                style={{
                  fontFamily: `'${activeTheme.titleFont}', sans-serif`,
                  fontSize: `${activeTheme.titleTextSize}px`,
                }}
              >
                The Conjuring
              </div>
              <div
                className="font-preview-bottom"
                style={{
                  fontFamily: `'${activeTheme.bottomFont}', sans-serif`,
                  fontSize: `${activeTheme.sideTextSize}px`,
                }}
              >
                Horror • R | 2013 • 112 min
              </div>
            </div>
          </div>

          <div className="settings-field">
            <p
              style={{ color: "#9fb0bf", fontSize: "0.88rem", lineHeight: 1.5 }}
            >
              Manage themes (create, edit, delete custom themes) on the{" "}
              <strong style={{ color: "#f5c14b" }}>Personalization</strong>{" "}
              page.
            </p>
          </div>
        </div>

        <div className="settings-panel">
          <h2 className="settings-panel-title">Top Banner Content</h2>

          {renderZoneEditor(
            "Top Left",
            "Theater Name",
            "topLeftContent",
            "topLeftCustomText"
          )}
          {renderZoneEditor(
            "Top Center",
            "Mode label",
            "topCenterContent",
            "topCenterCustomText"
          )}
          {renderZoneEditor(
            "Top Right",
            "Time + Date",
            "topRightContent",
            "topRightCustomText"
          )}
        </div>

        <div className="settings-panel">
          <h2 className="settings-panel-title">Bottom Banner Content</h2>

          {renderZoneEditor(
            "Bottom Left",
            "Genre + Rating",
            "bottomLeftContent",
            "bottomLeftCustomText"
          )}
          {renderZoneEditor(
            "Bottom Center",
            "Movie Title",
            "bottomCenterContent",
            "bottomCenterCustomText"
          )}
          {renderZoneEditor(
            "Bottom Right",
            "Year + Runtime",
            "bottomRightContent",
            "bottomRightCustomText"
          )}
        </div>

        <div className="settings-panel">
          <h2 className="settings-panel-title">Cache</h2>

          <div className="settings-field">
            <label className="settings-field-label">Cached Entries</label>
            <div style={{ color: "#f5c14b", fontWeight: 600 }}>
              {cacheStats.entries}
            </div>
          </div>

          <div className="settings-field">
            <label className="settings-field-label">Approximate Size</label>
            <div style={{ color: "#f5c14b", fontWeight: 600 }}>
              {cacheStats.approximateSize}
            </div>
          </div>

          <div className="settings-field">
            <button
              className="settings-button"
              type="button"
              onClick={refreshCacheStats}
            >
              Refresh Stats
            </button>
          </div>

          <div className="settings-field">
            <button
              className="settings-button"
              type="button"
              onClick={handleClearCache}
            >
              Clear All Cache
            </button>
          </div>
        </div>
      </section>

      {statusMessage && (
        <p className="settings-subtitle settings-status">{statusMessage}</p>
      )}
    </div>
  );
}

export default SettingsPage;
