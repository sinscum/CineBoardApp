import test from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { joinUrl, probePlex, probeArr } from "./mediaProbe.js";

// Spin up a throwaway HTTP server that mimics the relevant Plex / arr
// endpoints, so the probes exercise the real fetch code path.
function startServer(
  handler: (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) => void
): Promise<{ url: string; close: () => Promise<void>; server: Server }> {
  return new Promise((resolve) => {
    const server = createServer(handler);
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

test("joinUrl handles trailing/leading slashes", () => {
  assert.equal(joinUrl("http://x:1/", "/identity"), "http://x:1/identity");
  assert.equal(joinUrl("http://x:1", "identity"), "http://x:1/identity");
  assert.equal(joinUrl("http://x:1///", "/api/v3/system/status"), "http://x:1/api/v3/system/status");
});

test("probePlex succeeds when the token is accepted at /identity", async () => {
  const srv = await startServer((req, res) => {
    if (req.url === "/identity" && req.headers["x-plex-token"] === "good-token") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ MediaContainer: { machineIdentifier: "abc" } }));
      return;
    }
    res.writeHead(401);
    res.end();
  });

  const ok = await probePlex(srv.url, "good-token");
  assert.equal(ok.reachable, true);
  assert.equal(ok.status, 200);

  const bad = await probePlex(srv.url, "wrong-token");
  assert.equal(bad.reachable, false);
  assert.match(bad.detail ?? "", /authentication/i);

  await srv.close();
});

test("probeArr succeeds against /api/v3/system/status with the API key", async () => {
  const srv = await startServer((req, res) => {
    if (req.url === "/api/v3/system/status" && req.headers["x-api-key"] === "arr-key") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ version: "5.0.0" }));
      return;
    }
    res.writeHead(401);
    res.end();
  });

  const ok = await probeArr(srv.url, "arr-key");
  assert.equal(ok.reachable, true);

  const bad = await probeArr(srv.url, "nope");
  assert.equal(bad.reachable, false);
  assert.equal(bad.status, 401);

  await srv.close();
});

test("probe reports unreachable host without throwing", async () => {
  // Nothing listening on this port → connection refused.
  const result = await probeArr("http://127.0.0.1:1", "key", 1000);
  assert.equal(result.reachable, false);
  assert.ok(result.detail && result.detail.length > 0);
});

test("probe times out on a slow server", async () => {
  const srv = await startServer(() => {
    // Never respond → force the AbortController timeout.
  });

  const result = await probePlex(srv.url, "token", 150);
  assert.equal(result.reachable, false);
  assert.match(result.detail ?? "", /timed out/i);

  await srv.close();
});
