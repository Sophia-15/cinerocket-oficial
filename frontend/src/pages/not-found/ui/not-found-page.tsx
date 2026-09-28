import { Link } from '@tanstack/react-router';
import { Compass } from 'lucide-react';
import { useDocumentTitle } from '@/shared/lib/use-document-title';
import { EmptyState } from '@/shared/ui/empty-state';

export const NotFoundPage = () => {
  useDocumentTitle('Página não encontrada · CineRocket');
  return (
    <>
      <EmptyState
        icon={<Compass size={34} />}
        title="Página não encontrada"
        message="O endereço que você tentou acessar não existe."
      />
      <Link className="button primary" to="/">
        Voltar ao início
      </Link>
    </>
  );
};
