export interface ConnectionConfig {
  plex?: {
    enabled: boolean;
    url: string;
    token: string;
  };
  radarr?: {
    enabled: boolean;
    url: string;
    apiKey: string;
  };
  sonarr?: {
    enabled: boolean;
    url: string;
    apiKey: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  normalized: ConnectionConfig;
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (lower === "true") return true;
    if (lower === "false") return false;
  }
  return false;
}

export function normalizeConnectionConfig(input: unknown): ConnectionConfig {
  const data = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;

  return {
    plex: data.plex && typeof data.plex === "object"
      ? {
          enabled: normalizeBoolean((data.plex as Record<string, unknown>).enabled),
          url: normalizeString((data.plex as Record<string, unknown>).url),
          token: normalizeString((data.plex as Record<string, unknown>).token),
        }
      : undefined,
    radarr: data.radarr && typeof data.radarr === "object"
      ? {
          enabled: normalizeBoolean((data.radarr as Record<string, unknown>).enabled),
          url: normalizeString((data.radarr as Record<string, unknown>).url),
          apiKey: normalizeString((data.radarr as Record<string, unknown>).apiKey),
        }
      : undefined,
    sonarr: data.sonarr && typeof data.sonarr === "object"
      ? {
          enabled: normalizeBoolean((data.sonarr as Record<string, unknown>).enabled),
          url: normalizeString((data.sonarr as Record<string, unknown>).url),
          apiKey: normalizeString((data.sonarr as Record<string, unknown>).apiKey),
        }
      : undefined,
  };
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function validateConnectionConfig(input: unknown): ValidationResult {
  const normalized = normalizeConnectionConfig(input);
  const errors: Record<string, string> = {};

  if (normalized.plex) {
    if (!normalized.plex.enabled) {
      normalized.plex = { ...normalized.plex, enabled: false };
    }

    if (normalized.plex.enabled) {
      if (!normalized.plex.url || !isHttpUrl(normalized.plex.url)) {
        errors.plex = "Plex URL must be a valid http(s) URL.";
      }
      if (!normalized.plex.token) {
        errors.plex = [errors.plex, "Plex token is required."].filter(Boolean).join(" ");
      }
    }
  }

  if (normalized.radarr) {
    if (normalized.radarr.enabled) {
      if (!normalized.radarr.url || !isHttpUrl(normalized.radarr.url)) {
        errors.radarr = "Radarr URL must be a valid http(s) URL.";
      }
      if (!normalized.radarr.apiKey) {
        errors.radarr = [errors.radarr, "Radarr API key is required."].filter(Boolean).join(" ");
      }
    }
  }

  if (normalized.sonarr) {
    if (normalized.sonarr.enabled) {
      if (!normalized.sonarr.url || !isHttpUrl(normalized.sonarr.url)) {
        errors.sonarr = "Sonarr URL must be a valid http(s) URL.";
      }
      if (!normalized.sonarr.apiKey) {
        errors.sonarr = [errors.sonarr, "Sonarr API key is required."].filter(Boolean).join(" ");
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized,
  };
}
