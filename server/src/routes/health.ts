import { Router } from "express";
import { db, getAppState } from "../db.js";
import type { HealthResponse } from "../types.js";

const router = Router();

const STARTED_AT = Date.now();

/**
 * GET /api/health
 *
 * Returns a snapshot of service connectivity / configuration.
 * The Dashboard's status chips will poll this every ~30 seconds.
 *
 * NOTE: Phase A only checks *whether providers are configured*
 * (env vars present, DB reachable). Reachability checks (actually
 * pinging TMDB and Plex) happen in Phase D when we proxy those APIs.
 */
router.get("/", (_req, res) => {
  const tmdbConfigured = Boolean(
    process.env.TMDB_TOKEN || process.env.VITE_TMDB_READ_TOKEN
  );

  const plexConfigured = Boolean(
    process.env.PLEX_TOKEN && process.env.PLEX_BASE_URL
  );

  let dbOk = false;
  try {
    // Quick query to confirm the DB is responsive
    const row = db.prepare("SELECT 1 as ok").get() as { ok: number } | undefined;
    dbOk = row?.ok === 1;
  } catch {
    dbOk = false;
  }

  const overall: HealthResponse["status"] = !dbOk
    ? "down"
    : !tmdbConfigured
    ? "degraded"
    : "ok";

  const uptimeSec = Math.floor((Date.now() - STARTED_AT) / 1000);

  const body: HealthResponse = {
    status: overall,
    uptimeSec,
    startedAt: STARTED_AT,
    services: {
      tmdb: {
        configured: tmdbConfigured,
      },
      plex: {
        configured: plexConfigured,
        baseUrl: plexConfigured ? process.env.PLEX_BASE_URL : undefined,
      },
      db: {
        ok: dbOk,
      },
    },
  };

  res.json(body);
});

/**
 * GET /api/health/version
 *
 * Tiny info endpoint, useful for sanity checks and Docker image probes.
 */
router.get("/version", (_req, res) => {
  res.json({
    name: "cineboard-api",
    version: "1.0.0",
    node: process.version,
    startedAt: STARTED_AT,
    appState: {
      activeDisplayId: getAppState("active_display_id") ?? "1",
    },
  });
});

export default router;