import { Router } from "express";
import { db, nowMs } from "../db.js";
import {
  normalizeConnectionConfig,
  validateConnectionConfig,
  type ConnectionConfig,
} from "../services/connectionConfig.js";

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
  const checks = {
    plex: Boolean(config.plex?.enabled && config.plex.url && config.plex.token),
    radarr: Boolean(config.radarr?.enabled && config.radarr.url && config.radarr.apiKey),
    sonarr: Boolean(config.sonarr?.enabled && config.sonarr.url && config.sonarr.apiKey),
  };

  res.json({
    ok: true,
    checks,
  });
});

export default router;
