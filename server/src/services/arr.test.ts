import test from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.CINEBOARD_DB_PATH = join(
  mkdtempSync(join(tmpdir(), "cineboard-arr-")),
  "test.db"
);

const { getRadarrComingSoon, getSonarrComingSoon } = await import("./arr.js");

function startArr(
  handler: (path: string, req: import("node:http").IncomingMessage) => { code: number; body: unknown }
): Promise<{ url: string; close: () => Promise<void>; server: Server }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      if (req.headers["x-api-key"] !== "key") {
        res.writeHead(401);
        return res.end();
      }
      const path = (req.url ?? "").split("?")[0];
      const { code, body } = handler(path, req);
      res.writeHead(code, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
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

test("getRadarrComingSoon maps movies (release date, poster, runtime)", async () => {
  const arr = await startArr((path) => {
    if (path === "/api/v3/calendar") {
      return {
        code: 200,
        body: [
          {
            id: 1,
            tmdbId: 999,
            title: "Future Movie",
            overview: "Soon.",
            runtime: 120,
            studio: "ACME",
            digitalRelease: "2026-08-01T00:00:00Z",
            images: [{ coverType: "poster", remoteUrl: "http://img/poster.jpg" }],
          },
        ],
      };
    }
    return { code: 404, body: {} };
  });
  process.env.RADARR_BASE_URL = arr.url;
  process.env.RADARR_API_KEY = "key";

  const result = await getRadarrComingSoon(30);
  assert.equal(result.reachable, true);
  assert.equal(result.items.length, 1);
  const m = result.items[0];
  assert.equal(m.title, "Future Movie");
  assert.equal(m.releaseDate, "2026-08-01");
  assert.equal(m.posterUrl, "http://img/poster.jpg");
  assert.equal(m.runtimeMinutes, 120);
  assert.equal(m.mediaType, "movie");

  await arr.close();
});

test("getSonarrComingSoon maps episodes with embedded series", async () => {
  const arr = await startArr((path) => {
    if (path === "/api/v3/calendar") {
      return {
        code: 200,
        body: [
          {
            id: 42,
            title: "The Return",
            seasonNumber: 2,
            episodeNumber: 5,
            airDateUtc: "2026-08-03T01:00:00Z",
            overview: "Big episode.",
            series: {
              title: "Great Show",
              images: [{ coverType: "poster", remoteUrl: "http://img/show.jpg" }],
            },
          },
        ],
      };
    }
    return { code: 404, body: {} };
  });
  process.env.SONARR_BASE_URL = arr.url;
  process.env.SONARR_API_KEY = "key";

  const result = await getSonarrComingSoon(14);
  assert.equal(result.reachable, true);
  const ep = result.items[0];
  assert.equal(ep.seriesTitle, "Great Show");
  assert.equal(ep.title, "Great Show — The Return");
  assert.equal(ep.seasonNumber, 2);
  assert.equal(ep.episodeNumber, 5);
  assert.equal(ep.releaseDate, "2026-08-03");
  assert.equal(ep.posterUrl, "http://img/show.jpg");
  assert.equal(ep.mediaType, "episode");

  await arr.close();
});

test("coming-soon returns not-configured when creds absent", async () => {
  process.env.RADARR_BASE_URL = "";
  process.env.RADARR_API_KEY = "";
  const result = await getRadarrComingSoon();
  assert.equal(result.reachable, false);
  assert.equal(result.detail, "not configured");
  assert.deepEqual(result.items, []);
});

test("coming-soon surfaces auth failure as unreachable", async () => {
  const arr = await startArr(() => ({ code: 200, body: [] }));
  process.env.SONARR_BASE_URL = arr.url;
  process.env.SONARR_API_KEY = "wrong-key"; // mock only accepts "key"

  const result = await getSonarrComingSoon();
  assert.equal(result.reachable, false);
  assert.match(result.detail ?? "", /authentication/i);

  await arr.close();
});
