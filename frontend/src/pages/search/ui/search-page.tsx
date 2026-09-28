import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { MovieCard, moviesListQueryOptions } from '@/entities/movie';
import { MovieFilters, type MovieFilterValues } from '@/modules/movie-filters';
import { useDocumentTitle } from '@/shared/lib/use-document-title';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorBanner } from '@/shared/ui/error-banner';
import { Pagination } from '@/shared/ui/pagination';
import { Spinner } from '@/shared/ui/spinner';

const PAGE_SIZE = 20;

export const SearchPage = () => {
  useDocumentTitle('Busca · CineRocket');
  const { q, genero, ano_min, ano_max, nota_min, idioma, page } = useSearch({ from: '/busca' });
  const navigate = useNavigate({ from: '/busca' });
  const query = q.trim();
  const filterValues: MovieFilterValues = {
    genres: genero ? genero.split(',').filter(Boolean) : [],
    yearFrom: ano_min,
    yearTo: ano_max,
    minUserRating: nota_min,
    languages: idioma ? idioma.split(',').filter(Boolean) : [],
  };
  const moviesQuery = useQuery({
    ...moviesListQueryOptions({
      q: query,
      genre: genero,
      yearFrom: ano_min,
      yearTo: ano_max,
      minUserRating: nota_min,
      language: idioma,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    enabled: query.length > 0,
    placeholderData: keepPreviousData,
  });
  const total = moviesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const goToPage = (nextPage: number) =>
    navigate({ search: (prev) => ({ ...prev, page: nextPage }) });
  const setFilters = (next: MovieFilterValues) =>
    navigate({
      search: (prev) => ({
        ...prev,
        genero: next.genres?.join(',') || undefined,
        ano_min: next.yearFrom,
        ano_max: next.yearTo,
        nota_min: next.minUserRating,
        idioma: next.languages?.join(',') || undefined,
        page: 1,
      }),
    });
  const clearFilters = () => setFilters({});

  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">RESULTADOS DE BUSCA</div>
          <h1>Resultados para “{query}”</h1>
          <p>{moviesQuery.data ? `${total} filmes encontrados` : ''}</p>
        </div>
      </div>

      {query && (
        <fieldset className="filters filter-panel search-filter-panel">
          <legend className="sr-only">Filtros de filmes</legend>
          <MovieFilters values={filterValues} onChange={setFilters} onClear={clearFilters} />
        </fieldset>
      )}

      {!query && (
        <EmptyState
          icon={<Search size={34} />}
          title="Busque por um filme"
          message="Digite um título, diretor ou pessoa do elenco na barra de busca."
        />
      )}
      {query && moviesQuery.isLoading && (
        <div className="page-loading">
          <Spinner size={32} />
        </div>
      )}
      {query && moviesQuery.isError && (
        <ErrorBanner message="Não foi possível buscar filmes." onRetry={moviesQuery.refetch} />
      )}
      {query && moviesQuery.data && moviesQuery.data.items.length === 0 && (
        <EmptyState
          icon={<Search size={34} />}
          title="Nada por aqui"
          message="Tente buscar por outro título, diretor ou pessoa do elenco."
        />
      )}
      {query && moviesQuery.data && moviesQuery.data.items.length > 0 && (
        <>
          <p className="results-count">
            Mostrando {moviesQuery.data.items.length} de {total} filmes
          </p>
          <div className="catalog-grid">
            {moviesQuery.data.items.map((movie) => (
              <MovieCard key={movie.id_filme} movie={movie} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />
        </>
      )}
    </>
  );
};
