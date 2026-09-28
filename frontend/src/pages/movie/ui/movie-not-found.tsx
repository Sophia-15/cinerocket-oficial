import { Link } from '@tanstack/react-router';
import { Film } from 'lucide-react';
import { defaultCatalogSearch } from '@/entities/movie';
import { EmptyState } from '@/shared/ui/empty-state';

export const MovieNotFound = () => (
  <>
    <EmptyState
      icon={<Film size={34} />}
      title="Filme não encontrado"
      message="Esse filme não existe ou foi removido do catálogo."
    />
    <Link className="button primary" to="/catalogo" search={defaultCatalogSearch}>
      Voltar ao catálogo
    </Link>
  </>
);
