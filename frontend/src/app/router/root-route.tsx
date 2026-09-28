import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { Suspense, useEffect, useState } from 'react';
import { CommandPalette } from '@/modules/command-palette';
import { AppShell } from '@/modules/layout';
import { ErrorPage } from '@/pages/error';
import { NotFoundPage } from '@/pages/not-found';

export type RouterContext = {
  queryClient: QueryClient;
};

const RootLayout = () => {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <AppShell onOpenSearch={() => setPaletteOpen(true)}>
        <Suspense fallback={<div className="page-loading">Carregando…</div>}>
          <Outlet />
        </Suspense>
      </AppShell>
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </>
  );
};

export const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
});
