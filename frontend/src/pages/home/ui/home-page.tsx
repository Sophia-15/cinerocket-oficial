import { Link } from '@tanstack/react-router';
import { ChevronRight, Film } from 'lucide-react';
import {
  defaultCatalogSearch,
  MovieCard,
  translateGenreLabel,
  useGenresQuery,
  useMoviesQuery,
} from '@/entities/movie';
import { useDocumentTitle } from '@/shared/lib/use-document-title';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorBanner } from '@/shared/ui/error-banner';
import { Section } from '@/shared/ui/section';
import { Spinner } from '@/shared/ui/spinner';

const GENRE_ICONS = ['✦', '◉', '✺', '♡', '➤'];

export const HomePage = () => {
  useDocumentTitle('CineRocket — seu próximo filme favorito');
  const recentQuery = useMoviesQuery({ sortBy: 'recent', limit: 8 });
  const topRatedQuery = useMoviesQuery({ sortBy: 'user_rating', limit: 8 });
  const genresQuery = useGenresQuery();
  const genreTiles = genresQuery.data?.slice(0, 5) ?? [];

  return (
    <>
      <div className="hero">
        <div>
          <div className="eyebrow">
            <span className="pulse" /> SUA SESSÃO DE HOJE
          </div>
          <h1>
            Encontre seu
            <br />
            <em>próximo filme favorito.</em>
          </h1>
          <p>Explore histórias que ficam com você muito depois dos créditos.</p>
          <Link to="/catalogo" search={defaultCatalogSearch} className="button primary">
            Explorar catálogo <ChevronRight size={17} />
          </Link>
        </div>
        <div className="hero-art">
          <div className="orbit o1" />
          <div className="orbit o2" />
          <span>✦</span>
        </div>
      </div>

      <Section
        title="Adicionados recentemente"
        subtitle="O que acabou de chegar à sua coleção"
        action={
          <Link to="/catalogo" search={defaultCatalogSearch}>
            Ver tudo <ChevronRight size={16} />
          </Link>
        }
      >
        {recentQuery.isLoading && <Spinner />}
        {recentQuery.isError && (
          <ErrorBanner
            message="Não foi possível carregar os filmes recentes."
            onRetry={recentQuery.refetch}
          />
        )}
        {recentQuery.data &&
          (recentQuery.data.items.length > 0 ? (
            <div className="cards-row">
              {recentQuery.data.items.map((movie) => (
                <MovieCard key={movie.id_filme} movie={movie} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Film size={34} />}
              title="Nenhum filme cadastrado"
              message="Adicione um filme para começar seu catálogo."
            />
          ))}
      </Section>

      <Section title="Mais bem avaliados" subtitle="A comunidade deu o play e amou">
        {topRatedQuery.isLoading && <Spinner />}
        {topRatedQuery.isError && (
          <ErrorBanner
            message="Não foi possível carregar os filmes mais bem avaliados."
            onRetry={topRatedQuery.refetch}
          />
        )}
        {topRatedQuery.data &&
          (topRatedQuery.data.items.length > 0 ? (
            <div className="cards-row">
              {topRatedQuery.data.items.map((movie) => (
                <MovieCard key={movie.id_filme} movie={movie} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Film size={34} />}
              title="Ainda não há filmes para avaliar"
              message="Os filmes do catálogo aparecerão aqui."
            />
          ))}
      </Section>

      <Section title="Explorar por gênero" subtitle="Escolha um clima para hoje">
        {genresQuery.isLoading && <Spinner />}
        {genresQuery.isError && (
          <ErrorBanner
            message="Não foi possível carregar os gêneros."
            onRetry={genresQuery.refetch}
          />
        )}
        {genresQuery.data &&
          (genreTiles.length > 0 ? (
            <div className="genre-row">
              {genreTiles.map((genre, index) => (
                <Link
                  to="/catalogo"
                  search={{ ...defaultCatalogSearch, genero: genre }}
                  className={`genre genre-${index}`}
                  key={genre}
                >
                  <span>{GENRE_ICONS[index]}</span>
                  <strong>{translateGenreLabel(genre)}</strong>
                  <small>Explorar</small>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Film size={34} />}
              title="Nenhum gênero disponível"
              message="Os gêneros aparecerão quando houver filmes no catálogo."
            />
          ))}
      </Section>
    </>
  );
};
