import { Link } from '@tanstack/react-router';
import type { MovieSummary } from '../model/movie.schema';
import { Poster } from './poster';

export const MovieCard = ({ movie }: { movie: MovieSummary }) => (
  <Link className="movie-card" to="/filme/$movieId" params={{ movieId: movie.id_filme }}>
    <Poster title={movie.titulo} posterUrl={movie.poster_url} />
    <div className="card-title">{movie.titulo}</div>
    <div className="card-meta">
      {movie.ano_lancamento ?? '—'} <span>·</span>
      <b>{movie.average_rating.toFixed(1)}/10</b>
    </div>
  </Link>
);
