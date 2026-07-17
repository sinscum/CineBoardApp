import { loadMediaConnections, saveMediaConnections } from "./displaySettings";
import type { MediaConnectionConfig } from "../types/displaySettings";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (lower === "true") return true;
    if (lower === "false") return false;
  }
  return false;
}

function normalizeConfig(input: Partial<MediaConnectionConfig>): MediaConnectionConfig {
  return {
    plex: input.plex
      ? {
          enabled: normalizeBoolean(input.plex.enabled),
          url: input.plex.url?.trim() ?? "",
          token: input.plex.token?.trim() ?? "",
        }
      : undefined,
    radarr: input.radarr
      ? {
          enabled: normalizeBoolean(input.radarr.enabled),
          url: input.radarr.url?.trim() ?? "",
          apiKey: input.radarr.apiKey?.trim() ?? "",
        }
      : undefined,
    sonarr: input.sonarr
      ? {
          enabled: normalizeBoolean(input.sonarr.enabled),
          url: input.sonarr.url?.trim() ?? "",
          apiKey: input.sonarr.apiKey?.trim() ?? "",
        }
      : undefined,
  };
}

export async function saveConnections(config: Partial<MediaConnectionConfig>) {
  const normalized = normalizeConfig(config);
  saveMediaConnections(normalized);

  const response = await fetch(`${API_BASE}/connections`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(normalized),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail?.error || "Unable to save connections.");
  }

  return response.json();
}

export async function testConnections(config: Partial<MediaConnectionConfig>) {
  const normalized = normalizeConfig(config);
  const response = await fetch(`${API_BASE}/connections/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(normalized),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail?.error || "Unable to test connections.");
  }

  return response.json();
}

export function getStoredConnections() {
  return loadMediaConnections();
}
