# CineBoard

A cinema poster display board. CineBoard rotates TMDB movie posters across
configurable display profiles, with banner theming, per-zone content, and a
two-tier (memory + localStorage) cache. Built with React + Vite + TypeScript.

## Prerequisites

- A **TMDB API v4 read access token** — get one at
  https://www.themoviedb.org/settings/api
- For local dev: **Node.js 22+**
- For containers: **Docker** (with the Compose plugin)

## Run with Docker Compose

The TMDB token is a Vite **build-time** variable, so it is baked into the bundle
when the image is built. Provide it via a `.env` file that Compose reads
automatically.

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

Open **http://localhost:8080**.

Common commands:

```bash
docker compose logs -f      # follow logs
docker compose down         # stop and remove the container
docker compose up --build   # rebuild after pulling new code or changing the token
```

> The app is served by nginx with an SPA routing fallback, so deep links like
> `/display/1` and `/library` work on refresh.

### Change the port

Edit the port mapping in [`docker-compose.yml`](docker-compose.yml) — the
default `8080:80` maps host `8080` to the container's nginx on `80`.

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

## Security note

Because `VITE_TMDB_READ_TOKEN` is inlined into the JavaScript bundle at build
time, anyone with access to the built app (or a published image) can extract the
token. Keep images **private**, or front TMDB with a small backend proxy that
holds the token server-side if you need to distribute the app publicly.
