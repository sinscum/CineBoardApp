import { useEffect, useState } from "react";
import "../styles/library-page.css";
import {
  fetchCategoryMovies,
  fetchGenreMovies,
  searchMovies,
  type TMDBCategory,
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
import { GENRES } from "../constants/genres";

type LibraryMode = "category" | "genre" | "search";

function LibraryPage() {
  const [activeId, setActiveId] = useState<number>(getActiveDisplayId());
  const [activeName, setActiveName] = useState<string>(
    loadProfile(getActiveDisplayId()).name
  );

  const [mode, setMode] = useState<LibraryMode>("category");
  const [category, setCategory] = useState<TMDBCategory>("popular");
  const [genreId, setGenreId] = useState(27);
  const [searchQuery, setSearchQuery] = useState("");
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
    if (mode === "search") return;
    loadMovies();
  }, [mode, category, genreId]);

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

  function handlePushToDisplay(movie: MovieDisplayData) {
    setActiveMovie({ id: movie.id, title: movie.title }, activeId);
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
              {GENRES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        )}

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
      {loading && <p className="library-status">Loading movies...</p>}

      <section className="library-grid">
        {movies.map((movie) => {
          const isActive = activeMovie?.id === movie.id && movie.id > 0;
          return (
            <article
              key={movie.id}
              className={`library-card ${isActive ? "library-card-active" : ""}`}
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
    </div>
  );
}

export default LibraryPage;
