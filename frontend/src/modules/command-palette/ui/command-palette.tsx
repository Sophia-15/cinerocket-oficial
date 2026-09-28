import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { moviesListQueryOptions } from '@/entities/movie';
import { ErrorBanner } from '@/shared/ui/error-banner';

const RESULT_LIMIT = 6;
const MIN_QUERY_LENGTH = 2;

export const CommandPalette = ({ onClose }: { onClose: () => void }) => {
  const [inputValue, setInputValue] = useState('');
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setQuery(inputValue), 250);
    return () => clearTimeout(timeout);
  }, [inputValue]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const trimmed = query.trim();
  const searchTerm = inputValue.trim();
  const ready = searchTerm.length >= MIN_QUERY_LENGTH && searchTerm === trimmed;
  const moviesQuery = useQuery({
    ...moviesListQueryOptions({ q: trimmed, limit: RESULT_LIMIT, offset: 0 }),
    enabled: ready,
  });

  const items = ready ? (moviesQuery.data?.items ?? []) : [];
  const total = ready ? (moviesQuery.data?.total ?? 0) : 0;

  const goToMovie = (movieId: string) => {
    onClose();
    navigate({ to: '/filme/$movieId', params: { movieId } });
  };

  const viewAllResults = () => {
    if (!searchTerm) return;
    onClose();
    navigate({ to: '/busca', search: { q: searchTerm, page: 1 } });
  };

  return (
    <div className="palette-backdrop">
      <button
        type="button"
        className="palette-backdrop-close"
        aria-label="Fechar busca"
        onClick={onClose}
      />
      <div className="palette" role="dialog" aria-modal="true" aria-label="Busca">
        <div className="palette-input">
          <Search size={18} />
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(event) => {
              setInputValue(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') viewAllResults();
            }}
            placeholder="Buscar filmes, atores, diretores, roteiristas..."
          />
          <kbd>ESC</kbd>
        </div>
        <div className="palette-results">
          {searchTerm.length < MIN_QUERY_LENGTH && (
            <p className="palette-hint">Digite ao menos {MIN_QUERY_LENGTH} caracteres.</p>
          )}
          {searchTerm.length >= MIN_QUERY_LENGTH && (!ready || moviesQuery.isLoading) && (
            <p className="palette-hint">Buscando...</p>
          )}
          {ready && moviesQuery.isError && (
            <ErrorBanner
              message="Não foi possível buscar filmes."
              onRetry={() => {
                void moviesQuery.refetch();
              }}
            />
          )}
          {ready && moviesQuery.data && items.length === 0 && (
            <p className="palette-hint">Nada encontrado para “{trimmed}”.</p>
          )}
          {items.map((movie) => (
            <button
              type="button"
              key={movie.id_filme}
              className="palette-result"
              onClick={() => goToMovie(movie.id_filme)}
            >
              <span className="palette-result-title">{movie.titulo}</span>
              <span className="palette-result-year">{movie.ano_lancamento ?? '—'}</span>
            </button>
          ))}
          {ready && total > items.length && (
            <button type="button" className="palette-view-all" onClick={viewAllResults}>
              Ver todos os {total} resultados para “{trimmed}”
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
