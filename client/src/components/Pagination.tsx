interface Props {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  const pages: (number | '…')[] = [];
  const delta = 2;
  const left = Math.max(1, currentPage - delta);
  const right = Math.min(totalPages, currentPage + delta);

  if (left > 1) { pages.push(1); if (left > 2) pages.push('…'); }
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < totalPages) { if (right < totalPages - 1) pages.push('…'); pages.push(totalPages); }

  return (
    <nav className="flex items-center justify-center gap-1 mt-4 select-none">
      <button
        className="btn-secondary px-3 py-1.5 text-xs"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        ← Prev
      </button>

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-gray-400">…</span>
        ) : (
          <button
            key={p}
            className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
              p === currentPage
                ? 'bg-brand-600 text-white shadow'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => onPageChange(p as number)}
          >
            {p}
          </button>
        )
      )}

      <button
        className="btn-secondary px-3 py-1.5 text-xs"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next →
      </button>
    </nav>
  );
}
