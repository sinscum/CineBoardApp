import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import "../styles/admin-layout.css";
import {
  loadAllProfiles,
  getActiveDisplayId,
  setActiveDisplayId,
  ACTIVE_DISPLAY_CHANGED_EVENT,
  PROFILES_CHANGED_EVENT,
} from "../services/displaySettings";
import type { DisplayProfile } from "../types/displaySettings";

function AdminLayout() {
  const [profiles, setProfiles] = useState<DisplayProfile[]>(loadAllProfiles());
  const [activeId, setActiveId] = useState<number>(getActiveDisplayId());

  // Keep profiles + active id in sync across the app
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

  function handleSelectDisplay(e: React.ChangeEvent<HTMLSelectElement>) {
    const newId = parseInt(e.target.value, 10);
    if (newId === 1 || newId === 2 || newId === 3) {
      setActiveDisplayId(newId);
      setActiveId(newId);
    }
  }

  function handleSave() {
    window.dispatchEvent(new Event("cineboard-save-settings"));
  }

  function handleReset() {
    window.dispatchEvent(new Event("cineboard-reset-settings"));
  }

  function handleOpenDisplay() {
    window.open(`/display/${activeId}`, "_blank");
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <h1>CineBoard</h1>
          <p>Cinema Poster Hub</p>
        </div>

        <nav className="admin-nav">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/library">Library</NavLink>
          <NavLink to="/displays">Displays</NavLink>
          <NavLink to="/schedules">Schedules</NavLink>
          <NavLink to="/personalization">Personalization</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>

        <div className="admin-sidebar-actions">
          <button
            className="admin-action-btn save"
            type="button"
            onClick={handleSave}
          >
            Save Settings
          </button>
          <button
            className="admin-action-btn reset"
            type="button"
            onClick={handleReset}
          >
            Reset Defaults
          </button>
        </div>
      </aside>

      <header className="admin-header">
        <div className="admin-header-left"/>
        
        <div className="admin-header-actions">
          <select
            className="admin-display-selector"
            value={activeId}
            onChange={handleSelectDisplay}
            title="Switch active display"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.enabled === false ? " (disabled)" : ""}
              </option>
            ))}
          </select>

          <button
            className="admin-action-btn"
            type="button"
            onClick={handleOpenDisplay}
            title="Open this display in a new tab"
          >
            Open Display
          </button>

          <div className="admin-search">
            <input type="text" placeholder="Search..." />
          </div>

          <div className="admin-user">Admin</div>
        </div>
      </header>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;