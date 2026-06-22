import { Router } from "express";
import { db } from "../db.js";
import type { ActivityEvent, ErrorResponse } from "../types.js";

const router = Router();

// Cap the number of rows we ever return / keep, matching the frontend's MAX_ENTRIES.
const MAX_ENTRIES = 20;

// ----------------------------------------------------------
// Row -> ActivityEvent mapper
// ----------------------------------------------------------

interface ActivityRow {
  id: string;
  ts: number;
  kind: string;
  display_id: number | null;
  display_name: string | null;
  detail: string;
}

const validKinds = new Set([
  "movie-pinned",
  "movie-cleared",
  "theme-applied",
  "theme-created",
  "theme-deleted",
  "settings-saved",
  "display-reset",
  "display-renamed",
]);

function rowToEvent(row: ActivityRow): ActivityEvent | null {
  if (!validKinds.has(row.kind)) return null;
  return {
    id: row.id,
    ts: row.ts,
    kind: row.kind as ActivityEvent["kind"],
    displayId: row.display_id ?? undefined,
    displayName: row.display_name ?? undefined,
    detail: row.detail,
  };
}

// ----------------------------------------------------------
// GET /api/activity
//
// Returns the most recent events, newest first.
// Default: 5 (matches what the Dashboard shows).
// Override: ?limit=N (1..20).
// ----------------------------------------------------------

router.get("/", (req, res) => {
  const rawLimit = req.query.limit;
  let limit = 5;
  if (typeof rawLimit === "string") {
    const parsed = parseInt(rawLimit, 10);
    if (!Number.isNaN(parsed)) {
      limit = Math.min(Math.max(parsed, 1), MAX_ENTRIES);
    }
  }

  const rows = db
    .prepare("SELECT * FROM activity ORDER BY ts DESC LIMIT ?")
    .all(limit) as ActivityRow[];

  const events = rows
    .map(rowToEvent)
    .filter((e): e is ActivityEvent => e !== null);

  // Surface total count of all events stored (used by the "(N/20)" label
  // in the Dashboard's activity header).
  const countRow = db
    .prepare("SELECT COUNT(*) AS cnt FROM activity")
    .get() as { cnt: number };

  res.json({
    total: countRow.cnt,
    max: MAX_ENTRIES,
    events,
  });
});

// ----------------------------------------------------------
// GET /api/activity/all
//
// Convenience for the future Activity drawer/full view.
// Always returns up to MAX_ENTRIES.
// ----------------------------------------------------------

router.get("/all", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM activity ORDER BY ts DESC LIMIT ?")
    .all(MAX_ENTRIES) as ActivityRow[];

  const events = rows
    .map(rowToEvent)
    .filter((e): e is ActivityEvent => e !== null);

  res.json({
    total: events.length,
    max: MAX_ENTRIES,
    events,
  });
});

// ----------------------------------------------------------
// GET /api/activity/:id
//
// Single event lookup. Mostly useful for the future "expand event" view
// or for debugging. Returns 404 if not found.
// ----------------------------------------------------------

router.get("/:id", (req, res) => {
  const id = req.params.id;
  const row = db
    .prepare("SELECT * FROM activity WHERE id = ?")
    .get(id) as ActivityRow | undefined;

  if (!row) {
    const err: ErrorResponse = {
      error: "activity_not_found",
      detail: `No activity event with id "${id}"`,
    };
    res.status(404).json(err);
    return;
  }

  const event = rowToEvent(row);
  if (!event) {
    const err: ErrorResponse = {
      error: "activity_invalid",
      detail: "Stored event has unknown kind; ignoring",
    };
    res.status(500).json(err);
    return;
  }

  res.json(event);
});

export default router;