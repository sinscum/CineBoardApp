import { Router } from "express";
import { getPlexStatus, getNowPlaying, fetchPlexImage } from "../services/plex.js";

const router = Router();

/**
 * GET /api/plex/status
 * Whether Plex is configured + reachable, plus the server's friendly name.
 */
router.get("/status", async (_req, res) => {
  const status = await getPlexStatus();
  res.json(status);
});

/**
 * GET /api/plex/now-playing
 * Current Plex play sessions ("now screening").
 */
router.get("/now-playing", async (_req, res) => {
  const result = await getNowPlaying();
  res.json(result);
});

/**
 * GET /api/plex/image?path=/library/metadata/123/thumb/456
 * Proxies a Plex poster/art image so the token stays server-side.
 */
router.get("/image", async (req, res) => {
  const path = typeof req.query.path === "string" ? req.query.path : "";
  if (!path) {
    return res.status(400).json({ error: "missing_path" });
  }

  const image = await fetchPlexImage(path);
  if (!image.ok || !image.body) {
    return res.status(image.status).json({ error: "image_unavailable", detail: image.detail });
  }

  res.setHeader("Content-Type", image.contentType ?? "image/jpeg");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.send(image.body);
});

export default router;
