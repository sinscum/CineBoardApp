// =============================================================
// Plex integration
//
// Ported from the original CineBoard (Node/EJS) app's
// classes/mediaservers/plex.js. The old app used the `plex-api`
// wrapper; Plex is a plain HTTP/JSON server, so here we talk to it
// directly with the built-in fetch (Accept: application/json makes
// Plex return JSON instead of XML) and an X-Plex-Token header.
//
// The connection details come from the stored media_connections
// row (written by the Settings UI via /api/connections), falling
// back to PLEX_BASE_URL / PLEX_TOKEN environment variables.
// =============================================================

import { db } from "../db.js";
import { joinUrl } from "./mediaProbe.js";
import type { ConnectionConfig } from "./connectionConfig.js";

const DEFAULT_TIMEOUT_MS = 6000;

export interface PlexConnection {
  url: string;
  token: string;
}

export interface PlexStatus {
  configured: boolean;
  reachable: boolean;
  serverName?: string;
  url?: string;
  detail?: string;
}

export interface PlexSession {
  key: string;
  type: string; // movie | episode | track | ...
  title: string;
  showTitle?: string; // grandparentTitle (series / artist)
  season?: string; // parentTitle
  episodeIndex?: number;
  year?: number;
  contentRating?: string;
  user?: string;
  player?: string;
  state?: string; // playing | paused | buffering
  transcode: boolean;
  progressPercent: number; // 0..100
  durationMs?: number;
  viewOffsetMs?: number;
  thumbPath?: string; // Plex-relative path, served via /api/plex/image
}

export interface NowPlaying {
  reachable: boolean;
  detail?: string;
  sessions: PlexSession[];
}

// ----------------------------------------------------------
// Effective connection resolution (DB row first, env fallback)
// ----------------------------------------------------------

function readStoredConfig(): ConnectionConfig | null {
  try {
    const row = db
      .prepare("SELECT payload_json FROM media_connections WHERE id = ?")
      .get("default") as { payload_json: string } | undefined;
    if (!row?.payload_json) return null;
    return JSON.parse(row.payload_json) as ConnectionConfig;
  } catch {
    return null;
  }
}

/**
 * Resolve the Plex connection actually in effect. The stored config
 * (from the Settings UI) wins when Plex is enabled and complete;
 * otherwise we fall back to environment variables.
 */
export function getPlexConnection(): PlexConnection | null {
  const stored = readStoredConfig();
  if (stored?.plex?.enabled && stored.plex.url && stored.plex.token) {
    return { url: stored.plex.url, token: stored.plex.token };
  }

  const envUrl = process.env.PLEX_BASE_URL?.trim();
  const envToken = process.env.PLEX_TOKEN?.trim();
  if (envUrl && envToken) {
    return { url: envUrl, token: envToken };
  }

  return null;
}

// ----------------------------------------------------------
// Low-level fetch helper
// ----------------------------------------------------------

