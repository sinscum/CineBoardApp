import { useEffect, useState } from "react";
import "../styles/displays-page.css";
import {
  loadAllProfiles,
  saveProfile,
  getActiveDisplayId,
  setActiveDisplayId,
  resetDisplaySettings,
  setActiveMovie,
  ACTIVE_DISPLAY_CHANGED_EVENT,
  PROFILES_CHANGED_EVENT,
} from "../services/displaySettings";
import type { DisplayProfile } from "../types/displaySettings";
import { GENRE_NAMES } from "../constants/genres";

function DisplaysPage() {
  const [profiles, setProfiles] = useState<DisplayProfile[]>(loadAllProfiles());
  const [activeId, setActiveId] = useState<number>(getActiveDisplayId());
  const [statusMessage, setStatusMessage] = useState("");
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    function refresh() {
      setProfiles(loadAllProfiles());
      setActiveId(getActiveDisplayId());
    }
    window.addEventListener("storage", refresh);
    window.addEventListener(PROFILES_CHANGED_EVENT, refresh);
    window.addEventListener(ACTIVE_DISPLAY_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(PROFILES_CHANGED_EVENT, refresh);
      window.removeEventListener(ACTIVE_DISPLAY_CHANGED_EVENT, refresh);
    };
  }, []);

  function showStatus(msg: string) {
    setStatusMessage(msg);
    window.setTimeout(() => setStatusMessage(""), 2500);
  }

  function startRename(profile: DisplayProfile) {
    setRenamingId(profile.id);
    setRenameValue(profile.name);
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue("");
  }

  function saveRename(profile: DisplayProfile) {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      cancelRename();
      return;
    }
    if (trimmed === profile.name) {
      cancelRename();
      return;
    }
    const updated: DisplayProfile = { ...profile, name: trimmed };
    saveProfile(updated);
    setProfiles(loadAllProfiles());
    setRenamingId(null);
    setRenameValue("");
    showStatus(`Renamed to "${trimmed}".`);
  }

  function handleToggleEnabled(profile: DisplayProfile) {
    const updated: DisplayProfile = { ...profile, enabled: !profile.enabled };
    saveProfile(updated);
    setProfiles(loadAllProfiles());
    showStatus(`${profile.name} ${updated.enabled ? "enabled" : "disabled"}.`);
  }

  function handleSetActive(profile: DisplayProfile) {
    setActiveDisplayId(profile.id);
    setActiveId(profile.id);
    showStatus(`${profile.name} is now the active display.`);
  }

  function handleResetProfile(profile: DisplayProfile) {
    const ok = window.confirm(
      `Reset all settings for "${profile.name}" to defaults?\n\nThis will also clear any pinned movie.`
    );
    if (!ok) return;
    resetDisplaySettings(profile.id);
    setActiveMovie(null, profile.id);
    setProfiles(loadAllProfiles());
    showStatus(`${profile.name} reset to defaults.`);
  }

  function handleClearPinned(profile: DisplayProfile) {
    setActiveMovie(null, profile.id);
    setProfiles(loadAllProfiles());
    showStatus(`Cleared pinned movie on ${profile.name}.`);
  }

  function handleOpenDisplay(profile: DisplayProfile) {
    window.open(`/display/${profile.id}`, "_blank");
  }

  function describeSource(profile: DisplayProfile): string {
    const s = profile.settings;
    if (s.sourceMode === "genre") {
      return `Genre: ${GENRE_NAMES[s.genreId] ?? "Unknown"}`;
    }
    const catNames: Record<string, string> = {
      popular: "Popular",
      now_playing: "Now Playing",
      upcoming: "Coming Soon",
      top_rated: "Top Rated",
    };
    return `Category: ${catNames[s.category] ?? s.category}`;
  }

  return (
    <div className="displays-page">
      <section className="displays-heading">
        <h1>Displays</h1>
        <p className="displays-subtitle">
          Manage your 3 display profiles. Each profile has its own settings,
          pinned movie, and personalization.
        </p>
      </section>

      {statusMessage && <p className="displays-status">{statusMessage}</p>}

      <section className="displays-grid">
        {profiles.map((profile) => {
          const isActive = profile.id === activeId;
          const isRenaming = renamingId === profile.id;

          return (
            <article
              key={profile.id}
              className={`display-card ${isActive ? "display-card-active" : ""} ${
                !profile.enabled ? "display-card-disabled" : ""
              }`}
            >
              <div className="display-card-header">
                {isRenaming ? (
                  <div className="display-card-rename">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      autoFocus
                      maxLength={40}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRename(profile);
                        if (e.key === "Escape") cancelRename();
                      }}
                    />
                    <div className="display-card-rename-buttons">
                      <button
                        type="button"
                        className="display-action-btn save"
                        onClick={() => saveRename(profile)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="display-action-btn"
                        onClick={cancelRename}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="display-card-title-wrap">
                      <h2 className="display-card-title">{profile.name}</h2>
                      <button
                        type="button"
                        className="display-card-rename-btn"
                        onClick={() => startRename(profile)}
                        title="Rename"
                      >
                        ✎
                      </button>
                    </div>
                    <div className="display-card-badges">
                      {isActive && (
                        <span className="display-card-badge badge-active">
                          ACTIVE
                        </span>
                      )}
                      {!profile.enabled && (
                        <span className="display-card-badge badge-disabled">
                          DISABLED
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="display-card-meta">
                <p>
                  <strong>ID:</strong> Display {profile.id}
                </p>
                <p>
                  <strong>URL:</strong> <code>/display/{profile.id}</code>
                </p>
                <p>
                  <strong>Source:</strong> {describeSource(profile)}
                </p>
                <p>
                  <strong>Theater Name:</strong> {profile.settings.theaterName}
                </p>
                <p>
                  <strong>Font Theme:</strong> {profile.settings.activeThemeId}
                </p>
                <p>
                  <strong>Rotation:</strong> {profile.settings.rotationSeconds}s
                </p>
                <p>
                  <strong>Pinned:</strong> {profile.activeMovie?.title ?? "—"}
                </p>
              </div>

              <div className="display-card-actions">
                {!isActive && (
                  <button
                    type="button"
                    className="display-action-btn primary"
                    onClick={() => handleSetActive(profile)}
                  >
                    Set Active
                  </button>
                )}
                <button
                  type="button"
                  className="display-action-btn"
                  onClick={() => handleOpenDisplay(profile)}
                >
                  Open Display
                </button>
                <button
                  type="button"
                  className="display-action-btn"
                  onClick={() => handleToggleEnabled(profile)}
                >
                  {profile.enabled ? "Disable" : "Enable"}
                </button>
                {profile.activeMovie && (
                  <button
                    type="button"
                    className="display-action-btn"
                    onClick={() => handleClearPinned(profile)}
                  >
                    Clear Pinned
                  </button>
                )}
                <button
                  type="button"
                  className="display-action-btn danger"
                  onClick={() => handleResetProfile(profile)}
                >
                  Reset to Defaults
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

export default DisplaysPage;