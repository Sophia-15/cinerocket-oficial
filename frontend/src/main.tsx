import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from '@tanstack/react-router';
import { createRoot } from 'react-dom/client';
import { queryClient } from '@/app/providers/query-client';
import { router } from '@/app/router/router';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento root não encontrado');

createRoot(root).render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
    {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
  </QueryClientProvider>,
);
