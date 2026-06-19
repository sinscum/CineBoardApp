export interface TMDBImageConfig {
  secure_base_url: string;
  poster_sizes: string[];
  backdrop_sizes: string[];
}

export interface TMDBConfigurationResponse {
  images: TMDBImageConfig;
}

export interface TMDBMovieSearchResult {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

export interface TMDBMovieSearchResponse {
  results: TMDBMovieSearchResult[];
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBGenreListResponse {
  genres: TMDBGenre[];
}

export interface TMDBMovieDetailsResponse {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  runtime: number | null;
  genres: TMDBGenre[];
}

export interface TMDBReleaseDateEntry {
  certification: string;
}

export interface TMDBReleaseDatesCountry {
  iso_3166_1: string;
  release_dates: TMDBReleaseDateEntry[];
}

export interface TMDBReleaseDatesResponse {
  results: TMDBReleaseDatesCountry[];
}

export interface MovieDisplayData {
  id: number;
  title: string;
  year: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  genre: string;
  runtime: string;
  rating: string;
}

export interface SelectedMovie {
  id: number;
  title: string;
}