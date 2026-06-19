import { useEffect, useMemo, useState } from "react";
import "../styles/personalization-page.css";
import {
  loadDisplaySettings,
  loadProfile,
  applyThemeToDisplay,
  getActiveDisplayId,
  ACTIVE_DISPLAY_CHANGED_EVENT,
  PROFILES_CHANGED_EVENT,
} from "../services/displaySettings";
import {
  getAllThemes,
  addCustomTheme,
  updateCustomTheme,
  deleteCustomTheme,
  updateBuiltInTheme,
  restoreBuiltInTheme,
  isBuiltInModified,
  THEMES_CHANGED_EVENT,
} from "../services/themes";
import type {
  BannerTheme,
  BannerFontPreset,
  BannerMode,
} from "../types/displaySettings";

type EditorMode =
  | { kind: "closed" }
  | { kind: "new" }
  | { kind: "duplicate"; source: BannerTheme }
  | { kind: "edit"; source: BannerTheme }
  | { kind: "edit-builtin"; source: BannerTheme };

const FONT_OPTIONS: BannerFontPreset[] = [
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

function emptyDraft(): BannerTheme {
  return {
    id: "",
    name: "",
    builtIn: false,
    topFont: "Oswald",
    bottomFont: "Montserrat",
    titleFont: "Bebas Neue",
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
  };
}

function draftFromTheme(theme: BannerTheme, asNew: boolean): BannerTheme {
  if (asNew) {
    return {
      ...theme,
      id: "",
      builtIn: false,
      name: `${theme.name} Copy`,
    };
  }
  return { ...theme };
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed to read image file."));
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

function PersonalizationPage() {
  const [activeId, setActiveId] = useState<number>(getActiveDisplayId());
  const [activeName, setActiveName] = useState<string>(
    loadProfile(getActiveDisplayId()).name
  );
  const [activeThemeId, setActiveThemeId] = useState<string>(
    loadDisplaySettings(getActiveDisplayId()).activeThemeId
  );
  const [themesVersion, setThemesVersion] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");

  const [editor, setEditor] = useState<EditorMode>({ kind: "closed" });
  const [draft, setDraft] = useState<BannerTheme>(emptyDraft());

  useEffect(() => {
    function refresh() {
      const id = getActiveDisplayId();
      setActiveId(id);
      setActiveName(loadProfile(id).name);
      setActiveThemeId(loadDisplaySettings(id).activeThemeId);
    }
    function refreshThemes() {
      setThemesVersion((n) => n + 1);
      refresh();
    }
    window.addEventListener(ACTIVE_DISPLAY_CHANGED_EVENT, refresh);
    window.addEventListener(PROFILES_CHANGED_EVENT, refresh);
    window.addEventListener(THEMES_CHANGED_EVENT, refreshThemes);
    window.addEventListener("storage", refreshThemes);
    return () => {
      window.removeEventListener(ACTIVE_DISPLAY_CHANGED_EVENT, refresh);
      window.removeEventListener(PROFILES_CHANGED_EVENT, refresh);
      window.removeEventListener(THEMES_CHANGED_EVENT, refreshThemes);
      window.removeEventListener("storage", refreshThemes);
    };
  }, []);

  const allThemes = useMemo(() => getAllThemes(), [themesVersion]);
  const builtInThemes = allThemes.filter((t) => t.builtIn);
  const customThemes = allThemes.filter((t) => !t.builtIn);

  function showStatus(msg: string) {
    setStatusMessage(msg);
    window.setTimeout(() => setStatusMessage(""), 2500);
  }

  // ---- Editor controls ----

  function openEditorNew() {
    setDraft(emptyDraft());
    setEditor({ kind: "new" });
  }

  function openEditorDuplicate(source: BannerTheme) {
    setDraft(draftFromTheme(source, true));
    setEditor({ kind: "duplicate", source });
  }

  function openEditorEdit(source: BannerTheme) {
    setDraft(draftFromTheme(source, false));
    setEditor({ kind: "edit", source });
  }

  function openEditorEditBuiltIn(source: BannerTheme) {
    setDraft(draftFromTheme(source, false));
    setEditor({ kind: "edit-builtin", source });
  }

  function closeEditor() {
    setEditor({ kind: "closed" });
    setDraft(emptyDraft());
  }

  function updateDraft<K extends keyof BannerTheme>(
    key: K,
    value: BannerTheme[K]
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleBannerUpload(
    key: "topBannerImage" | "bottomBannerImage",
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const url = await readFileAsDataUrl(file);
      updateDraft(key, url);
    } catch {
      showStatus("Failed to load banner image.");
    }
  }

  function handleClearBanner(key: "topBannerImage" | "bottomBannerImage") {
    updateDraft(key, null);
  }

  function handleSaveAndApply() {
    if (editor.kind === "edit-builtin") {
      const original = editor.source;
      const updated: BannerTheme = {
        ...draft,
        id: original.id,
        name: original.name,
        description: original.description,
        builtIn: true,
      };
      updateBuiltInTheme(updated);
      applyThemeToDisplay(updated.id, activeId);
      setActiveThemeId(updated.id);
      showStatus(`Saved "${original.name}" and applied to ${activeName}.`);
      closeEditor();
      return;
    }

    const name = draft.name.trim();
    if (!name) {
      showStatus("Please enter a theme name.");
      return;
    }

    if (editor.kind === "edit") {
      const updated: BannerTheme = { ...draft, name, builtIn: false };
      updateCustomTheme(updated);
      applyThemeToDisplay(updated.id, activeId);
      setActiveThemeId(updated.id);
      showStatus(`Saved "${name}" and applied to ${activeName}.`);
      closeEditor();
      return;
    }

    const created = addCustomTheme({ ...draft, name, builtIn: false });
    applyThemeToDisplay(created.id, activeId);
    setActiveThemeId(created.id);
    showStatus(`Created "${name}" and applied to ${activeName}.`);
    closeEditor();
  }

  // ---- Card actions ----

  function handleApply(theme: BannerTheme) {
    applyThemeToDisplay(theme.id, activeId);
    setActiveThemeId(theme.id);
    showStatus(`Applied "${theme.name}" to ${activeName}.`);
  }

  function handleDelete(theme: BannerTheme) {
    const ok = window.confirm(
      `Delete custom theme "${theme.name}"?\n\nDisplays using this theme will fall back to Classic Cinema.`
    );
    if (!ok) return;
    deleteCustomTheme(theme.id);
    showStatus(`Deleted "${theme.name}".`);
  }

  function handleRestoreBuiltIn(theme: BannerTheme) {
    const ok = window.confirm(
      `Restore "${theme.name}" to its original default?\n\nAny customizations will be discarded.`
    );
    if (!ok) return;
    restoreBuiltInTheme(theme.id);
    showStatus(`Restored "${theme.name}" to defaults.`);
  }

  function renderThemeCard(theme: BannerTheme) {
    const isActive = theme.id === activeThemeId;
    const modified = theme.builtIn && isBuiltInModified(theme.id);

    return (
      <article
        key={theme.id}
        className={`theme-card ${isActive ? "theme-card-active" : ""} ${
          !theme.builtIn ? "theme-card-custom" : ""
        }`}
      >
        <div className="theme-card-header">
          <div className="theme-card-title-wrap">
            <h3 className="theme-card-title">{theme.name}</h3>
          </div>
          <div className="theme-card-badges">
            {isActive && (
              <span className="theme-badge badge-active">ACTIVE</span>
            )}
            <span
              className={`theme-badge ${
                theme.builtIn ? "badge-builtin" : "badge-custom"
              }`}
            >
              {theme.builtIn ? "BUILT-IN" : "CUSTOM"}
            </span>
            {modified && (
              <span className="theme-badge badge-modified">MODIFIED</span>
            )}
          </div>
        </div>

        {theme.description && (
          <p className="theme-card-description">{theme.description}</p>
        )}

        <div className="theme-card-preview">
          <div
            className="theme-preview-line theme-preview-top"
            style={{ fontFamily: `'${theme.topFont}', sans-serif` }}
          >
            {activeName.toUpperCase()} • NOW PLAYING
          </div>
          <div
            className="theme-preview-line theme-preview-title"
            style={{
              fontFamily: `'${theme.titleFont}', sans-serif`,
              fontSize: `${Math.min(theme.titleTextSize, 38)}px`,
            }}
          >
            THE CONJURING
          </div>
          <div
            className="theme-preview-line theme-preview-bottom"
            style={{
              fontFamily: `'${theme.bottomFont}', sans-serif`,
              fontSize: `${theme.sideTextSize}px`,
            }}
          >
            Horror • R | 2013 • 112 min
          </div>
        </div>

        <div className="theme-card-fonts">
          <span>Top: {theme.topFont}</span>
          <span>Bottom: {theme.bottomFont}</span>
          <span>Title: {theme.titleFont}</span>
        </div>

        <div className="theme-card-actions">
          {!isActive && (
            <button
              type="button"
              className="theme-action-btn primary"
              onClick={() => handleApply(theme)}
            >
              Apply to {activeName}
            </button>
          )}
          {isActive && <span className="theme-applied-tag">Applied here</span>}

          {theme.builtIn ? (
            <>
              <button
                type="button"
                className="theme-action-btn"
                onClick={() => openEditorEditBuiltIn(theme)}
              >
                Edit
              </button>
              <button
                type="button"
                className="theme-action-btn"
                onClick={() => openEditorDuplicate(theme)}
              >
                Duplicate
              </button>
              {modified && (
                <button
                  type="button"
                  className="theme-action-btn restore"
                  onClick={() => handleRestoreBuiltIn(theme)}
                >
                  Restore Defaults
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                className="theme-action-btn"
                onClick={() => openEditorEdit(theme)}
              >
                Edit
              </button>
              <button
                type="button"
                className="theme-action-btn danger"
                onClick={() => handleDelete(theme)}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </article>
    );
  }

  function renderEditor() {
    if (editor.kind === "closed") return null;

    const isBuiltInEdit = editor.kind === "edit-builtin";

    const headerTitle =
      editor.kind === "new"
        ? "Build New Theme"
        : editor.kind === "duplicate"
        ? `Duplicate "${editor.source.name}"`
        : editor.kind === "edit-builtin"
        ? `Edit "${editor.source.name}" (built-in)`
        : `Edit "${(editor as { source: BannerTheme }).source.name}"`;

    return (
      <section className="theme-editor">
        <div className="theme-editor-header">
          <h2 className="theme-editor-title">{headerTitle}</h2>
          <button
            type="button"
            className="theme-action-btn"
            onClick={closeEditor}
          >
            Close
          </button>
        </div>

        {isBuiltInEdit && (
          <p className="theme-editor-notice">
            Editing a built-in theme overrides its defaults. The original name
            and description are kept locked. You can restore defaults from the
            theme card any time.
          </p>
        )}

        <div className="theme-editor-grid">
          {!isBuiltInEdit && (
            <div className="theme-editor-section">
              <h3>Theme Name</h3>
              <div className="theme-editor-field">
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => updateDraft("name", e.target.value)}
                  placeholder="e.g. My Horror Night"
                  maxLength={40}
                />
              </div>
            </div>
          )}

          <div className="theme-editor-section">
            <h3>Fonts</h3>
            <div className="theme-editor-field">
              <label>Top Banner Font</label>
              <select
                value={draft.topFont}
                onChange={(e) =>
                  updateDraft("topFont", e.target.value as BannerFontPreset)
                }
              >
                {FONT_OPTIONS.map((f) => (
                  <option
                    key={f}
                    value={f}
                    style={{ fontFamily: `'${f}', sans-serif` }}
                  >
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div className="theme-editor-field">
              <label>Bottom Banner Font</label>
              <select
                value={draft.bottomFont}
                onChange={(e) =>
                  updateDraft("bottomFont", e.target.value as BannerFontPreset)
                }
              >
                {FONT_OPTIONS.map((f) => (
                  <option
                    key={f}
                    value={f}
                    style={{ fontFamily: `'${f}', sans-serif` }}
                  >
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div className="theme-editor-field">
              <label>Movie Title Font</label>
              <select
                value={draft.titleFont}
                onChange={(e) =>
                  updateDraft("titleFont", e.target.value as BannerFontPreset)
                }
              >
                {FONT_OPTIONS.map((f) => (
                  <option
                    key={f}
                    value={f}
                    style={{ fontFamily: `'${f}', sans-serif` }}
                  >
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="theme-editor-section">
            <h3>Text Sizes</h3>
            <div className="theme-editor-field">
              <label>Side Text Size: {draft.sideTextSize}px</label>
              <input
                type="range"
                min={14}
                max={48}
                step={1}
                value={draft.sideTextSize}
                onChange={(e) =>
                  updateDraft("sideTextSize", Number(e.target.value))
                }
              />
            </div>
            <div className="theme-editor-field">
              <label>Movie Title Size: {draft.titleTextSize}px</label>
              <input
                type="range"
                min={22}
                max={80}
                step={1}
                value={draft.titleTextSize}
                onChange={(e) =>
                  updateDraft("titleTextSize", Number(e.target.value))
                }
              />
            </div>
          </div>

          <div className="theme-editor-section">
            <h3>Top Banner</h3>
            <div className="theme-editor-field">
              <label>Mode</label>
              <select
                value={draft.topBannerMode}
                onChange={(e) =>
                  updateDraft("topBannerMode", e.target.value as BannerMode)
                }
              >
                <option value="auto">Auto Theme</option>
                <option value="custom">Custom Image</option>
                <option value="none">None</option>
              </select>
            </div>
            <div className="theme-editor-field">
              <label>Height: {draft.topBannerHeight}px</label>
              <input
                type="range"
                min={40}
                max={220}
                step={5}
                value={draft.topBannerHeight}
                onChange={(e) =>
                  updateDraft("topBannerHeight", Number(e.target.value))
                }
              />
            </div>
            <div className="theme-editor-field">
              <label>Custom Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleBannerUpload("topBannerImage", e)}
              />
              {draft.topBannerImage && (
                <button
                  type="button"
                  className="theme-action-btn"
                  onClick={() => handleClearBanner("topBannerImage")}
                >
                  Clear Top Image
                </button>
              )}
            </div>
          </div>

          <div className="theme-editor-section">
            <h3>Bottom Banner</h3>
            <div className="theme-editor-field">
              <label>Mode</label>
              <select
                value={draft.bottomBannerMode}
                onChange={(e) =>
                  updateDraft("bottomBannerMode", e.target.value as BannerMode)
                }
              >
                <option value="auto">Auto Theme</option>
                <option value="custom">Custom Image</option>
                <option value="none">None</option>
              </select>
            </div>
            <div className="theme-editor-field">
              <label>Height: {draft.bottomBannerHeight}px</label>
              <input
                type="range"
                min={40}
                max={220}
                step={5}
                value={draft.bottomBannerHeight}
                onChange={(e) =>
                  updateDraft("bottomBannerHeight", Number(e.target.value))
                }
              />
            </div>
            <div className="theme-editor-field">
              <label>Custom Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleBannerUpload("bottomBannerImage", e)}
              />
              {draft.bottomBannerImage && (
                <button
                  type="button"
                  className="theme-action-btn"
                  onClick={() => handleClearBanner("bottomBannerImage")}
                >
                  Clear Bottom Image
                </button>
              )}
            </div>
          </div>

          <div className="theme-editor-section">
            <h3>Text Visibility</h3>
            <div className="theme-editor-field theme-editor-checks">
              <label>
                <input
                  type="checkbox"
                  checked={draft.showTopLeft}
                  onChange={(e) => updateDraft("showTopLeft", e.target.checked)}
                />{" "}
                Show Top Left
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={draft.showTopCenter}
                  onChange={(e) =>
                    updateDraft("showTopCenter", e.target.checked)
                  }
                />{" "}
                Show Top Center
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={draft.showTopRight}
                  onChange={(e) =>
                    updateDraft("showTopRight", e.target.checked)
                  }
                />{" "}
                Show Top Right
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={draft.showBottomLeft}
                  onChange={(e) =>
                    updateDraft("showBottomLeft", e.target.checked)
                  }
                />{" "}
                Show Bottom Left
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={draft.showBottomCenter}
                  onChange={(e) =>
                    updateDraft("showBottomCenter", e.target.checked)
                  }
                />{" "}
                Show Bottom Center
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={draft.showBottomRight}
                  onChange={(e) =>
                    updateDraft("showBottomRight", e.target.checked)
                  }
                />{" "}
                Show Bottom Right
              </label>
            </div>
          </div>

          <div className="theme-editor-section theme-editor-preview-section">
            <h3>Live Preview</h3>
            <div className="theme-card-preview theme-editor-preview">
              <div
                className="theme-preview-line theme-preview-top"
                style={{ fontFamily: `'${draft.topFont}', sans-serif` }}
              >
                {activeName.toUpperCase()} • NOW PLAYING
              </div>
              <div
                className="theme-preview-line theme-preview-title"
                style={{
                  fontFamily: `'${draft.titleFont}', sans-serif`,
                  fontSize: `${Math.min(draft.titleTextSize, 48)}px`,
                }}
              >
                THE CONJURING
              </div>
              <div
                className="theme-preview-line theme-preview-bottom"
                style={{
                  fontFamily: `'${draft.bottomFont}', sans-serif`,
                  fontSize: `${draft.sideTextSize}px`,
                }}
              >
                Horror • R | 2013 • 112 min
              </div>
            </div>
          </div>
        </div>

        <div className="theme-editor-footer">
          <button
            type="button"
            className="theme-action-btn primary"
            onClick={handleSaveAndApply}
          >
            Save &amp; Apply to {activeName}
          </button>
          <button
            type="button"
            className="theme-action-btn"
            onClick={closeEditor}
          >
            Cancel
          </button>
        </div>
      </section>
    );
  }

  return (
    <main className="personalization-page">
      <section className="personalization-heading">
        <h1>Personalization</h1>
        <p className="personalization-subtitle">
          Pick, edit, or build a banner theme for{" "}
          <strong style={{ color: "#f5c14b" }}>{activeName}</strong>.
        </p>
      </section>

      {statusMessage && (
        <p className="personalization-status">{statusMessage}</p>
      )}

      <section className="personalization-save-bar">
        <button
          type="button"
          className="theme-action-btn primary"
          onClick={openEditorNew}
        >
          + Build New Theme
        </button>
        <span className="personalization-save-hint">
          Or click <strong>Duplicate</strong> on any built-in theme to start
          from it.
        </span>
      </section>

      {renderEditor()}

      <section className="personalization-theme-section">
        <h2 className="personalization-section-title">Built-in Themes</h2>
        <div className="personalization-grid">
          {builtInThemes.map((t) => renderThemeCard(t))}
        </div>
      </section>

      <section className="personalization-theme-section">
        <h2 className="personalization-section-title">
          Custom Themes
          <span className="personalization-section-count">
            ({customThemes.length})
          </span>
        </h2>
        {customThemes.length === 0 ? (
          <p className="personalization-empty">
            No custom themes yet. Click "+ Build New Theme" above, or
            "Duplicate" on any built-in theme to start.
          </p>
        ) : (
          <div className="personalization-grid">
            {customThemes.map((t) => renderThemeCard(t))}
          </div>
        )}
      </section>
    </main>
  );
}

export default PersonalizationPage;