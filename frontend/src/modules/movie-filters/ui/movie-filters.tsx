import Select, { type MultiValue, type SingleValue } from 'react-select';
import {
  getLanguageLabel,
  translateGenreLabel,
  useGenresQuery,
  useLanguagesQuery,
} from '@/entities/movie';
import { ErrorBanner } from '@/shared/ui/error-banner';
import type { MovieFilterValues } from '../model/movie-filter.types';

type FilterOption = { value: string; label: string };
type YearRangeOption = FilterOption & { yearFrom?: number; yearTo?: number };

const RATING_OPTIONS: FilterOption[] = [
  { value: '', label: 'Qualquer nota' },
  { value: '6', label: '6,0 ou mais' },
  { value: '7', label: '7,0 ou mais' },
  { value: '8', label: '8,0 ou mais' },
  { value: '9', label: '9,0 ou mais' },
];

const YEAR_RANGE_OPTIONS: YearRangeOption[] = [
  { value: 'all', label: 'Todos os anos' },
  { value: '2020s', label: '2020 em diante', yearFrom: 2020 },
  { value: '2010s', label: '2010–2019', yearFrom: 2010, yearTo: 2019 },
  { value: '2000s', label: '2000–2009', yearFrom: 2000, yearTo: 2009 },
  { value: '1990s', label: '1990–1999', yearFrom: 1990, yearTo: 1999 },
  { value: '1980s', label: '1980–1989', yearFrom: 1980, yearTo: 1989 },
  { value: 'before-1980', label: 'Antes de 1980', yearTo: 1979 },
];

type MovieFiltersProps = {
  values: MovieFilterValues;
  onChange: (values: MovieFilterValues) => void;
  onClear: () => void;
};

const getYearRangeValue = (values: MovieFilterValues): YearRangeOption => {
  return (
    YEAR_RANGE_OPTIONS.find(
      (option) => option.yearFrom === values.yearFrom && option.yearTo === values.yearTo,
    ) ?? YEAR_RANGE_OPTIONS[0]
  );
};

export const MovieFilters = ({ values, onChange, onClear }: MovieFiltersProps) => {
  const genresQuery = useGenresQuery();
  const languagesQuery = useLanguagesQuery();
  const languageOptions: FilterOption[] = [
    { value: '', label: 'Todos os idiomas' },
    ...(languagesQuery.data ?? []).map((language) => ({
      value: language,
      label: getLanguageLabel(language),
    })),
  ];
  const hasActiveFilters =
    (values.genres?.length ?? 0) > 0 ||
    values.yearFrom !== undefined ||
    values.yearTo !== undefined ||
    values.minUserRating !== undefined ||
    (values.languages?.length ?? 0) > 0;

  const update = <Key extends keyof MovieFilterValues>(
    key: Key,
    value: MovieFilterValues[Key],
  ): void => {
    onChange({ ...values, [key]: value });
  };

  const setYearRange = (option: SingleValue<YearRangeOption>): void => {
    onChange({
      ...values,
      yearFrom: option?.yearFrom,
      yearTo: option?.yearTo,
    });
  };

  const toggleGenre = (genre: string): void => {
    const selectedGenres = values.genres ?? [];
    update(
      'genres',
      selectedGenres.includes(genre)
        ? selectedGenres.filter((selectedGenre) => selectedGenre !== genre)
        : [...selectedGenres, genre],
    );
  };

  return (
    <>
      <fieldset className="movie-filter-genres">
        <legend>Gêneros</legend>
        <div className="chips" aria-busy={genresQuery.isLoading}>
          <button
            type="button"
            className={(values.genres?.length ?? 0) === 0 ? 'selected' : undefined}
            aria-pressed={(values.genres?.length ?? 0) === 0}
            onClick={() => update('genres', [])}
          >
            Todos
          </button>
          {(genresQuery.data ?? []).map((genre) => {
            const isSelected = values.genres?.includes(genre) ?? false;

            return (
              <button
                type="button"
                className={isSelected ? 'selected' : undefined}
                aria-pressed={isSelected}
                onClick={() => toggleGenre(genre)}
                key={genre}
              >
                {translateGenreLabel(genre)}
              </button>
            );
          })}
          {genresQuery.isLoading && <span className="genre-loading">Carregando gêneros…</span>}
        </div>
      </fieldset>

      <label className="movie-filter-field movie-filter-field-period" htmlFor="movie-period">
        <span>Período</span>
        <Select<YearRangeOption>
          inputId="movie-period"
          className="movie-filter-select movie-filter-select-period"
          classNamePrefix="cinerocket"
          options={YEAR_RANGE_OPTIONS}
          value={getYearRangeValue(values)}
          onChange={setYearRange}
          isSearchable={false}
        />
      </label>

      <label className="movie-filter-field movie-filter-field-rating" htmlFor="movie-rating">
        <span>Avaliação</span>
        <Select<FilterOption>
          inputId="movie-rating"
          className="movie-filter-select movie-filter-select-rating"
          classNamePrefix="cinerocket"
          options={RATING_OPTIONS}
          value={RATING_OPTIONS.find(
            (option) => option.value === (values.minUserRating?.toString() ?? ''),
          )}
          onChange={(option: SingleValue<FilterOption>) =>
            update('minUserRating', option?.value ? Number(option.value) : undefined)
          }
          isSearchable={false}
        />
      </label>

      <label className="movie-filter-field movie-filter-field-language" htmlFor="movie-language">
        <span>Idioma</span>
        <Select<FilterOption, true>
          inputId="movie-language"
          className="movie-filter-select movie-filter-select-language"
          classNamePrefix="cinerocket"
          isLoading={languagesQuery.isLoading}
          isSearchable
          isMulti
          closeMenuOnSelect={false}
          options={languageOptions}
          value={languageOptions.filter((option) => values.languages?.includes(option.value))}
          onChange={(options: MultiValue<FilterOption>) =>
            update('languages', options.map((option) => option.value).filter(Boolean))
          }
          placeholder="Todos os idiomas"
          noOptionsMessage={() => 'Nenhum idioma encontrado'}
        />
      </label>

      <button
        type="button"
        className="clear-filters"
        onClick={onClear}
        disabled={!hasActiveFilters}
      >
        Limpar filtros
      </button>

      {(genresQuery.isError || languagesQuery.isError) && (
        <div className="movie-filter-error">
          <ErrorBanner
            message="Não foi possível carregar todas as opções de filtro."
            onRetry={() => {
              if (genresQuery.isError) void genresQuery.refetch();
              if (languagesQuery.isError) void languagesQuery.refetch();
            }}
          />
        </div>
      )}
    </>
  );
};
