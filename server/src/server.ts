import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { db, closeDb } from "./db.js";
import type { ErrorResponse } from "./types.js";

// ----------------------------------------------------------
// Boot
// ----------------------------------------------------------

const startedAt = Date.now();
const PORT = Number(process.env.CINEBOARD_API_PORT ?? 3000);

const app = express();

// Body parsing
app.use(express.json({ limit: "5mb" }));

// CORS — needed for Vite dev server (5173) to talk to backend (3000)
// In production (Docker), nginx serves the React build at the same origin,
// so CORS isn't strictly needed there, but having it on is harmless.
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin requests and any localhost dev port
      if (!origin) return callback(null, true);
      if (/^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
      if (/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) return callback(null, true);
      return callback(null, true); // permissive — backend not internet-facing
    },
    credentials: true,
  })
);

// Tiny request logger so you can see API hits in the dev terminal
app.use((req, _res, next) => {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] ${req.method} ${req.url}`);
  next();
});

// ----------------------------------------------------------
// Routes (we'll mount these one by one in upcoming files)
// ----------------------------------------------------------

// File 6: health
import healthRouter from "./routes/health.js";
app.use("/api/health", healthRouter);

// File 7: profiles
import profilesRouter from "./routes/profiles.js";
app.use("/api/profiles", profilesRouter);

// File 8: themes
import themesRouter from "./routes/themes.js";
app.use("/api/themes", themesRouter);

// File 9: activity
import activityRouter from "./routes/activity.js";
app.use("/api/activity", activityRouter);

// 404 for any unmatched API path
app.use("/api", (_req, res) => {
  const body: ErrorResponse = { error: "not_found" };
  res.status(404).json(body);
});

// ----------------------------------------------------------
// Error handler — last resort if a route throws
// ----------------------------------------------------------

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "unknown error";
  console.error("[api error]", err);
  const body: ErrorResponse = {
    error: "internal_error",
    detail: message,
  };
  res.status(500).json(body);
});

// ----------------------------------------------------------
// Start
// ----------------------------------------------------------

const server = app.listen(PORT, () => {
  console.log(`[server] CineBoard API listening on http://localhost:${PORT}`);
  console.log(`[server] Started at ${new Date(startedAt).toISOString()}`);
});

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`[server] Received ${signal}, shutting down...`);
  server.close(() => {
    closeDb();
    console.log("[server] Closed cleanly.");
    process.exit(0);
  });
  // Force-exit if it hangs
  setTimeout(() => {
    console.error("[server] Forced exit after timeout.");
    process.exit(1);
  }, 5000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Surface unhandled promises so we don't silently lose errors
process.on("unhandledRejection", (reason) => {
  console.error("[server] Unhandled rejection:", reason);
});

// Export for tests if we add them later
export { app, db, startedAt };