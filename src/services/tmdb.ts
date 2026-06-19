import type {
  TMDBConfigurationResponse,
  TMDBMovieSearchResponse,
  TMDBMovieSearchResult,
  MovieDisplayData,
  TMDBGenre,
  TMDBGenreListResponse,
  TMDBMovieDetailsResponse,
  TMDBReleaseDatesResponse,
} from "../types/tmdb";
import { getCached, setCached } from "./cache";

const TMDB_READ_TOKEN = import.meta.env.VITE_TMDB_READ_TOKEN;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const LIBRARY_CONCURRENCY = 5;

export type TMDBCategory =
  | "popular"
  | "now_playing"
  | "upcoming"
  | "top_rated";

function getHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${TMDB_READ_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function ensureToken() {
  if (!TMDB_READ_TOKEN) {
    throw new Error(
      "TMDB token is missing. Add VITE_TMDB_READ_TOKEN to your .env.local file."
    );
  }
}

async function fetchJson<T>(
  url: string,
  cacheKey?: string,
  cacheMs: number = 6 * 60 * 60 * 1000
): Promise<T> {
  if (cacheKey) {
    const cached = getCached<T>(cacheKey, cacheMs);
    if (cached) return cached;
  }

  ensureToken();

  const response = await fetch(url, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(
      `TMDB request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as T;

  if (cacheKey) {
    setCached(cacheKey, data);
  }

  return data;
}

/**
 * Run an async function over an array with at most `limit` in-flight at once.
 * Preserves input order in the returned array.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
}

async function getConfiguration(): Promise<TMDBConfigurationResponse> {
  return fetchJson<TMDBConfigurationResponse>(
    `${TMDB_BASE_URL}/configuration`,
    "tmdb-config",
    24 * 60 * 60 * 1000
  );
}

export async function fetchMovieGenres(): Promise<TMDBGenre[]> {
  const data = await fetchJson<TMDBGenreListResponse>(
    `${TMDB_BASE_URL}/genre/movie/list?language=en-US`,
    "tmdb-genres",
    7 * 24 * 60 * 60 * 1000
  );
  return data.genres ?? [];
}

async function getCategoryMovies(
  category: TMDBCategory
): Promise<TMDBMovieSearchResponse> {
  return fetchJson<TMDBMovieSearchResponse>(
    `${TMDB_BASE_URL}/movie/${category}?language=en-US&page=1`,
    `category-${category}`,
    6 * 60 * 60 * 1000
  );
}

async function getMoviesByGenre(
  genreId: number
): Promise<TMDBMovieSearchResponse> {
  return fetchJson<TMDBMovieSearchResponse>(
    `${TMDB_BASE_URL}/discover/movie?language=en-US&sort_by=popularity.desc&page=1&with_genres=${genreId}&include_adult=false`,
    `genre-${genreId}`,
    6 * 60 * 60 * 1000
  );
}

async function getMovieDetails(
  movieId: number
): Promise<TMDBMovieDetailsResponse> {
  return fetchJson<TMDBMovieDetailsResponse>(
    `${TMDB_BASE_URL}/movie/${movieId}?language=en-US`,
    `movie-${movieId}`,
    24 * 60 * 60 * 1000
  );
}

async function getMovieReleaseDates(
  movieId: number
): Promise<TMDBReleaseDatesResponse> {
  return fetchJson<TMDBReleaseDatesResponse>(
    `${TMDB_BASE_URL}/movie/${movieId}/release_dates`,
    `releases-${movieId}`,
    24 * 60 * 60 * 1000
  );
}

function buildImageUrl(
  baseUrl: string,
  size: string | undefined,
  filePath: string | null | undefined
): string | null {
  if (!filePath || !size) return null;
  return `${baseUrl}${size}${filePath}`;
}

function extractCertification(data: TMDBReleaseDatesResponse): string {
  const us = data.results.find((entry) => entry.iso_3166_1 === "US");
  const usCert = us?.release_dates.find(
    (item) => item.certification
  )?.certification;
  if (usCert) return usCert;

  for (const country of data.results) {
    const cert = country.release_dates.find(
      (item) => item.certification
    )?.certification;
    if (cert) return cert;
  }

  return "NR";
}

async function buildDisplayDataFromMovie(
  movie: TMDBMovieSearchResult,
  configuration: TMDBConfigurationResponse
): Promise<MovieDisplayData> {
  const [details, releaseDates] = await Promise.all([
    getMovieDetails(movie.id),
    getMovieReleaseDates(movie.id),
  ]);

  const baseUrl = configuration.images.secure_base_url;
  const posterSize = configuration.images.poster_sizes.includes("w780")
    ? "w780"
    : configuration.images.poster_sizes.includes("w500")
    ? "w500"
    : configuration.images.poster_sizes[0];

  const backdropSize = configuration.images.backdrop_sizes.includes("w1280")
    ? "w1280"
    : configuration.images.backdrop_sizes.includes("w780")
    ? "w780"
    : configuration.images.backdrop_sizes[0];

  const genre = details.genres?.[0]?.name ?? "Unknown";
  const runtime =
    typeof details.runtime === "number" && details.runtime > 0
      ? `${details.runtime} min`
      : "--";
  const rating = extractCertification(releaseDates);

  return {
    id: details.id,
    title: details.title || movie.title || "Unknown Title",
    year: details.release_date ? details.release_date.slice(0, 4) : "Unknown",
    posterUrl: buildImageUrl(baseUrl, posterSize, details.poster_path),
    backdropUrl: buildImageUrl(baseUrl, backdropSize, details.backdrop_path),
    genre,
    runtime,
    rating,
  };
}

export async function fetchCategoryMovie(
  category: TMDBCategory
): Promise<MovieDisplayData> {
  const [configuration, categoryResults] = await Promise.all([
    getConfiguration(),
    getCategoryMovies(category),
  ]);

  const results = categoryResults.results ?? [];
  if (results.length === 0) {
    throw new Error(`No movies returned from TMDB category "${category}".`);
  }

  const movie = results[Math.floor(Math.random() * results.length)];
  return buildDisplayDataFromMovie(movie, configuration);
}

export async function fetchGenreMovie(
  genreId: number
): Promise<MovieDisplayData> {
  const [configuration, genreResults] = await Promise.all([
    getConfiguration(),
    getMoviesByGenre(genreId),
  ]);

  const results = genreResults.results ?? [];
  if (results.length === 0) {
    throw new Error(`No movies returned for genre ID ${genreId}.`);
  }

  const movie = results[Math.floor(Math.random() * results.length)];
  return buildDisplayDataFromMovie(movie, configuration);
}

export async function fetchCategoryMovies(
  category: TMDBCategory
): Promise<MovieDisplayData[]> {
  const [configuration, categoryResults] = await Promise.all([
    getConfiguration(),
    getCategoryMovies(category),
  ]);

  const results = (categoryResults.results ?? []).slice(0, 20);
  if (results.length === 0) return [];

  return mapWithConcurrency(results, LIBRARY_CONCURRENCY, (m) =>
    buildDisplayDataFromMovie(m, configuration)
  );
}

export async function fetchGenreMovies(
  genreId: number
): Promise<MovieDisplayData[]> {
  const [configuration, genreResults] = await Promise.all([
    getConfiguration(),
    getMoviesByGenre(genreId),
  ]);

  const results = (genreResults.results ?? []).slice(0, 20);
  if (results.length === 0) return [];

  return mapWithConcurrency(results, LIBRARY_CONCURRENCY, (m) =>
    buildDisplayDataFromMovie(m, configuration)
  );
}

export async function searchMovies(
  query: string
): Promise<MovieDisplayData[]> {
  if (!query.trim()) return [];

  const [configuration, results] = await Promise.all([
    getConfiguration(),
    fetchJson<TMDBMovieSearchResponse>(
      `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(
        query
      )}&language=en-US&page=1&include_adult=false`,
      `search-${query.toLowerCase()}`,
      1 * 60 * 60 * 1000
    ),
  ]);

  const movies = (results.results ?? []).slice(0, 20);
  return mapWithConcurrency(movies, LIBRARY_CONCURRENCY, (m) =>
    buildDisplayDataFromMovie(m, configuration)
  );
}

export async function fetchMovieById(
  movieId: number
): Promise<MovieDisplayData> {
  const [configuration, details, releaseDates] = await Promise.all([
    getConfiguration(),
    getMovieDetails(movieId),
    getMovieReleaseDates(movieId),
  ]);

  const baseUrl = configuration.images.secure_base_url;
  const posterSize = configuration.images.poster_sizes.includes("w780")
    ? "w780"
    : configuration.images.poster_sizes.includes("w500")
    ? "w500"
    : configuration.images.poster_sizes[0];

  const backdropSize = configuration.images.backdrop_sizes.includes("w1280")
    ? "w1280"
    : configuration.images.backdrop_sizes.includes("w780")
    ? "w780"
    : configuration.images.backdrop_sizes[0];

  const genre = details.genres?.[0]?.name ?? "Unknown";
  const runtime =
    typeof details.runtime === "number" && details.runtime > 0
      ? `${details.runtime} min`
      : "--";
  const rating = extractCertification(releaseDates);

  return {
    id: details.id,
    title: details.title || "Unknown Title",
    year: details.release_date ? details.release_date.slice(0, 4) : "Unknown",
    posterUrl: buildImageUrl(baseUrl, posterSize, details.poster_path),
    backdropUrl: buildImageUrl(baseUrl, backdropSize, details.backdrop_path),
    genre,
    runtime,
    rating,
  };
}
