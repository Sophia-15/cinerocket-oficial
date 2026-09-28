import { useSuspenseQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, Edit3, Trash2 } from 'lucide-react';
import {
  defaultCatalogSearch,
  getLanguageLabel,
  MoviePerformanceDetails,
  movieDetailQueryOptions,
  Poster,
  translateGenreLabel,
  useDeleteMovieMutation,
} from '@/entities/movie';
import { ReviewMoviePanel } from '@/modules/review-movie';
import { useDocumentTitle } from '@/shared/lib/use-document-title';
import { ErrorBanner } from '@/shared/ui/error-banner';

const formatBrazilianDate = (value: string | null): string => {
  if (value === null) return '—';

  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (isoDate === null) return value;

  const [, year, month, day] = isoDate;
  return `${day}/${month}/${year}`;
};

export const MoviePage = () => {
  const { movieId } = useParams({ from: '/filme/$movieId' });
  const { data: movie } = useSuspenseQuery(movieDetailQueryOptions(movieId));
  const navigate = useNavigate();
  const deleteMovie = useDeleteMovieMutation();

  useDocumentTitle(`${movie.titulo} · CineRocket`);

  const confirmRemove = () => {
    if (!window.confirm('Remover este filme da sua coleção?')) return;
    deleteMovie.mutate(movie.id_filme, {
      onSuccess: () => navigate({ to: '/catalogo', search: defaultCatalogSearch }),
    });
  };

  return (
    <>
      <Link className="back" to="/catalogo" search={defaultCatalogSearch}>
        <ArrowLeft size={16} /> Voltar ao catálogo
      </Link>

      <div className="movie-layout">
        <div className="movie-main">
          <div className="detail">
            <Poster title={movie.titulo} posterUrl={movie.poster_url} large />
            <div className="detail-copy">
              <div className="eyebrow">{movie.genres.map(translateGenreLabel).join(' · ')}</div>
              <h1>{movie.titulo}</h1>
              <div className="detail-meta">
                <span>{movie.ano_lancamento ?? '—'}</span>
                {movie.directors.length > 0 && (
                  <span>
                    Direção: <b>{movie.directors.join(', ')}</b>
                  </span>
                )}
              </div>
              <p className="synopsis">{movie.sinopse}</p>
              <div className="detail-actions">
                <Link className="button ghost" to="/filme/$movieId/editar" params={{ movieId }}>
                  <Edit3 size={15} /> Editar
                </Link>
                <button
                  type="button"
                  className="icon-button"
                  onClick={confirmRemove}
                  disabled={deleteMovie.isPending}
                  aria-label={`Remover ${movie.titulo}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {deleteMovie.isError && <ErrorBanner message="Não foi possível remover o filme." />}
            </div>
          </div>

          <section className="credits movie-credits" aria-label="Ficha técnica e créditos">
            {movie.cast.length > 0 && (
              <div>
                <small>ELENCO</small>
                <p>{movie.cast.join(', ')}</p>
              </div>
            )}
            {movie.directors.length > 0 && (
              <div>
                <small>DIREÇÃO</small>
                <p>{movie.directors.join(', ')}</p>
              </div>
            )}
            {movie.writers.length > 0 && (
              <div>
                <small>ROTEIRO</small>
                <p>{movie.writers.join(', ')}</p>
              </div>
            )}
            {movie.companies.length > 0 && (
              <div>
                <small>PRODUÇÃO</small>
                <p>{movie.companies.join(', ')}</p>
              </div>
            )}
            <div>
              <small>ANO DE LANÇAMENTO</small>
              <p>{movie.ano_lancamento ?? '—'}</p>
            </div>
            <div>
              <small>DATA DE LANÇAMENTO</small>
              <p>{formatBrazilianDate(movie.data_lancamento)}</p>
            </div>
            <div>
              <small>DURAÇÃO</small>
              <p>{movie.duracao_minutos ? `${movie.duracao_minutos} min` : '—'}</p>
            </div>
            <div>
              <small>IDIOMA ORIGINAL</small>
              <p>{movie.idioma_original ? getLanguageLabel(movie.idioma_original) : '—'}</p>
            </div>
            <div>
              <small>STATUS</small>
              <p>{movie.status_filme ?? '—'}</p>
            </div>
          </section>

          <MoviePerformanceDetails performance={movie.performance} />
        </div>

        <ReviewMoviePanel
          movieId={movie.id_filme}
          reviews={movie.reviews}
          averageRating={movie.average_rating}
          reviewsCount={movie.reviews_count}
        />
      </div>
    </>
  );
};
