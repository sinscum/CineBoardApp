import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

// Resolve DB path from env or fall back to local dev location
const DB_PATH = process.env.CINEBOARD_DB_PATH ?? "./data/cineboard.db";

// Ensure the directory exists before opening
try {
  mkdirSync(dirname(DB_PATH), { recursive: true });
} catch {
  // ignore — better-sqlite3 will give a clearer error if the path is unwritable
}

export const db = new Database(DB_PATH);

// Pragmas: tune for our use case
db.pragma("journal_mode = WAL");        // Write-ahead logging, better concurrency
db.pragma("foreign_keys = ON");         // Enforce FK constraints
db.pragma("synchronous = NORMAL");      // Faster writes, still safe with WAL

// ----------------------------------------------------------
// Schema
// ----------------------------------------------------------

// Display profiles (3 expected: ids 1, 2, 3)
db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 0,
    settings_json TEXT NOT NULL,
    active_movie_json TEXT,
    updated_at INTEGER NOT NULL
  );
`);

// Custom themes (built-in themes live in code, not the DB)
db.exec(`
  CREATE TABLE IF NOT EXISTS custom_themes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    theme_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

// User overrides applied on top of built-in themes
db.exec(`
  CREATE TABLE IF NOT EXISTS builtin_theme_overrides (
    builtin_id TEXT PRIMARY KEY,
    theme_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

// Active display tracking (single row, singleton pattern)
db.exec(`
  CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

// Activity log (recent events, capped at ~50 in practice)
db.exec(`
  CREATE TABLE IF NOT EXISTS activity (
    id TEXT PRIMARY KEY,
    ts INTEGER NOT NULL,
    kind TEXT NOT NULL,
    display_id INTEGER,
    display_name TEXT,
    detail TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_activity_ts ON activity (ts DESC);
`);

// Banner image metadata (Phase B2 will use this; safe to define now)
db.exec(`
  CREATE TABLE IF NOT EXISTS banners (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    width INTEGER,
    height INTEGER,
    created_at INTEGER NOT NULL
  );
`);

// TMDB cache (replaces the localStorage cache in Phase B; safe to define now)
db.exec(`
  CREATE TABLE IF NOT EXISTS tmdb_cache (
    cache_key TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL,
    cached_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tmdb_cache_expires ON tmdb_cache (expires_at);
`);

console.log(`[db] SQLite initialized at ${DB_PATH}`);

// ----------------------------------------------------------
// Tiny helpers used by routes
// ----------------------------------------------------------

export function nowMs(): number {
  return Date.now();
}

export function getAppState(key: string): string | null {
  const row = db
    .prepare("SELECT value FROM app_state WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setAppState(key: string, value: string): void {
  db.prepare(
    `INSERT INTO app_state (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(key, value, nowMs());
}

export function closeDb(): void {
  try {
    db.close();
  } catch {
    // ignore
  }
}