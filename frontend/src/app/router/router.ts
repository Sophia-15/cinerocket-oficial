import { createRouter } from '@tanstack/react-router';
import { queryClient } from '../providers/query-client';
import { routeTree } from './routes';

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
