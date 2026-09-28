import { createRoute, notFound } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';
import { movieDetailQueryOptions, sortValues } from '@/entities/movie';
import { HttpError } from '@/shared/api';
import { Spinner } from '@/shared/ui/spinner';
import { type RouterContext, rootRoute } from './root-route';

const PageLoading = () => (
  <div className="page-loading">
    <Spinner size={32} />
  </div>
);

const HomePage = lazy(async () => {
  const { HomePage: Component } = await import('@/pages/home');
  return { default: Component };
});

const CatalogPage = lazy(async () => {
  const { CatalogPage: Component } = await import('@/pages/catalog');
  return { default: Component };
});

const SearchPage = lazy(async () => {
  const { SearchPage: Component } = await import('@/pages/search');
  return { default: Component };
});

const MovieFormPage = lazy(async () => {
  const { MovieFormPage: Component } = await import('@/pages/movie');
  return { default: Component };
});

const MoviePage = lazy(async () => {
  const { MoviePage: Component } = await import('@/pages/movie');
  return { default: Component };
});

const MovieNotFound = lazy(async () => {
  const { MovieNotFound: Component } = await import('@/pages/movie');
  return { default: Component };
});

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const catalogSearchSchema = z.object({
  genero: z.string().optional().catch(undefined),
  ano_min: z.coerce.number().int().min(1888).max(2100).optional().catch(undefined),
  ano_max: z.coerce.number().int().min(1888).max(2100).optional().catch(undefined),
  nota_min: z.coerce.number().min(0).max(10).optional().catch(undefined),
  idioma: z.string().optional().catch(undefined),
  sort: z.enum(sortValues).catch('recent'),
  page: z.coerce.number().int().min(1).catch(1),
});

export const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/catalogo',
  validateSearch: catalogSearchSchema,
  component: CatalogPage,
});

const searchSearchSchema = z.object({
  q: z.string().catch(''),
  genero: z.string().optional().catch(undefined),
  ano_min: z.coerce.number().int().min(1888).max(2100).optional().catch(undefined),
  ano_max: z.coerce.number().int().min(1888).max(2100).optional().catch(undefined),
  nota_min: z.coerce.number().min(0).max(10).optional().catch(undefined),
  idioma: z.string().optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});

export const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/busca',
  validateSearch: searchSearchSchema,
  component: SearchPage,
});

export const movieNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/filme/novo',
  component: MovieFormPage,
});

const ensureMovieLoaded = async ({
  context,
  params,
}: {
  context: RouterContext;
  params: { movieId: string };
}) => {
  try {
    await context.queryClient.ensureQueryData(movieDetailQueryOptions(params.movieId));
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) throw notFound();
    throw error;
  }
};

export const movieDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/filme/$movieId',
  loader: ensureMovieLoaded,
  pendingComponent: PageLoading,
  notFoundComponent: MovieNotFound,
  component: MoviePage,
});

export const movieEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/filme/$movieId/editar',
  loader: ensureMovieLoaded,
  pendingComponent: PageLoading,
  notFoundComponent: MovieNotFound,
  component: MovieFormPage,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  catalogRoute,
  searchRoute,
  movieNewRoute,
  movieDetailRoute,
  movieEditRoute,
]);
