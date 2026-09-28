import { ChevronLeft, ChevronRight } from 'lucide-react';

type PageItem =
  | { type: 'page'; value: number }
  | { type: 'ellipsis'; position: 'leading' | 'trailing' };

const getPageItems = (page: number, totalPages: number): PageItem[] => {
  if (totalPages <= 1) return [{ type: 'page', value: 1 }];

  const items: PageItem[] = [{ type: 'page', value: 1 }];
  const rangeStart = Math.max(2, page - 1);
  const rangeEnd = Math.min(totalPages - 1, page + 1);

  if (rangeStart > 2) items.push({ type: 'ellipsis', position: 'leading' });
  for (let pageNumber = rangeStart; pageNumber <= rangeEnd; pageNumber++) {
    items.push({ type: 'page', value: pageNumber });
  }
  if (rangeEnd < totalPages - 1) items.push({ type: 'ellipsis', position: 'trailing' });
  items.push({ type: 'page', value: totalPages });

  return items;
};

export const Pagination = ({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Paginação">
      <button
        type="button"
        className="pagination-arrow"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Página anterior"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="pagination-pages">
        {getPageItems(page, totalPages).map((item) =>
          item.type === 'ellipsis' ? (
            <span className="pagination-ellipsis" key={`ellipsis-${item.position}`}>
              …
            </span>
          ) : (
            <button
              type="button"
              key={item.value}
              className={item.value === page ? 'selected' : ''}
              onClick={() => onPageChange(item.value)}
              aria-current={item.value === page ? 'page' : undefined}
            >
              {item.value}
            </button>
          ),
        )}
      </div>

      <button
        type="button"
        className="pagination-arrow"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Próxima página"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
};
