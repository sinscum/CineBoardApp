import test from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Point the DB at a throwaway location BEFORE importing anything that opens it.
process.env.CINEBOARD_DB_PATH = join(
  mkdtempSync(join(tmpdir(), "cineboard-plex-")),
  "test.db"
);

// Dynamic import so the env var above is set first (db.ts opens SQLite on import).
const { getPlexStatus, getNowPlaying, fetchPlexImage } = await import("./plex.js");

const PNG_1x1 = Buffer.from(
  "89504e470d0a1a0a0000000d494844520000000100000001080600000" +
    "01f15c4890000000a49444154789c6360000002000154a24f5f0000000049454e44ae426082",
  "hex"
);

function startPlex(): Promise<{ url: string; close: () => Promise<void>; server: Server }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      // All endpoints require the token header, like a real Plex server.
      if (req.headers["x-plex-token"] !== "test-token") {
        res.writeHead(401);
        return res.end();
      }
      const url = (req.url ?? "").split("?")[0];
      if (url === "/") {
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ MediaContainer: { friendlyName: "Test Plex" } }));
      }
      if (url === "/status/sessions") {
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(
          JSON.stringify({
            MediaContainer: {
              size: 2,
              Metadata: [
                {
                  key: "/library/metadata/10",
                  type: "movie",
                  title: "Blade Runner",
                  year: 1982,
                  duration: 100000,
                  viewOffset: 25000,
                  thumb: "/library/metadata/10/thumb/1",
                  User: { title: "alice" },
                  Player: { title: "Living Room", state: "playing" },
                  TranscodeSession: { key: "abc" },
                },
                {
                  key: "/library/metadata/20",
                  type: "episode",
                  title: "Pilot",
                  grandparentTitle: "The Office",
                  parentTitle: "Season 1",
                  index: 1,
                  duration: 60000,
                  viewOffset: 0,
                  grandparentThumb: "/library/metadata/20/thumb/2",
                  User: { title: "bob" },
                  Player: { title: "Bedroom", state: "paused" },
                },
              ],
            },
          })
        );
      }
      if (url.startsWith("/library/metadata/")) {
        res.writeHead(200, { "content-type": "image/png" });
        return res.end(PNG_1x1);
      }
      res.writeHead(404);
      res.end();
    });
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}`,
        server,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

test("getPlexStatus reports reachable + server name via env fallback", async () => {
  const plex = await startPlex();
  process.env.PLEX_BASE_URL = plex.url;
  process.env.PLEX_TOKEN = "test-token";

  const status = await getPlexStatus();
  assert.equal(status.configured, true);
  assert.equal(status.reachable, true);
  assert.equal(status.serverName, "Test Plex");

  await plex.close();
});

test("getNowPlaying maps sessions (progress, transcode, show context)", async () => {
  const plex = await startPlex();
  process.env.PLEX_BASE_URL = plex.url;
  process.env.PLEX_TOKEN = "test-token";

  const np = await getNowPlaying();
  assert.equal(np.reachable, true);
  assert.equal(np.sessions.length, 2);

  const movie = np.sessions[0];
  assert.equal(movie.title, "Blade Runner");
  assert.equal(movie.transcode, true);
  assert.equal(movie.progressPercent, 25); // 25000 / 100000
  assert.equal(movie.state, "playing");
  assert.equal(movie.user, "alice");

  const ep = np.sessions[1];
  assert.equal(ep.showTitle, "The Office");
  assert.equal(ep.episodeIndex, 1);
  assert.equal(ep.transcode, false);
  assert.equal(ep.thumbPath, "/library/metadata/20/thumb/2");

  await plex.close();
});

test("getNowPlaying returns not-configured when no connection is set", async () => {
  process.env.PLEX_BASE_URL = "";
  process.env.PLEX_TOKEN = "";

  const np = await getNowPlaying();
  assert.equal(np.reachable, false);
  assert.equal(np.detail, "not configured");
  assert.deepEqual(np.sessions, []);
});

test("fetchPlexImage proxies bytes and rejects non-relative paths (SSRF guard)", async () => {
  const plex = await startPlex();
  process.env.PLEX_BASE_URL = plex.url;
  process.env.PLEX_TOKEN = "test-token";

  const ok = await fetchPlexImage("/library/metadata/10/thumb/1");
  assert.equal(ok.ok, true);
  assert.equal(ok.contentType, "image/png");
  assert.ok(ok.body && ok.body.length > 0);

  const evil = await fetchPlexImage("http://169.254.169.254/latest/meta-data");
  assert.equal(evil.ok, false);
  assert.equal(evil.status, 400);

  await plex.close();
});
