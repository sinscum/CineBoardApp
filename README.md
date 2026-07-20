# CineBoard

A cinema poster display board. CineBoard rotates TMDB movie posters across
configurable display profiles, with banner theming, per-zone content, and a
two-tier (memory + localStorage) cache. Built with React + Vite + TypeScript.

It can also connect to your media stack: **Plex** (live "now playing" on the
Dashboard) and **Radarr / Sonarr** ("coming soon" data), with a built-in
connection tester. See [Media integrations](#media-integrations-plex--radarr--sonarr).

## Prerequisites

- A **TMDB API v4 read access token** — get one at
  https://www.themoviedb.org/settings/api
- For local dev: **Node.js 22+**
- For containers: **Docker** (with the Compose plugin)

## Run with Docker Compose

The TMDB token is a Vite **build-time** variable, so it is baked into the bundle
when the image is built. Provide it via a `.env` file that Compose reads
automatically.

This Compose stack now runs two services:
- `web`: the React frontend served by nginx
- `api`: the Node/Express backend storing its SQLite database in a persistent volume

Example environment values:

```env
VITE_TMDB_READ_TOKEN=your_token_here
VITE_API_BASE_URL=/api
CINEBOARD_API_PORT=3000
CINEBOARD_DB_PATH=/data/cineboard.db

# Optional media-stack credentials (or configure these in the Settings UI)
PLEX_BASE_URL=
PLEX_TOKEN=
RADARR_BASE_URL=
RADARR_API_KEY=
SONARR_BASE_URL=
SONARR_API_KEY=
```

```bash
# 1. Clone
git clone https://github.com/sinscum/CineBoardApp.git
cd CineBoardApp

# 2. Supply your TMDB token
cp .env.example .env
#   then edit .env and set VITE_TMDB_READ_TOKEN=your_token_here

# 3. Build and start
docker compose up --build -d
```

Open **http://localhost:8080** for the web app. The API is available at
**http://localhost:3000/api/health**.

Common commands:

```bash
docker compose logs -f      # follow logs
docker compose down         # stop and remove the container
docker compose up --build   # rebuild after pulling new code or changing the token
```

> The app is served by nginx with an SPA routing fallback, so deep links like
> `/display/1` and `/library` work on refresh.

### Change the port

Edit the port mappings in [`docker-compose.yml`](docker-compose.yml) — the
defaults are `8080:80` for the web app and `3000:3000` for the API.

## Run with plain Docker (no Compose)

```bash
docker build \
  --build-arg VITE_TMDB_READ_TOKEN="your_token_here" \
  -t cineboard .

docker run -d -p 8080:80 --name cineboard cineboard
```

## Run locally (dev)

```bash
npm install
cp .env.example .env.local   # set VITE_TMDB_READ_TOKEN
npm run dev
```

Open the URL Vite prints (default **http://localhost:5173**).

### Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Dev server with hot reload           |
| `npm run build`   | Type-check + production build (`dist/`) |
| `npm run preview` | Serve the production build locally   |
| `npm run lint`    | Run ESLint                           |

## Media integrations (Plex / Radarr / Sonarr)

CineBoard can connect to your existing media stack. The Node/Express API
(`server/`) talks to each service over its normal HTTP API — no extra
dependencies — and the React app surfaces the results.

### Configuring

There are two ways to provide credentials, checked in this order:

1. **Settings UI** (recommended) — open **Settings → Connections**, fill in each
   service's URL + token/API key, tick **Enable**, and click **Test** to verify
   connectivity live. Values are stored in the API's SQLite database.
2. **Environment variables** — set `PLEX_BASE_URL` / `PLEX_TOKEN`,
   `RADARR_BASE_URL` / `RADARR_API_KEY`, `SONARR_BASE_URL` / `SONARR_API_KEY`.
   These act as a fallback when nothing is saved in the UI.

- Plex authenticates with an **X-Plex-Token** (Settings → your token; see the
  [Plex support article](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/)).
- Radarr/Sonarr authenticate with the **API key** from *Settings → General*.

### What you get

- The Dashboard shows a live **Plex status** chip and a **"Now Playing on Plex"**
  panel (poster, show/episode context, user, player, progress, and a
  direct-play vs. transcode indicator).
- Coming-soon data from Radarr/Sonarr is available from the API for display use.

### API endpoints

| Endpoint | Purpose |
| --- | --- |
| `POST /api/connections/test` | Live reachability test for enabled services |
| `GET /api/plex/status` | Plex configured + reachable + server name |
| `GET /api/plex/now-playing` | Current Plex play sessions |
| `GET /api/plex/image?path=…` | Poster/art proxy (keeps the Plex token server-side) |
| `GET /api/radarr/coming-soon?days=30` | Upcoming movie releases |
| `GET /api/sonarr/coming-soon?days=30` | Upcoming episodes |
| `GET /api/health` | Service snapshot with live reachability (`?shallow=1` to skip probes) |

Media-service tokens are held **server-side** only — the browser never sees
them, and Plex images are proxied through the API rather than embedding the
token in image URLs.

## Security note

Because `VITE_TMDB_READ_TOKEN` is inlined into the JavaScript bundle at build
time, anyone with access to the built app (or a published image) can extract the
token. Keep images **private**, or front TMDB with a small backend proxy that
holds the token server-side if you need to distribute the app publicly.
