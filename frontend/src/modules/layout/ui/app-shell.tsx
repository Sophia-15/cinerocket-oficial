import { Link } from '@tanstack/react-router';
import { Home, Library, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { defaultCatalogSearch } from '@/entities/movie';
import brandIcon from '@/shared/assets/icon.svg';

type AppShellProps = {
  children: ReactNode;
  onOpenSearch: () => void;
};

export const AppShell = ({ children, onOpenSearch }: AppShellProps) => {
  return (
    <div className="app">
      <aside>
        <Link to="/" className="brand">
          <span className="brand-mark">
            <img src={brandIcon} alt="" />
          </span>{' '}
          cine<span>rocket</span>
        </Link>
        <nav>
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: 'active' }}>
            <Home size={18} />
            Início
          </Link>
          <Link to="/catalogo" search={defaultCatalogSearch} activeProps={{ className: 'active' }}>
            <Library size={18} />
            Catálogo
          </Link>
        </nav>
        <div className="side-bottom">
          <div className="profile-dot">C</div>
          <div>
            <strong>Convidado</strong>
            <small>Seu perfil</small>
          </div>
        </div>
      </aside>
      <main>
        <header>
          <button type="button" className="search" onClick={onOpenSearch}>
            <Search size={18} />
            <span className="search-placeholder">
              Buscar filmes, atores, diretores, roteiristas...
            </span>
            <kbd>⌘ K</kbd>
          </button>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
};
