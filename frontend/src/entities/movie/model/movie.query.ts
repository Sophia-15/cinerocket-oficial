import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  addReview,
  createMovie,
  deleteMovie,
  getGenres,
  getLanguages,
  getMovie,
  getMovies,
  type MoviesQueryParams,
  updateMovie,
} from '../api/movie.api';
import type { Movie, MovieDraft, ReviewDraft } from './movie.schema';

export const movieKeys = {
  all: ['movies'] as const,
  lists: () => [...movieKeys.all, 'list'] as const,
  list: (params: MoviesQueryParams) => [...movieKeys.lists(), params] as const,
  details: () => [...movieKeys.all, 'detail'] as const,
  detail: (idFilme: string) => [...movieKeys.details(), idFilme] as const,
  genres: () => [...movieKeys.all, 'genres'] as const,
  languages: () => [...movieKeys.all, 'languages'] as const,
};

export const movieDetailQueryOptions = (idFilme: string) =>
  queryOptions({
    queryKey: movieKeys.detail(idFilme),
    queryFn: ({ signal }) => getMovie(idFilme, signal),
  });

export const moviesListQueryOptions = (params: MoviesQueryParams) =>
  queryOptions({
    queryKey: movieKeys.list(params),
    queryFn: ({ signal }) => getMovies(params, signal),
  });

export const useMoviesQuery = (params: MoviesQueryParams) =>
  useQuery({ ...moviesListQueryOptions(params), placeholderData: keepPreviousData });

export const useMovieQuery = (idFilme: string) => useQuery(movieDetailQueryOptions(idFilme));

export const useGenresQuery = () =>
  useQuery({
    queryKey: movieKeys.genres(),
    queryFn: ({ signal }) => getGenres(signal),
    staleTime: 5 * 60_000,
  });

export const useLanguagesQuery = () =>
  useQuery({
    queryKey: movieKeys.languages(),
    queryFn: ({ signal }) => getLanguages(signal),
    staleTime: 5 * 60_000,
  });

export const useCreateMovieMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MovieDraft) => createMovie(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: movieKeys.lists() });
    },
  });
};

export const useUpdateMovieMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ idFilme, input }: { idFilme: string; input: MovieDraft }) =>
      updateMovie(idFilme, input),
    onSuccess: (movie: Movie) => {
      queryClient.invalidateQueries({ queryKey: movieKeys.lists() });
      queryClient.setQueryData(movieKeys.detail(movie.id_filme), movie);
    },
  });
};

export const useDeleteMovieMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (idFilme: string) => deleteMovie(idFilme),
    onSuccess: (_data, idFilme) => {
      queryClient.invalidateQueries({ queryKey: movieKeys.lists() });
      queryClient.removeQueries({ queryKey: movieKeys.detail(idFilme) });
    },
  });
};

export const useAddReviewMutation = (idFilme: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewDraft) => addReview(idFilme, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: movieKeys.detail(idFilme) });
      queryClient.invalidateQueries({ queryKey: movieKeys.lists() });
    },
  });
};
