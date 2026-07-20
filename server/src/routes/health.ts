import { Router } from "express";
import { db, getAppState } from "../db.js";
import type { HealthResponse } from "../types.js";
import { getPlexConnection, getPlexStatus } from "../services/plex.js";
import { resolveConnection, getArrStatus } from "../services/arr.js";

const router = Router();

const STARTED_AT = Date.now();

/**
 * GET /api/health
 *
 * Returns a snapshot of service connectivity / configuration.
 *
 * By default this performs *live reachability* probes against every
 * configured media service (Plex/Radarr/Sonarr) in parallel, so the
 * report reflects reality, not just whether credentials are present.
 * Pass ?shallow=1 for a fast configured-only check that skips the
 * network probes (useful for cheap liveness monitoring).
 *
 * "Configured" now means either the Settings UI saved a connection OR
 * the matching env vars are set (the service resolvers check both).
 */
router.get("/", async (req, res) => {
  const shallow = req.query.shallow === "1" || req.query.shallow === "true";

  const tmdbConfigured = Boolean(
    process.env.TMDB_TOKEN || process.env.VITE_TMDB_READ_TOKEN
  );

  let dbOk = false;
  try {
    const row = db.prepare("SELECT 1 as ok").get() as { ok: number } | undefined;
    dbOk = row?.ok === 1;
  } catch {
    dbOk = false;
  }

  let plex: HealthResponse["services"]["plex"];
  let radarr: HealthResponse["services"]["radarr"];
  let sonarr: HealthResponse["services"]["sonarr"];

  if (shallow) {
    const plexConn = getPlexConnection();
    const radarrConn = resolveConnection("radarr");
    const sonarrConn = resolveConnection("sonarr");
    plex = { configured: Boolean(plexConn), baseUrl: plexConn?.url };
    radarr = { configured: Boolean(radarrConn), baseUrl: radarrConn?.url };
    sonarr = { configured: Boolean(sonarrConn), baseUrl: sonarrConn?.url };
  } else {
    const [plexStatus, radarrStatus, sonarrStatus] = await Promise.all([
      getPlexStatus(),
      getArrStatus("radarr"),
      getArrStatus("sonarr"),
    ]);
    plex = {
      configured: plexStatus.configured,
      reachable: plexStatus.configured ? plexStatus.reachable : undefined,
      serverName: plexStatus.serverName,
      baseUrl: plexStatus.url,
    };
    radarr = {
      configured: radarrStatus.configured,
      reachable: radarrStatus.configured ? radarrStatus.reachable : undefined,
      baseUrl: radarrStatus.url,
    };
    sonarr = {
      configured: sonarrStatus.configured,
      reachable: sonarrStatus.configured ? sonarrStatus.reachable : undefined,
      baseUrl: sonarrStatus.url,
    };
  }

  // Overall: down if the DB is unavailable, degraded if TMDB (the core
  // poster source) is not configured or a configured service is unreachable.
  const anyUnreachable = [plex, radarr, sonarr].some(
    (s) => s.configured && s.reachable === false
  );
  const overall: HealthResponse["status"] = !dbOk
    ? "down"
    : !tmdbConfigured || anyUnreachable
    ? "degraded"
    : "ok";

  const uptimeSec = Math.floor((Date.now() - STARTED_AT) / 1000);

  const body: HealthResponse = {
    status: overall,
    uptimeSec,
    startedAt: STARTED_AT,
    services: {
      tmdb: { configured: tmdbConfigured },
      plex,
      radarr,
      sonarr,
      db: { ok: dbOk },
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
