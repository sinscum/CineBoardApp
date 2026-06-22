import { Router } from "express";
import { db, nowMs, getAppState } from "../db.js";
import {
  DEFAULT_DISPLAY_PROFILES,
  DEFAULT_DISPLAY_SETTINGS,
  type DisplayProfile,
  type DisplaySettings,
  type ActiveMovie,
  type ErrorResponse,
} from "../types.js";

const router = Router();

// ----------------------------------------------------------
// First-boot seeding: make sure 3 profiles always exist.
// ----------------------------------------------------------
//
// We do this once at module load. If no rows exist in `profiles`,
// we insert the three defaults. Existing data is never touched.

function seedProfilesIfEmpty(): void {
  const row = db
    .prepare("SELECT COUNT(*) AS cnt FROM profiles")
    .get() as { cnt: number };

  if (row.cnt > 0) return;

  const insert = db.prepare(
    `INSERT INTO profiles (id, name, enabled, settings_json, active_movie_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const ts = nowMs();
  const txn = db.transaction(() => {
    for (const p of DEFAULT_DISPLAY_PROFILES) {
      insert.run(
        p.id,
        p.name,
        p.enabled ? 1 : 0,
        JSON.stringify(p.settings),
        null,
        ts
      );
    }
  });

  txn();
  console.log("[profiles] Seeded 3 default profiles into empty DB.");
}

seedProfilesIfEmpty();

// ----------------------------------------------------------
// Row -> Profile mapper
// ----------------------------------------------------------

interface ProfileRow {
  id: number;
  name: string;
  enabled: number;
  settings_json: string;
  active_movie_json: string | null;
  updated_at: number;
}

function rowToProfile(row: ProfileRow): DisplayProfile {
  let settings: DisplaySettings;
  try {
    settings = JSON.parse(row.settings_json);
  } catch {
    // If the row's JSON is corrupted, fall back to defaults so the app
    // doesn't crash; the user can re-save settings to fix it.
    settings = { ...DEFAULT_DISPLAY_SETTINGS };
  }

  let activeMovie: ActiveMovie | null = null;
  if (row.active_movie_json) {
    try {
      const parsed = JSON.parse(row.active_movie_json);
      if (
        parsed &&
        typeof parsed.id === "number" &&
        typeof parsed.title === "string"
      ) {
        activeMovie = { id: parsed.id, title: parsed.title };
      }
    } catch {
      activeMovie = null;
    }
  }

  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled === 1,
    settings,
    activeMovie,
  };
}

// ----------------------------------------------------------
// GET /api/profiles
// Returns all 3 profiles in ascending id order.
// ----------------------------------------------------------

router.get("/", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM profiles ORDER BY id ASC")
    .all() as ProfileRow[];

  const profiles = rows.map(rowToProfile);
  const activeId = parseInt(getAppState("active_display_id") ?? "1", 10);

  res.json({
    activeDisplayId: activeId,
    profiles,
  });
});

// ----------------------------------------------------------
// GET /api/profiles/active
// Convenience: returns just the currently-active profile.
// ----------------------------------------------------------

router.get("/active", (_req, res) => {
  const activeId = parseInt(getAppState("active_display_id") ?? "1", 10);

  const row = db
    .prepare("SELECT * FROM profiles WHERE id = ?")
    .get(activeId) as ProfileRow | undefined;

  if (!row) {
    const err: ErrorResponse = {
      error: "no_active_profile",
      detail: `No profile found for active id ${activeId}`,
    };
    res.status(404).json(err);
    return;
  }

  res.json(rowToProfile(row));
});

// ----------------------------------------------------------
// GET /api/profiles/:id
// Single profile by id (1, 2, or 3).
// ----------------------------------------------------------

router.get("/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (Number.isNaN(id) || id < 1 || id > 3) {
    const err: ErrorResponse = {
      error: "invalid_id",
      detail: `Display id must be 1, 2, or 3 (got ${req.params.id})`,
    };
    res.status(400).json(err);
    return;
  }

  const row = db
    .prepare("SELECT * FROM profiles WHERE id = ?")
    .get(id) as ProfileRow | undefined;

  if (!row) {
    const err: ErrorResponse = {
      error: "not_found",
      detail: `No profile for id ${id}`,
    };
    res.status(404).json(err);
    return;
  }

  res.json(rowToProfile(row));
});

export default router;