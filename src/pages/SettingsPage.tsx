import { useEffect, useMemo, useState } from "react";
import "../styles/settings-page.css";
import type {
  DisplaySettings,
  BannerContentKind,
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
import { GENRES } from "../constants/genres";

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

  type ContentKey = keyof Pick<
    DisplaySettings,
    | "topLeftContent"
    | "topCenterContent"
    | "topRightContent"
    | "bottomLeftContent"
    | "bottomCenterContent"
    | "bottomRightContent"
  >;

  type CustomTextKey = keyof Pick<
    DisplaySettings,
    | "topLeftCustomText"
    | "topCenterCustomText"
    | "topRightCustomText"
    | "bottomLeftCustomText"
    | "bottomCenterCustomText"
    | "bottomRightCustomText"
  >;

  function renderZoneEditor(
    label: string,
    autoHint: string,
    contentKey: ContentKey,
    customKey: CustomTextKey
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
            value={customValue}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, [customKey]: e.target.value }))
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
            </select>
          </div>

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

          <div className="settings-field">
            <label className="settings-field-label">TMDB Genre</label>
            <select
              value={String(settings.genreId)}
              onChange={(e) => updateSetting("genreId", Number(e.target.value))}
            >
              {GENRES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

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
            "Mode label (e.g. Horror Showcase)",
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
