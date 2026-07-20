// =============================================================
// Media service connectivity probes
//
// Real reachability checks for Plex, Radarr, and Sonarr. Ported
// from the behaviour of the original CineBoard (Node/EJS) app:
//   - Plex authenticates with an X-Plex-Token header and exposes
//     an unauthenticated-friendly /identity endpoint that echoes
//     the server identity when the token is valid.
//   - Radarr/Sonarr authenticate with an X-Api-Key header and
//     expose /api/v3/system/status.
//
// These are plain HTTP calls (the old app used the `plex-api` and
// `axios` libraries; we use the built-in fetch with a timeout), so
// there are no extra runtime dependencies.
// =============================================================

export interface ProbeResult {
  reachable: boolean;
  status?: number;
  detail?: string;
}

const DEFAULT_TIMEOUT_MS = 5000;

/** Join a base URL and path without doubling or dropping slashes. */
export function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, "") + (path.startsWith("/") ? path : `/${path}`);
}

/**
 * Perform a single GET request and classify the outcome. Any 2xx is
 * treated as reachable; other responses and network/timeout errors are
 * reported with a short human-readable detail suitable for the UI.
 */
async function httpProbe(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<ProbeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    if (res.ok) {
      return { reachable: true, status: res.status };
    }

    if (res.status === 401 || res.status === 403) {
      return { reachable: false, status: res.status, detail: "authentication failed (check token/API key)" };
    }

    return { reachable: false, status: res.status, detail: `unexpected response (HTTP ${res.status})` };
  } catch (err) {
    let detail = "request failed";
    if (err instanceof Error) {
      detail = err.name === "AbortError" ? "timed out" : err.message;
    }
    return { reachable: false, detail };
  } finally {
    clearTimeout(timer);
  }
}

/** Probe a Plex server using its token. */
export async function probePlex(
  url: string,
  token: string,
  timeoutMs?: number
): Promise<ProbeResult> {
  return httpProbe(
    joinUrl(url, "/identity"),
    { "X-Plex-Token": token, Accept: "application/json" },
    timeoutMs
  );
}

/** Probe a Radarr or Sonarr instance using its API key (v3 API). */
export async function probeArr(
  url: string,
  apiKey: string,
  timeoutMs?: number
): Promise<ProbeResult> {
  return httpProbe(
    joinUrl(url, "/api/v3/system/status"),
    { "X-Api-Key": apiKey, Accept: "application/json" },
    timeoutMs
  );
}
