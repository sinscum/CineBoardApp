import { useEffect, useState } from "react";
import "../styles/library-page.css";
import {
  fetchCategoryMovies,
  fetchGenreMovies,
  searchMovies,
  discoverMovies,
  searchCollections,
  fetchCollectionMovies,
  type TMDBCategory,
  type DiscoverFilters,
  type CollectionSearchResult,
} from "../services/tmdb";
import type { MovieDisplayData } from "../types/tmdb";
import {
  setActiveMovie,
  getActiveMovie,
  getActiveDisplayId,
  loadProfile,
  ACTIVE_DISPLAY_CHANGED_EVENT,
  PROFILES_CHANGED_EVENT,
} from "../services/displaySettings";
import type {
  TMDBSortByKey,
  YearBucketKey,
} from "../types/displaySettings";

type LibraryMode =
  | "category"
  | "genre"
  | "search"
  | "filters"
  | "collection";

const genreOptions: { id: number; name: string }[] = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 18, name: "Drama" },
  { id: 14, name: "Fantasy" },
  { id: 27, name: "Horror" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Science Fiction" },
  { id: 53, name: "Thriller" },
  { id: 37, name: "Western" },
];

const yearBucketOptions: { value: YearBucketKey; label: string }[] = [
  { value: "all", label: "All Years" },
  { value: "2020s", label: "2020s" },
  { value: "2010s", label: "2010s" },
  { value: "2000s", label: "2000s" },
  { value: "1990s", label: "1990s" },
  { value: "1980s", label: "1980s" },
  { value: "1970s", label: "1970s" },
  { value: "pre-1970", label: "Pre-1970" },
];

