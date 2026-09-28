import { httpClient } from '@/shared/api';
import {
  companyListSchema,
  genreListSchema,
  languageListSchema,
  type Movie,
  type MovieDraft,
  type MovieList,
  type MovieReview,
  movieListSchema,
  movieReviewSchema,
  movieSchema,
  type PersonType,
  personListSchema,
  type ReviewDraft,
  type SortBy,
} from '../model/movie.schema';

export type MoviesQueryParams = {
  q?: string;
  genre?: string;
  yearFrom?: number;
  yearTo?: number;
  minUserRating?: number;
  language?: string;
  sortBy?: SortBy;
  limit?: number;
  offset?: number;
};

const toWritePayload = (input: MovieDraft) => ({
  ...input,
  poster_url: input.poster_url === '' ? null : input.poster_url,
});

export const getMovies = async (
  params: MoviesQueryParams,
  signal?: AbortSignal,
): Promise<MovieList> => {
  const payload = await httpClient.get('/movies', {
    query: {
      q: params.q,
      genre: params.genre,
      year_from: params.yearFrom,
      year_to: params.yearTo,
      min_user_rating: params.minUserRating,
      language: params.language,
      sort_by: params.sortBy,
      limit: params.limit,
      offset: params.offset,
    },
    signal,
  });
  return movieListSchema.parse(payload);
};

export const getMovie = async (idFilme: string, signal?: AbortSignal): Promise<Movie> => {
  const payload = await httpClient.get(`/movies/${encodeURIComponent(idFilme)}`, { signal });
  return movieSchema.parse(payload);
};

export const createMovie = async (input: MovieDraft): Promise<Movie> => {
  const payload = await httpClient.post('/movies', toWritePayload(input));
  return movieSchema.parse(payload);
};

export const updateMovie = async (idFilme: string, input: MovieDraft): Promise<Movie> => {
  const payload = await httpClient.put(
    `/movies/${encodeURIComponent(idFilme)}`,
    toWritePayload(input),
  );
  return movieSchema.parse(payload);
};

export const deleteMovie = async (idFilme: string): Promise<void> => {
  await httpClient.delete(`/movies/${encodeURIComponent(idFilme)}`);
};

export const addReview = async (idFilme: string, input: ReviewDraft): Promise<MovieReview> => {
  const payload = await httpClient.post(`/movies/${encodeURIComponent(idFilme)}/reviews`, input);
  return movieReviewSchema.parse(payload);
};

export const getGenres = async (signal?: AbortSignal): Promise<string[]> => {
  const payload = await httpClient.get('/movies/genres', { signal });
  return genreListSchema.parse(payload).genres;
};

export const getLanguages = async (signal?: AbortSignal): Promise<string[]> => {
  const payload = await httpClient.get('/movies/languages', { signal });
  return languageListSchema.parse(payload).languages;
};

export const searchPeople = async (
  tipoPessoa: PersonType,
  q: string,
  signal?: AbortSignal,
): Promise<string[]> => {
  const payload = await httpClient.get('/movies/people', {
    query: { tipo_pessoa: tipoPessoa, q, limit: 10 },
    signal,
  });
  return personListSchema.parse(payload).people;
};

export const searchCompanies = async (q: string, signal?: AbortSignal): Promise<string[]> => {
  const payload = await httpClient.get('/movies/companies', {
    query: { q, limit: 10 },
    signal,
  });
  return companyListSchema.parse(payload).companies;
};
