import { Link } from '@tanstack/react-router';
import { AlertTriangle } from 'lucide-react';
import { defaultCatalogSearch } from '@/entities/movie';
import { useDocumentTitle } from '@/shared/lib/use-document-title';
import { EmptyState } from '@/shared/ui/empty-state';

export const ErrorPage = () => {
  useDocumentTitle('Erro inesperado · CineRocket');

  return (
    <EmptyState
      icon={<AlertTriangle size={34} />}
      title="Não foi possível carregar esta página"
      message="Tente novamente em instantes ou volte ao catálogo."
      action={
        <Link className="button primary" to="/catalogo" search={defaultCatalogSearch}>
          Ir para o catálogo
        </Link>
      }
    />
  );
};
