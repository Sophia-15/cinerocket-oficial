import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { Film, Plus } from 'lucide-react';
import Select, { type SingleValue } from 'react-select';
import { MovieCard, type SortBy, useMoviesQuery } from '@/entities/movie';
import { MovieFilters, type MovieFilterValues } from '@/modules/movie-filters';
import { useDocumentTitle } from '@/shared/lib/use-document-title';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorBanner } from '@/shared/ui/error-banner';
import { Pagination } from '@/shared/ui/pagination';
import { Spinner } from '@/shared/ui/spinner';

const PAGE_SIZE = 20;

type SortOption = { value: SortBy; label: string };
const sortOptions: SortOption[] = [
  { value: 'recent', label: 'Adicionados' },
  { value: 'title', label: 'Título' },
  { value: 'year', label: 'Ano' },
  { value: 'popularity', label: 'Popularidade' },
  { value: 'imdb_rating', label: 'Nota IMDB' },
  { value: 'user_rating', label: 'Nota dos usuários' },
];

export const CatalogPage = () => {
  useDocumentTitle('Catálogo · CineRocket');
  const { genero, ano_min, ano_max, nota_min, idioma, sort, page } = useSearch({
    from: '/catalogo',
  });
  const navigate = useNavigate({ from: '/catalogo' });
  const moviesQuery = useMoviesQuery({
    genre: genero,
    yearFrom: ano_min,
    yearTo: ano_max,
    minUserRating: nota_min,
    language: idioma,
    sortBy: sort,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const total = moviesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filterValues: MovieFilterValues = {
    genres: genero ? genero.split(',').filter(Boolean) : [],
    yearFrom: ano_min,
    yearTo: ano_max,
    minUserRating: nota_min,
    languages: idioma ? idioma.split(',').filter(Boolean) : [],
  };
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
  const setSort = (value: SortBy) =>
    navigate({ search: (prev) => ({ ...prev, sort: value, page: 1 }) });
  const goToPage = (nextPage: number) =>
    navigate({ search: (prev) => ({ ...prev, page: nextPage }) });

  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">A SUA COLEÇÃO</div>
          <h1>Catálogo</h1>
          <p>{moviesQuery.data ? `${total} filmes para descobrir` : 'Carregando…'}</p>
        </div>
        <Link className="button primary" to="/filme/novo">
          <Plus size={17} /> Adicionar filme
        </Link>
      </div>
      <fieldset className="filters filter-panel catalog-filter-panel">
        <legend className="sr-only">Filtros de filmes</legend>
        <MovieFilters values={filterValues} onChange={setFilters} onClear={clearFilters} />
        <div className="filter-controls">
          <label className="movie-filter-field sort" htmlFor="catalog-sort">
            <span>Ordenar</span>
            <Select
              inputId="catalog-sort"
              className="movie-filter-select sort-select"
              classNamePrefix="cinerocket"
              value={sortOptions.find((item) => item.value === sort)}
              onChange={(option: SingleValue<SortOption>) => setSort(option?.value ?? 'recent')}
              options={sortOptions}
              isSearchable={false}
            />
          </label>
        </div>
      </fieldset>

      {moviesQuery.isLoading && (
        <div className="page-loading">
          <Spinner size={32} />
        </div>
      )}
      {moviesQuery.isError && (
        <ErrorBanner
          message="Não foi possível carregar o catálogo."
          onRetry={moviesQuery.refetch}
        />
      )}
      {moviesQuery.data && moviesQuery.data.items.length === 0 && (
        <EmptyState
          icon={<Film size={34} />}
          title="Nenhum filme encontrado"
          message="Tente outro gênero ou outra ordenação."
        />
      )}
      {moviesQuery.data && moviesQuery.data.items.length > 0 && (
        <>
          <p className="results-count">
            Mostrando {moviesQuery.data.items.length} de {total} filmes
          </p>
          <div
            className="catalog-grid"
            style={moviesQuery.isPlaceholderData ? { opacity: 0.6 } : undefined}
          >
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