async function plexGet(
  conn: PlexConnection,
  path: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(joinUrl(conn.url, path), {
      headers: { "X-Plex-Token": conn.token, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = new Error(
        res.status === 401 || res.status === 403
          ? "authentication failed (check Plex token)"
          : `unexpected response (HTTP ${res.status})`
      );
      throw err;
    }
    return await res.json();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("timed out");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ----------------------------------------------------------
// Public API
// ----------------------------------------------------------

/** Whether Plex is reachable, plus the server's friendly name if available. */
export async function getPlexStatus(): Promise<PlexStatus> {
  const conn = getPlexConnection();
  if (!conn) {
    return { configured: false, reachable: false, detail: "not configured" };
  }
  try {
    const root = (await plexGet(conn, "/")) as {
      MediaContainer?: { friendlyName?: string; machineIdentifier?: string };
    };
    const mc = root?.MediaContainer;
    return {
      configured: true,
      reachable: true,
      serverName: mc?.friendlyName || mc?.machineIdentifier,
      url: conn.url,
    };
  } catch (err) {
    return {
      configured: true,
      reachable: false,
      url: conn.url,
      detail: err instanceof Error ? err.message : "request failed",
    };
  }
}

interface RawSession {
  key?: string;
  ratingKey?: string;
  type?: string;
  title?: string;
  grandparentTitle?: string;
  parentTitle?: string;
  index?: number;
  year?: number;
  contentRating?: string;
  duration?: number;
  viewOffset?: number;
  thumb?: string;
  parentThumb?: string;
  grandparentThumb?: string;
  User?: { title?: string };
  Player?: { title?: string; product?: string; state?: string };
  TranscodeSession?: unknown;
}

/** Pick the most representative poster path for a session. */
function pickThumb(md: RawSession): string | undefined {
  if (md.type === "episode") return md.grandparentThumb || md.thumb;
  if (md.type === "track") return md.parentThumb || md.grandparentThumb || md.thumb;
  return md.thumb || md.grandparentThumb;
}

function mapSession(md: RawSession): PlexSession {
  const durationMs = typeof md.duration === "number" ? md.duration : undefined;
  const viewOffsetMs = typeof md.viewOffset === "number" ? md.viewOffset : undefined;
  const progressPercent =
    durationMs && durationMs > 0 && viewOffsetMs != null
      ? Math.min(100, Math.max(0, Math.round((viewOffsetMs / durationMs) * 100)))
      : 0;

  return {
    key: md.key || md.ratingKey || "",
    type: md.type || "unknown",
    title: md.title || "Untitled",
    showTitle: md.grandparentTitle,
    season: md.parentTitle,
    episodeIndex: md.index,
    year: md.year,
    contentRating: md.contentRating,
    user: md.User?.title,
    player: md.Player?.title || md.Player?.product,
    state: md.Player?.state,
    transcode: Boolean(md.TranscodeSession),
    progressPercent,
    durationMs,
    viewOffsetMs,
    thumbPath: pickThumb(md),
  };
}

/** Current Plex play sessions ("now screening"). */
export async function getNowPlaying(): Promise<NowPlaying> {
  const conn = getPlexConnection();
  if (!conn) {
    return { reachable: false, detail: "not configured", sessions: [] };
  }
  try {
    const raw = (await plexGet(conn, "/status/sessions")) as {
      MediaContainer?: { Metadata?: RawSession[] };
    };
    const metadata = raw?.MediaContainer?.Metadata ?? [];
    return { reachable: true, sessions: metadata.map(mapSession) };
  } catch (err) {
    return {
      reachable: false,
      detail: err instanceof Error ? err.message : "request failed",
      sessions: [],
    };
  }
}

export interface PlexImage {
  ok: boolean;
  status: number;
  contentType?: string;
  body?: Buffer;
  detail?: string;
}

/**
 * Fetch a Plex image (poster/art) server-side so the Plex token is never
 * exposed to the browser. `thumbPath` must be a Plex-relative path such as
 * /library/metadata/123/thumb/456.
 */
export async function fetchPlexImage(thumbPath: string): Promise<PlexImage> {
  const conn = getPlexConnection();
  if (!conn) return { ok: false, status: 503, detail: "not configured" };

  // Guard against SSRF: only allow relative Plex paths, not full URLs.
  if (!thumbPath.startsWith("/") || thumbPath.startsWith("//")) {
    return { ok: false, status: 400, detail: "invalid path" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(joinUrl(conn.url, thumbPath), {
      headers: { "X-Plex-Token": conn.token },
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, status: res.status, detail: `HTTP ${res.status}` };
    const arrayBuf = await res.arrayBuffer();
    return {
      ok: true,
      status: 200,
      contentType: res.headers.get("content-type") ?? "image/jpeg",
      body: Buffer.from(arrayBuf),
    };
  } catch (err) {
    const detail = err instanceof Error && err.name === "AbortError" ? "timed out" : "request failed";
    return { ok: false, status: 502, detail };
  } finally {
    clearTimeout(timer);
  }
}
