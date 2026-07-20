import { Router } from "express";
import { getRadarrComingSoon, getSonarrComingSoon } from "../services/arr.js";

// Radarr and Sonarr share the same shape, so one factory builds both.
function comingSoonRouter(fetcher: (days: number) => ReturnType<typeof getRadarrComingSoon>) {
  const router = Router();

  router.get("/coming-soon", async (req, res) => {
    const daysRaw = Number(req.query.days);
    const days = Number.isFinite(daysRaw) && daysRaw > 0 && daysRaw <= 365 ? Math.floor(daysRaw) : 30;
    const result = await fetcher(days);
    res.json(result);
  });

  return router;
}

export const radarrRouter = comingSoonRouter(getRadarrComingSoon);
export const sonarrRouter = comingSoonRouter(getSonarrComingSoon);
