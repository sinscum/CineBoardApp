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

export type TMDBCategory =
  | "popular"
  | "now_playing"
  | "upcoming"
  | "top_rated";

export type TMDBSortBy =
  | "popularity.desc"
  | "primary_release_date.desc"
  | "vote_average.desc"
  | "vote_count.desc";

export interface DiscoverFilters {
  genreId: number | null;
  yearBucket: string;
  language: string;
  sortBy: TMDBSortBy;
  minRating: number;
}

export interface CollectionSearchResult {
  id: number;
  name: string;
  posterUrl: string | null;
  backdropUrl: string | null;
}

interface TMDBCollectionSearchResponse {
  results: Array<{
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  }>;
}

interface TMDBCollectionDetailsResponse {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: TMDBMovieSearchResult[];
}

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

function yearBucketToDateParams(bucket: string): {
  gte?: string;
  lte?: string;
} {
  switch (bucket) {
    case "2020s":
      return { gte: "2020-01-01", lte: "2029-12-31" };
    case "2010s":
      return { gte: "2010-01-01", lte: "2019-12-31" };
    case "2000s":
      return { gte: "2000-01-01", lte: "2009-12-31" };
    case "1990s":
      return { gte: "1990-01-01", lte: "1999-12-31" };
    case "1980s":
      return { gte: "1980-01-01", lte: "1989-12-31" };
    case "1970s":
      return { gte: "1970-01-01", lte: "1979-12-31" };
    case "pre-1970":
      return { lte: "1969-12-31" };
    default:
      return {};
  }
}

function buildDiscoverUrl(filters: DiscoverFilters): string {
  const params = new URLSearchParams({
    language: "en-US",
    sort_by: filters.sortBy,
    page: "1",
    include_adult: "false",
    "vote_count.gte": "50",
  });

  if (filters.genreId !== null) {
    params.set("with_genres", String(filters.genreId));
  }

  if (filters.language && filters.language !== "all") {
    params.set("with_original_language", filters.language);
  }

  if (filters.minRating > 0) {
    params.set("vote_average.gte", String(filters.minRating));
  }

  const dateParams = yearBucketToDateParams(filters.yearBucket);
  if (dateParams.gte) params.set("primary_release_date.gte", dateParams.gte);
  if (dateParams.lte) params.set("primary_release_date.lte", dateParams.lte);

  return `${TMDB_BASE_URL}/discover/movie?${params.toString()}`;
}

function filtersCacheKey(filters: DiscoverFilters): string {
  return [
    "discover",
    filters.genreId ?? "any",
    filters.yearBucket,
    filters.language,
    filters.sortBy,
    filters.minRating,
  ].join("|");
}

async function getDiscoverMovies(
  filters: DiscoverFilters
): Promise<TMDBMovieSearchResponse> {
  const url = buildDiscoverUrl(filters);
  return fetchJson<TMDBMovieSearchResponse>(
    url,
    filtersCacheKey(filters),
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

  const randomIndex = Math.floor(Math.random() * results.length);
  const movie = results[randomIndex];
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

  const randomIndex = Math.floor(Math.random() * results.length);
  const movie = results[randomIndex];
  return buildDisplayDataFromMovie(movie, configuration);
}

export async function fetchCategoryMovies(
  category: TMDBCategory
): Promise<MovieDisplayData[]> {
  const [configuration, categoryResults] = await Promise.all([
    getConfiguration(),
    getCategoryMovies(category),
  ]);

  const results = categoryResults.results ?? [];
  if (results.length === 0) return [];

  return Promise.all(
    results.slice(0, 20).map((m) => buildDisplayDataFromMovie(m, configuration))
  );
}

export async function fetchGenreMovies(
  genreId: number
): Promise<MovieDisplayData[]> {
  const [configuration, genreResults] = await Promise.all([
    getConfiguration(),
    getMoviesByGenre(genreId),
  ]);

  const results = genreResults.results ?? [];
  if (results.length === 0) return [];

  return Promise.all(
    results.slice(0, 20).map((m) => buildDisplayDataFromMovie(m, configuration))
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
  return Promise.all(
    movies.map((m) => buildDisplayDataFromMovie(m, configuration))
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

export async function discoverMovies(
  filters: DiscoverFilters
): Promise<MovieDisplayData[]> {
  const [configuration, results] = await Promise.all([
    getConfiguration(),
    getDiscoverMovies(filters),
  ]);

  const movies = (results.results ?? []).slice(0, 20);
  if (movies.length === 0) return [];

  return Promise.all(
    movies.map((m) => buildDisplayDataFromMovie(m, configuration))
  );
}

export async function fetchDiscoverMovie(
  filters: DiscoverFilters
): Promise<MovieDisplayData> {
  const [configuration, results] = await Promise.all([
    getConfiguration(),
    getDiscoverMovies(filters),
  ]);

  const list = results.results ?? [];
  if (list.length === 0) {
    throw new Error("No movies match the selected filters.");
  }

  const movie = list[Math.floor(Math.random() * list.length)];
  return buildDisplayDataFromMovie(movie, configuration);
}

export async function searchCollections(
  query: string
): Promise<CollectionSearchResult[]> {
  if (!query.trim()) return [];

  const [configuration, response] = await Promise.all([
    getConfiguration(),
    fetchJson<TMDBCollectionSearchResponse>(
      `${TMDB_BASE_URL}/search/collection?query=${encodeURIComponent(
        query
      )}&language=en-US&page=1`,
      `collection-search-${query.toLowerCase()}`,
      6 * 60 * 60 * 1000
    ),
  ]);

  const baseUrl = configuration.images.secure_base_url;
  const posterSize = configuration.images.poster_sizes.includes("w500")
    ? "w500"
    : configuration.images.poster_sizes[0];
  const backdropSize = configuration.images.backdrop_sizes.includes("w780")
    ? "w780"
    : configuration.images.backdrop_sizes[0];

  return (response.results ?? []).slice(0, 20).map((c) => ({
    id: c.id,
    name: c.name,
    posterUrl: buildImageUrl(baseUrl, posterSize, c.poster_path),
    backdropUrl: buildImageUrl(baseUrl, backdropSize, c.backdrop_path),
  }));
}

async function getCollectionDetails(
  collectionId: number
): Promise<TMDBCollectionDetailsResponse> {
  return fetchJson<TMDBCollectionDetailsResponse>(
    `${TMDB_BASE_URL}/collection/${collectionId}?language=en-US`,
    `collection-${collectionId}`,
    24 * 60 * 60 * 1000
  );
}

export async function fetchCollectionMovies(
  collectionId: number
): Promise<MovieDisplayData[]> {
  const [configuration, details] = await Promise.all([
    getConfiguration(),
    getCollectionDetails(collectionId),
  ]);

  const parts = details.parts ?? [];
  if (parts.length === 0) return [];

  const sorted = [...parts].sort((a, b) => {
    const da = a.release_date || "9999";
    const db = b.release_date || "9999";
    return da.localeCompare(db);
  });

  return Promise.all(
    sorted.slice(0, 30).map((m) => buildDisplayDataFromMovie(m, configuration))
  );
}

export async function fetchCollectionMovie(
  collectionId: number
): Promise<MovieDisplayData> {
  const [configuration, details] = await Promise.all([
    getConfiguration(),
    getCollectionDetails(collectionId),
  ]);

  const parts = details.parts ?? [];
  if (parts.length === 0) {
    throw new Error("Collection has no movies.");
  }

  const movie = parts[Math.floor(Math.random() * parts.length)];
  return buildDisplayDataFromMovie(movie, configuration);
}
