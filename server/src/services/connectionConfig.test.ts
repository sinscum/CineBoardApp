import test from "node:test";
import assert from "node:assert/strict";
import { normalizeConnectionConfig, validateConnectionConfig } from "./connectionConfig.js";

test("accepts complete Plex, Radarr, and Sonarr configs", () => {
  const result = validateConnectionConfig({
    plex: {
      enabled: true,
      url: "https://plex.example.com",
      token: "plex-token",
    },
    radarr: {
      enabled: true,
      url: "http://radarr:7878",
      apiKey: "radarr-key",
    },
    sonarr: {
      enabled: true,
      url: "http://sonarr:8989",
      apiKey: "sonarr-key",
    },
  });

  assert.equal(result.isValid, true);
  assert.deepEqual(result.errors, {});
});

test("rejects invalid URLs and missing API credentials", () => {
  const result = validateConnectionConfig({
    plex: {
      enabled: true,
      url: "ftp://plex.example.com",
      token: "",
    },
    radarr: {
      enabled: true,
      url: "",
      apiKey: "",
    },
    sonarr: {
      enabled: false,
      url: "",
      apiKey: "",
    },
  });

  assert.equal(result.isValid, false);
  assert.match(result.errors.plex ?? "", /url/i);
  assert.match(result.errors.plex ?? "", /token/i);
  assert.match(result.errors.radarr ?? "", /url/i);
  assert.match(result.errors.radarr ?? "", /api key/i);
});

test("normalizes a connection payload into the expected shape", () => {
  const normalized = normalizeConnectionConfig({
    plex: { enabled: "true" as unknown as boolean, url: " https://plex.example.com ", token: " token " },
  });

  assert.equal(normalized.plex.enabled, true);
  assert.equal(normalized.plex.url, "https://plex.example.com");
  assert.equal(normalized.plex.token, "token");
});
