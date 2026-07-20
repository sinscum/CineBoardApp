import { Router } from "express";
import { db, nowMs } from "../db.js";
import {
  normalizeConnectionConfig,
  validateConnectionConfig,
  type ConnectionConfig,
} from "../services/connectionConfig.js";
import { probePlex, probeArr, type ProbeResult } from "../services/mediaProbe.js";

const router = Router();

function readStoredConnections(): ConnectionConfig | null {
  const row = db
    .prepare("SELECT payload_json FROM media_connections WHERE id = ?")
    .get("default") as { payload_json: string } | undefined;

  if (!row?.payload_json) return null;

  try {
    return JSON.parse(row.payload_json) as ConnectionConfig;
  } catch {
    return null;
  }
}

function writeStoredConnections(payload: ConnectionConfig): void {
  db.prepare(
    `INSERT INTO media_connections (id, payload_json, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at`
  ).run("default", JSON.stringify(payload), nowMs());
}

router.get("/", (_req, res) => {
  const stored = readStoredConnections();
  res.json({
    connections: stored ?? {},
  });
});

router.put("/", (req, res) => {
  const validation = validateConnectionConfig(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      error: "invalid_config",
      details: validation.errors,
    });
  }

  const normalized = validation.normalized;
  writeStoredConnections(normalized);

  res.json({
    ok: true,
    connections: normalized,
  });
});

router.post("/test", async (req, res) => {
  const validation = validateConnectionConfig(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      error: "invalid_config",
      details: validation.errors,
    });
  }

  const config = validation.normalized;

  // Only probe services that are enabled AND have credentials filled in.
  // Everything else reports as not-configured (never "validated").
  const plexReady = Boolean(config.plex?.enabled && config.plex.url && config.plex.token);
  const radarrReady = Boolean(config.radarr?.enabled && config.radarr.url && config.radarr.apiKey);
  const sonarrReady = Boolean(config.sonarr?.enabled && config.sonarr.url && config.sonarr.apiKey);

  const notConfigured: ProbeResult = { reachable: false, detail: "not configured" };

  const [plexResult, radarrResult, sonarrResult] = await Promise.all([
    plexReady ? probePlex(config.plex!.url, config.plex!.token) : Promise.resolve(notConfigured),
    radarrReady ? probeArr(config.radarr!.url, config.radarr!.apiKey) : Promise.resolve(notConfigured),
    sonarrReady ? probeArr(config.sonarr!.url, config.sonarr!.apiKey) : Promise.resolve(notConfigured),
  ]);

  // `checks` stays boolean-shaped (reachable = validated) for the existing
  // Settings UI; `details` carries the reason when a probe fails.
  res.json({
    ok: true,
    checks: {
      plex: plexResult.reachable,
      radarr: radarrResult.reachable,
      sonarr: sonarrResult.reachable,
    },
    details: {
      plex: plexResult.detail,
      radarr: radarrResult.detail,
      sonarr: sonarrResult.detail,
    },
  });
});

export default router;