const languageOptions: { value: string; label: string }[] = [
  { value: "all", label: "All Languages" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Mandarin" },
  { value: "hi", label: "Hindi" },
];

const sortByOptions: { value: TMDBSortByKey; label: string }[] = [
  { value: "popularity.desc", label: "Popular" },
  { value: "primary_release_date.desc", label: "Newest" },
  { value: "vote_average.desc", label: "Top Rated" },
  { value: "vote_count.desc", label: "Most Voted" },
];

const minRatingOptions: { value: number; label: string }[] = [
  { value: 0, label: "Any Rating" },
  { value: 6, label: "6.0+" },
  { value: 7, label: "7.0+" },
  { value: 7.5, label: "7.5+" },
  { value: 8, label: "8.0+" },
  { value: 8.5, label: "8.5+" },
];

interface EnrichedCollection extends CollectionSearchResult {
  movieCount: number;
}

function LibraryPage() {
  const [activeId, setActiveId] = useState<number>(getActiveDisplayId());
  const [activeName, setActiveName] = useState<string>(
    loadProfile(getActiveDisplayId()).name
  );

  const [mode, setMode] = useState<LibraryMode>("category");
  const [category, setCategory] = useState<TMDBCategory>("popular");
  const [genreId, setGenreId] = useState(27);
  const [searchQuery, setSearchQuery] = useState("");

  const [filterGenreId, setFilterGenreId] = useState<number | null>(null);
  const [filterYearBucket, setFilterYearBucket] = useState<YearBucketKey>("all");
  const [filterLanguage, setFilterLanguage] = useState<string>("all");
  const [filterSortBy, setFilterSortBy] = useState<TMDBSortByKey>(
    "popularity.desc"
  );
  const [filterMinRating, setFilterMinRating] = useState<number>(0);

  const [collectionQuery, setCollectionQuery] = useState("");
  const [collectionResults, setCollectionResults] = useState<
    EnrichedCollection[]
  >([]);
  const [selectedCollection, setSelectedCollection] =
    useState<EnrichedCollection | null>(null);

  const [movies, setMovies] = useState<MovieDisplayData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [activeMovie, setActiveMovieState] = useState(
    getActiveMovie(getActiveDisplayId())
  );

  useEffect(() => {
    function refresh() {
      const id = getActiveDisplayId();
      setActiveId(id);
      setActiveName(loadProfile(id).name);
      setActiveMovieState(getActiveMovie(id));
    }
    window.addEventListener(ACTIVE_DISPLAY_CHANGED_EVENT, refresh);
    window.addEventListener(PROFILES_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(ACTIVE_DISPLAY_CHANGED_EVENT, refresh);
      window.removeEventListener(PROFILES_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    if (mode === "search" || mode === "collection") return;
    loadMovies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mode,
    category,
    genreId,
    filterGenreId,
    filterYearBucket,
    filterLanguage,
    filterSortBy,
    filterMinRating,
  ]);

  async function loadMovies() {
    try {
      setLoading(true);
      setError(null);

      let results: MovieDisplayData[] = [];

      if (mode === "category") {
        results = await fetchCategoryMovies(category);
      } else if (mode === "genre") {
        results = await fetchGenreMovies(genreId);
      } else if (mode === "search" && searchQuery.trim()) {
        results = await searchMovies(searchQuery);
      } else if (mode === "filters") {
        const filters: DiscoverFilters = {
          genreId: filterGenreId,
          yearBucket: filterYearBucket,
          language: filterLanguage,
          sortBy: filterSortBy,
          minRating: filterMinRating,
        };
        results = await discoverMovies(filters);
      } else if (mode === "collection" && selectedCollection) {
        results = await fetchCollectionMovies(selectedCollection.id);
      }

      setMovies(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load movies.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      setLoading(true);
      setError(null);
      setMode("search");
      const results = await searchMovies(searchQuery);
      setMovies(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCollectionSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!collectionQuery.trim()) return;
    try {
      setLoading(true);
      setError(null);
      setSelectedCollection(null);
      setMovies([]);

      const raw = await searchCollections(collectionQuery);

      const enriched = await Promise.all(
        raw.map(async (c) => {
          try {
            const movies = await fetchCollectionMovies(c.id);
            return { ...c, movieCount: movies.length };
          } catch {
            return { ...c, movieCount: 0 };
          }
        })
      );

      const filtered = enriched
        .filter((c) => c.movieCount >= 2)
        .sort((a, b) => b.movieCount - a.movieCount);

      setCollectionResults(filtered);

      if (filtered.length === 0) {
        setError(
          `No collections with 2+ movies matched "${collectionQuery}". Try a broader term like "Halloween" or "Star Wars".`
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Collection search failed."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectCollection(collection: EnrichedCollection) {
    try {
      setLoading(true);
      setError(null);
      setSelectedCollection(collection);
      const results = await fetchCollectionMovies(collection.id);
      setMovies(results);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load collection."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleBackToCollectionSearch() {
    setSelectedCollection(null);
    setMovies([]);
  }

  function handlePushToDisplay(movie: MovieDisplayData) {
    setActiveMovie(
      {
        id: movie.id,
        title: movie.title,
      },
      activeId
    );
    setActiveMovieState({ id: movie.id, title: movie.title });
    setStatusMessage(`Pushed "${movie.title}" to ${activeName}.`);
    window.setTimeout(() => setStatusMessage(""), 2500);
  }

  function handleClearActive() {
    setActiveMovie(null, activeId);
    setActiveMovieState(null);
    setStatusMessage(`Cleared pinned movie on ${activeName}.`);
    window.setTimeout(() => setStatusMessage(""), 2500);
  }

  function handleOpenDisplay() {
    window.open(`/display/${activeId}`, "_blank");
  }

  return (
    <div className="library-page">
      <section className="library-heading">
        <h1>Library</h1>
        <p className="library-subtitle">
          Browse posters, search TMDB, and push a movie directly to{" "}
          <strong style={{ color: "#f5c14b" }}>{activeName}</strong>.
        </p>
      </section>

      {activeMovie && (
        <section className="library-active-banner">
          <div>
            <strong>Pinned to {activeName}:</strong> {activeMovie.title}
          </div>
          <button
            className="library-clear-btn"
            type="button"
            onClick={handleClearActive}
          >
            Clear Pinned Movie
          </button>
        </section>
      )}

      <section className="library-toolbar">
        <div className="library-filter">
          <label className="library-toolbar-label">Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as LibraryMode)}
          >
            <option value="category">Category</option>
            <option value="genre">Genre</option>
            <option value="filters">Filters</option>
            <option value="collection">Collection</option>
            <option value="search">Search</option>
          </select>
        </div>

        {mode === "category" && (
          <div className="library-filter">
            <label className="library-toolbar-label">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TMDBCategory)}
            >
              <option value="popular">Popular</option>
              <option value="now_playing">Now Playing</option>
              <option value="upcoming">Coming Soon</option>
              <option value="top_rated">Top Rated</option>
            </select>
          </div>
        )}

        {mode === "genre" && (
          <div className="library-filter">
            <label className="library-toolbar-label">Genre</label>
            <select
              value={String(genreId)}
              onChange={(e) => setGenreId(Number(e.target.value))}
            >
              {genreOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === "filters" && (
          <>
            <div className="library-filter">
              <label className="library-toolbar-label">Genre</label>
              <select
                value={filterGenreId === null ? "all" : String(filterGenreId)}
                onChange={(e) =>
                  setFilterGenreId(
                    e.target.value === "all" ? null : Number(e.target.value)
                  )
                }
              >
                <option value="all">All Genres</option>
                {genreOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="library-filter">
              <label className="library-toolbar-label">Year</label>
              <select
                value={filterYearBucket}
                onChange={(e) =>
                  setFilterYearBucket(e.target.value as YearBucketKey)
                }
              >
                {yearBucketOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="library-filter">
              <label className="library-toolbar-label">Language</label>
              <select
                value={filterLanguage}
                onChange={(e) => setFilterLanguage(e.target.value)}
              >
                {languageOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="library-filter">
              <label className="library-toolbar-label">Sort</label>
              <select
                value={filterSortBy}
                onChange={(e) =>
                  setFilterSortBy(e.target.value as TMDBSortByKey)
                }
              >
                {sortByOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="library-filter">
              <label className="library-toolbar-label">Min Rating</label>
              <select
                value={String(filterMinRating)}
                onChange={(e) => setFilterMinRating(Number(e.target.value))}
              >
                {minRatingOptions.map((o) => (
                  <option key={o.value} value={String(o.value)}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {mode === "collection" && (
          <form className="library-search" onSubmit={handleCollectionSearch}>
            <label className="library-toolbar-label">Collection</label>
            <div className="library-search-row">
              <input
                type="text"
                placeholder="e.g. Halloween, Star Wars, Marvel..."
                value={collectionQuery}
                onChange={(e) => setCollectionQuery(e.target.value)}
              />
              <button type="submit">Search</button>
            </div>
          </form>
        )}

        {mode === "search" && (
          <form className="library-search" onSubmit={handleSearch}>
            <label className="library-toolbar-label">Search</label>
            <div className="library-search-row">
              <input
                type="text"
                placeholder="Type a movie title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit">Search</button>
            </div>
          </form>
        )}

        {mode !== "search" && mode !== "collection" && (
          <div className="library-filter">
            <label className="library-toolbar-label">&nbsp;</label>
            <button
              className="library-action-btn"
              type="button"
              onClick={loadMovies}
            >
              Refresh
            </button>
          </div>
        )}

        {mode === "collection" && selectedCollection && (
          <div className="library-filter">
            <label className="library-toolbar-label">&nbsp;</label>
            <button
              className="library-action-btn"
              type="button"
              onClick={handleBackToCollectionSearch}
            >
              Back to Search
            </button>
          </div>
        )}

        <div className="library-filter">
          <label className="library-toolbar-label">&nbsp;</label>
          <button
            className="library-action-btn"
            type="button"
            onClick={handleOpenDisplay}
          >
            Open {activeName}
          </button>
        </div>
      </section>

      {statusMessage && <p className="library-status">{statusMessage}</p>}
      {error && (
        <p className="library-status library-status-error">{error}</p>
      )}
      {loading && <p className="library-status">Loading...</p>}

      {mode === "collection" &&
        !selectedCollection &&
        collectionResults.length > 0 && (
          <section className="library-grid">
            {collectionResults.map((c) => (
              <article
                key={c.id}
                className="library-card"
                onClick={() => handleSelectCollection(c)}
              >
                <div
                  className="library-poster"
                  style={{
                    backgroundImage: c.posterUrl
                      ? `url(${c.posterUrl})`
                      : undefined,
                  }}
                >
                  {!c.posterUrl && "Collection"}
                  <div className="library-collection-count">
                    {c.movieCount} movies
                  </div>
                </div>
                <div className="library-card-body">
                  <h3 className="library-card-title">{c.name}</h3>
                  <p className="library-card-meta">Collection</p>
                  <span className="library-card-source">TMDB</span>
                </div>
              </article>
            ))}
          </section>
        )}

      {(mode !== "collection" || selectedCollection) && movies.length > 0 && (
        <>
          {mode === "collection" && selectedCollection && (
            <h2
              style={{
                margin: "8px 0 16px",
                color: "#f5f7fa",
                fontSize: "1.2rem",
              }}
            >
              {selectedCollection.name}
              <span
                style={{
                  marginLeft: 10,
                  color: "#9fb0bf",
                  fontWeight: 400,
                  fontSize: "0.9rem",
                }}
              >
                ({movies.length} movies)
              </span>
            </h2>
          )}

          <section className="library-grid">
            {movies.map((movie, idx) => {
              const isActive =
                activeMovie?.id === movie.id && movie.id > 0;
              return (
                <article
                  key={`${movie.title}-${idx}`}
                  className={`library-card ${
                    isActive ? "library-card-active" : ""
                  }`}
                  onClick={() => handlePushToDisplay(movie)}
                >
                  <div
                    className="library-poster"
                    style={{
                      backgroundImage: movie.posterUrl
                        ? `url(${movie.posterUrl})`
                        : undefined,
                    }}
                  >
                    {!movie.posterUrl && "No Poster"}
                    {isActive && (
                      <div className="library-poster-pinned">PINNED</div>
                    )}
                  </div>
                  <div className="library-card-body">
                    <h3 className="library-card-title">{movie.title}</h3>
                    <p className="library-card-meta">
                      {movie.year} • {movie.genre}
                    </p>
                    <span className="library-card-source">TMDB</span>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}

      {mode === "collection" &&
        !selectedCollection &&
        collectionResults.length === 0 &&
        !loading &&
        !error && (
          <p
            style={{
              color: "#9fb0bf",
              fontSize: "0.95rem",
              padding: "24px 0",
            }}
          >
            Search for a movie franchise above (Halloween, Marvel, Star Wars,
            etc.) and pick one to browse its movies.
          </p>
        )}
    </div>
  );
}

export default LibraryPage;
