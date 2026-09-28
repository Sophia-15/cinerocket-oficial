import { useForm } from '@tanstack/react-form';
import { ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import type { MultiValue } from 'react-select';
import AsyncCreatableSelect from 'react-select/async-creatable';
import CreatableSelect from 'react-select/creatable';
import {
  type Movie,
  type MovieDraft,
  type MovieFormValues,
  movieDraftSchema,
  type PersonType,
  searchCompanies,
  searchPeople,
  translateGenreLabel,
  useGenresQuery,
} from '@/entities/movie';
import { debounce } from '@/shared/lib/debounce';
import { ErrorBanner } from '@/shared/ui/error-banner';
import { Spinner } from '@/shared/ui/spinner';

type Option = { value: string; label: string };
const toOptions = (values: string[]): Option[] => values.map((value) => ({ value, label: value }));
const toGenreOptions = (values: string[]): Option[] =>
  values.map((value) => ({ value, label: translateGenreLabel(value) }));
const fromOptions = (options: MultiValue<Option>): string[] =>
  options.map((option) => option.value);

const makePeopleLoader = (tipoPessoa: PersonType) =>
  debounce((input: string, callback: (options: Option[]) => void) => {
    if (!input.trim()) {
      callback([]);
      return;
    }
    searchPeople(tipoPessoa, input)
      .then((names) => callback(toOptions(names)))
      .catch(() => callback([]));
  }, 300);

const loadCompanyOptions = debounce((input: string, callback: (options: Option[]) => void) => {
  if (!input.trim()) {
    callback([]);
    return;
  }
  searchCompanies(input)
    .then((names) => callback(toOptions(names)))
    .catch(() => callback([]));
}, 300);

const emptyValues: MovieFormValues = {
  titulo: '',
  ano_lancamento: '',
  sinopse: '',
  genres: [],
  companies: [],
  directors: [],
  writers: [],
  cast: [],
  poster_url: '',
};

const toFormValues = (movie?: Movie): MovieFormValues =>
  movie
    ? {
        titulo: movie.titulo,
        ano_lancamento: movie.ano_lancamento ?? '',
        sinopse: movie.sinopse ?? '',
        genres: movie.genres,
        companies: movie.companies,
        directors: movie.directors,
        writers: movie.writers,
        cast: movie.cast,
        poster_url: movie.poster_url ?? '',
      }
    : emptyValues;

type MovieEditorProps = {
  movie?: Movie;
  onSubmit: (draft: MovieDraft) => Promise<unknown>;
  submitLabel: string;
  isPending: boolean;
  submitError?: string | null;
};

export const MovieEditor = ({
  movie,
  onSubmit,
  submitLabel,
  isPending,
  submitError,
}: MovieEditorProps) => {
  const genresQuery = useGenresQuery();
  const genreOptions = toGenreOptions(genresQuery.data ?? []);

  const loadDirectorOptions = useMemo(() => makePeopleLoader('Diretor'), []);
  const loadWriterOptions = useMemo(() => makePeopleLoader('Roteirista'), []);
  const loadCastOptions = useMemo(() => makePeopleLoader('Ator'), []);

  const form = useForm({
    defaultValues: toFormValues(movie),
    onSubmit: async ({ value }) => {
      await onSubmit(movieDraftSchema.parse(value));
    },
  });

  return (
    <form
      className="movie-form"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        form.handleSubmit();
      }}
      noValidate
    >
      <div className="form-grid">
        <form.Field name="titulo" validators={{ onChange: movieDraftSchema.shape.titulo }}>
          {(field) => (
            <label>
              Título
              <input
                aria-invalid={field.state.meta.errors.length > 0}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Ex. O Poderoso Chefão"
              />
              {field.state.meta.errors.length > 0 && (
                <small className="form-error">{field.state.meta.errors[0]?.message}</small>
              )}
            </label>
          )}
        </form.Field>

        <form.Field
          name="ano_lancamento"
          validators={{ onChange: movieDraftSchema.shape.ano_lancamento }}
        >
          {(field) => (
            <label>
              Ano
              <input
                aria-invalid={field.state.meta.errors.length > 0}
                type="number"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="2024"
              />
              {field.state.meta.errors.length > 0 && (
                <small className="form-error">{field.state.meta.errors[0]?.message}</small>
              )}
            </label>
          )}
        </form.Field>

        <form.Field name="genres" validators={{ onChange: movieDraftSchema.shape.genres }}>
          {(field) => (
            <label htmlFor="movie-genres">
              Gêneros
              <CreatableSelect
                inputId="movie-genres"
                className="tags-select"
                classNamePrefix="cinerocket"
                isMulti
                options={genreOptions}
                value={toGenreOptions(field.state.value)}
                onChange={(options) => field.handleChange(fromOptions(options))}
                onBlur={field.handleBlur}
                placeholder="Drama, Romance..."
                formatCreateLabel={(input) => `Usar "${input}"`}
              />
              {field.state.meta.errors.length > 0 && (
                <small className="form-error">{field.state.meta.errors[0]?.message}</small>
              )}
            </label>
          )}
        </form.Field>

        <form.Field name="companies" validators={{ onChange: movieDraftSchema.shape.companies }}>
          {(field) => (
            <label htmlFor="movie-companies">
              Produtoras
              <AsyncCreatableSelect
                inputId="movie-companies"
                className="tags-select"
                classNamePrefix="cinerocket"
                isMulti
                loadOptions={loadCompanyOptions}
                value={toOptions(field.state.value)}
                onChange={(options) => field.handleChange(fromOptions(options))}
                onBlur={field.handleBlur}
                placeholder="Nome da produtora..."
                formatCreateLabel={(input) => `Usar "${input}"`}
                loadingMessage={() => 'Buscando...'}
                noOptionsMessage={({ inputValue }) =>
                  inputValue ? 'Nenhuma produtora encontrada' : 'Digite para buscar'
                }
              />
              {field.state.meta.errors.length > 0 && (
                <small className="form-error">{field.state.meta.errors[0]?.message}</small>
              )}
            </label>
          )}
        </form.Field>

        <form.Field name="poster_url" validators={{ onChange: movieDraftSchema.shape.poster_url }}>
          {(field) => (
            <label className="full">
              URL do pôster
              <input
                aria-invalid={field.state.meta.errors.length > 0}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="https://..."
              />
              {field.state.meta.errors.length > 0 && (
                <small className="form-error">{field.state.meta.errors[0]?.message}</small>
              )}
            </label>
          )}
        </form.Field>

        <form.Field name="sinopse" validators={{ onChange: movieDraftSchema.shape.sinopse }}>
          {(field) => (
            <label className="full">
              Sinopse
              <textarea
                aria-invalid={field.state.meta.errors.length > 0}
                rows={5}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Sobre o que é este filme?"
              />
              {field.state.meta.errors.length > 0 && (
                <small className="form-error">{field.state.meta.errors[0]?.message}</small>
              )}
            </label>
          )}
        </form.Field>

        <form.Field name="directors" validators={{ onChange: movieDraftSchema.shape.directors }}>
          {(field) => (
            <label htmlFor="movie-directors">
              Direção
              <AsyncCreatableSelect
                inputId="movie-directors"
                className="tags-select"
                classNamePrefix="cinerocket"
                isMulti
                loadOptions={loadDirectorOptions}
                value={toOptions(field.state.value)}
                onChange={(options) => field.handleChange(fromOptions(options))}
                onBlur={field.handleBlur}
                placeholder="Nome do diretor ou diretora..."
                formatCreateLabel={(input) => `Usar "${input}"`}
                loadingMessage={() => 'Buscando...'}
                noOptionsMessage={({ inputValue }) =>
                  inputValue ? 'Nenhuma pessoa encontrada' : 'Digite para buscar'
                }
              />
              {field.state.meta.errors.length > 0 && (
                <small className="form-error">{field.state.meta.errors[0]?.message}</small>
              )}
            </label>
          )}
        </form.Field>

        <form.Field name="writers" validators={{ onChange: movieDraftSchema.shape.writers }}>
          {(field) => (
            <label htmlFor="movie-writers">
              Roteiro
              <AsyncCreatableSelect
                inputId="movie-writers"
                className="tags-select"
                classNamePrefix="cinerocket"
                isMulti
                loadOptions={loadWriterOptions}
                value={toOptions(field.state.value)}
                onChange={(options) => field.handleChange(fromOptions(options))}
                onBlur={field.handleBlur}
                placeholder="Nome do roteirista..."
                formatCreateLabel={(input) => `Usar "${input}"`}
                loadingMessage={() => 'Buscando...'}
                noOptionsMessage={({ inputValue }) =>
                  inputValue ? 'Nenhuma pessoa encontrada' : 'Digite para buscar'
                }
              />
              {field.state.meta.errors.length > 0 && (
                <small className="form-error">{field.state.meta.errors[0]?.message}</small>
              )}
            </label>
          )}
        </form.Field>

        <form.Field name="cast" validators={{ onChange: movieDraftSchema.shape.cast }}>
          {(field) => (
            <label htmlFor="movie-cast">
              Elenco
              <AsyncCreatableSelect
                inputId="movie-cast"
                className="tags-select"
                classNamePrefix="cinerocket"
                isMulti
                loadOptions={loadCastOptions}
                value={toOptions(field.state.value)}
                onChange={(options) => field.handleChange(fromOptions(options))}
                onBlur={field.handleBlur}
                placeholder="Atores principais..."
                formatCreateLabel={(input) => `Usar "${input}"`}
                loadingMessage={() => 'Buscando...'}
                noOptionsMessage={({ inputValue }) =>
                  inputValue ? 'Nenhuma pessoa encontrada' : 'Digite para buscar'
                }
              />
              {field.state.meta.errors.length > 0 && (
                <small className="form-error">{field.state.meta.errors[0]?.message}</small>
              )}
            </label>
          )}
        </form.Field>
      </div>

      {submitError && <ErrorBanner message={submitError} />}

      <div className="form-actions">
        <form.Subscribe selector={(state) => [state.canSubmit] as const}>
          {([canSubmit]) => (
            <button className="button primary" type="submit" disabled={!canSubmit || isPending}>
              {isPending ? <Spinner size={16} /> : <ChevronRight size={16} />}
              {submitLabel}
            </button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
};
