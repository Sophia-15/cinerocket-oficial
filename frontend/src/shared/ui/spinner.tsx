import { Loader2 } from 'lucide-react';

export const Spinner = ({ size = 20 }: { size?: number }) => (
  <Loader2 className="spinner" size={size} aria-label="Carregando" role="status" />
);
