// =============================================================
// Radarr / Sonarr integration ("coming soon")
//
// Ported from the original CineBoard app's classes/arr/radarr.js and
// classes/arr/sonarr.js. Both expose a v3 calendar endpoint; the old
// app passed the key in the query string, here we use the X-Api-Key
// header so the key never lands in URLs or logs. Sonarr's
// includeSeries=true embeds the series (title + poster) so we avoid a
// per-episode series lookup.
//
// Connection details resolve from the stored media_connections row
// (Settings UI) and fall back to {RADARR,SONARR}_BASE_URL / _API_KEY.
// =============================================================

import { db } from "../db.js";
import { joinUrl } from "./mediaProbe.js";
import type { ConnectionConfig } from "./connectionConfig.js";

const DEFAULT_TIMEOUT_MS = 6000;
const DEFAULT_DAYS = 30;

export interface ArrConnection {
  url: string;
  apiKey: string;
}

export interface ComingSoonItem {
  id: string;
  title: string; // movie title, or "Series — Episode"
  seriesTitle?: string;
  episodeTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  releaseDate?: string; // ISO date (yyyy-mm-dd)
  overview?: string;
  runtimeMinutes?: number;
  studio?: string;
  posterUrl?: string;
  mediaType: "movie" | "episode";
}

export interface ComingSoonResult {
  reachable: boolean;
  detail?: string;
  items: ComingSoonItem[];
}

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

function resolveConnection(
  service: "radarr" | "sonarr"
): ArrConnection | null {
  const stored = readStoredConfig();
  const cfg = stored?.[service];
  if (cfg?.enabled && cfg.url && cfg.apiKey) {
    return { url: cfg.url, apiKey: cfg.apiKey };
  }

  const prefix = service.toUpperCase();
  const envUrl = process.env[`${prefix}_BASE_URL`]?.trim();
  const envKey = process.env[`${prefix}_API_KEY`]?.trim();
  if (envUrl && envKey) return { url: envUrl, apiKey: envKey };

  return null;
}

/** yyyy-mm-dd for `daysFromNow` (0 = today). */
function isoDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
}

async function arrGet(
  conn: ArrConnection,
  path: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(joinUrl(conn.url, path), {
      headers: { "X-Api-Key": conn.apiKey, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(
        res.status === 401 || res.status === 403
          ? "authentication failed (check API key)"
          : `unexpected response (HTTP ${res.status})`
      );
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

function posterFrom(images: unknown): string | undefined {
  if (!Array.isArray(images)) return undefined;
  const poster = images.find(
    (i) => i && typeof i === "object" && (i as { coverType?: string }).coverType === "poster"
  ) as { remoteUrl?: string; url?: string } | undefined;
  return poster?.remoteUrl || poster?.url;
}

interface RawRadarrMovie {
  id?: number;
  tmdbId?: number;
  title?: string;
  overview?: string;
  runtime?: number;
  studio?: string;
  digitalRelease?: string;
  physicalRelease?: string;
  inCinemas?: string;
  images?: unknown;
}

interface RawSonarrEpisode {
  id?: number;
  title?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  airDateUtc?: string;
  airDate?: string;
  overview?: string;
  series?: { title?: string; images?: unknown };
}

function toDate(value?: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().split("T")[0];
}

export async function getRadarrComingSoon(days = DEFAULT_DAYS): Promise<ComingSoonResult> {
  const conn = resolveConnection("radarr");
  if (!conn) return { reachable: false, detail: "not configured", items: [] };

  try {
    const raw = (await arrGet(
      conn,
      `/api/v3/calendar?unmonitored=false&start=${isoDate(0)}&end=${isoDate(days)}`
    )) as RawRadarrMovie[];

    const items: ComingSoonItem[] = (raw ?? []).map((m) => ({
      id: String(m.id ?? m.tmdbId ?? m.title ?? ""),
      title: m.title ?? "Untitled",
      releaseDate: toDate(m.digitalRelease || m.physicalRelease || m.inCinemas),
      overview: m.overview,
      runtimeMinutes: m.runtime,
      studio: m.studio,
      posterUrl: posterFrom(m.images),
      mediaType: "movie",
    }));

    return { reachable: true, items };
  } catch (err) {
    return { reachable: false, detail: err instanceof Error ? err.message : "request failed", items: [] };
  }
}

export async function getSonarrComingSoon(days = DEFAULT_DAYS): Promise<ComingSoonResult> {
  const conn = resolveConnection("sonarr");
  if (!conn) return { reachable: false, detail: "not configured", items: [] };

  try {
    const raw = (await arrGet(
      conn,
      `/api/v3/calendar?includeSeries=true&start=${isoDate(0)}&end=${isoDate(days)}`
    )) as RawSonarrEpisode[];

    const items: ComingSoonItem[] = (raw ?? []).map((ep) => {
      const seriesTitle = ep.series?.title ?? "Unknown Series";
      return {
        id: String(ep.id ?? ""),
        title: `${seriesTitle} — ${ep.title ?? "Episode"}`,
        seriesTitle,
        episodeTitle: ep.title,
        seasonNumber: ep.seasonNumber,
        episodeNumber: ep.episodeNumber,
        releaseDate: toDate(ep.airDateUtc || ep.airDate),
        overview: ep.overview,
        posterUrl: posterFrom(ep.series?.images),
        mediaType: "episode",
      };
    });

    return { reachable: true, items };
  } catch (err) {
    return { reachable: false, detail: err instanceof Error ? err.message : "request failed", items: [] };
  }
}
