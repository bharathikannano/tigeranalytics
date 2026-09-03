// ─────────────────────────────────────────────────────────────────────────────
// pages/SearchPage.tsx  —  Filter, search, and inline-edit pricing records
//
// Data flow:
//   1. On mount → auto-search with DEFAULT_FILTERS to show latest records
//   2. User changes filters → updates `filters` state (controlled inputs)
//   3. User clicks Search  → copies filters into `activeFilters`
//                         → useQuery re-runs (queryKey changed)
//   4. User edits a row   → optimistic cache update via setQueryData
//                         → no full re-fetch needed
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import FilterBar    from '../components/FilterBar';
import PricingTable from '../components/PricingTable';
import Pagination   from '../components/Pagination';
import { searchPricing } from '../api/pricing';
import type { PricingRecord, SearchFilters } from '../types/pricing';

const DEFAULT_FILTERS: SearchFilters = {
  storeId: '', sku: '', productName: '',
  dateFrom: '', dateTo: '', minPrice: '', maxPrice: '',
  page: 1, pageSize: 50, sortBy: 'created_at', sortDir: 'desc',
};

export default function SearchPage() {
  const queryClient = useQueryClient();

  // `filters`       — what the user is currently typing in the filter bar
  // `activeFilters` — the filters actually sent to the server (updated on Search click)
  // Separating them prevents a request per keystroke.
  const [filters,       setFilters]       = useState<SearchFilters>(DEFAULT_FILTERS);
  const [activeFilters, setActiveFilters] = useState<SearchFilters>(DEFAULT_FILTERS);

  // Re-fetches whenever activeFilters changes (page, sort, or Search click)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['pricing', activeFilters],
    queryFn:  () => searchPricing(activeFilters),
  });

  const records    = data?.data                ?? [];
  const total      = data?.pagination.total    ?? 0;
  const totalPages = data?.pagination.totalPages ?? 0;

  // Apply the current filter inputs and jump to page 1
  function handleSearch() { setActiveFilters({ ...filters, page: 1 }); }

  // Clear everything back to defaults
  function handleReset() { setFilters(DEFAULT_FILTERS); setActiveFilters(DEFAULT_FILTERS); }

  // Page navigation — updates both states so the filter bar stays in sync
  function handlePageChange(page: number) {
    const next = { ...activeFilters, page };
    setFilters(next);
    setActiveFilters(next);
  }

  // Optimistic cache update: patch the in-memory cache immediately after an
  // inline edit so the row updates without waiting for a full re-fetch.
  function handleRecordUpdated(updated: PricingRecord) {
    queryClient.setQueryData<typeof data>(['pricing', activeFilters], (old) => {
      if (!old) return old;
      return { ...old, data: old.data.map((r) => r.id === updated.id ? updated : r) };
    });
  }

  return (
    <div className="space-y-6">

      {/* Page heading + total count */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Search &amp; Edit Pricing</h1>
          <p className="text-sm text-gray-500 mt-1">Filter records and click <strong>✏ Edit</strong> on any row to update inline.</p>
        </div>
        {total > 0 && (
          <div className="text-right">
            <p className="text-2xl font-bold text-brand-600">{total.toLocaleString()}</p>
            <p className="text-xs text-gray-500">records found</p>
          </div>
        )}
      </div>

      {/* Filter inputs */}
      <FilterBar filters={filters} onChange={setFilters} onSearch={handleSearch} onReset={handleReset} loading={isLoading} />

      {/* API error */}
      {isError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          ⚠ {error instanceof Error ? error.message : 'Search failed'}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="card overflow-hidden animate-pulse">
          <div className="h-12 bg-gray-100 border-b border-gray-200" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-11 flex items-center px-3 gap-4 border-b border-gray-100">
              {[20, 16, 40, 14, 20].map((w, j) => (
                <div key={j} className={`h-3 bg-gray-200 rounded w-${w}`} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Results table + pagination */}
      {!isLoading && (
        <>
          <PricingTable records={records} onRecordUpdated={handleRecordUpdated} />
          {total > 0 && (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                Showing {(activeFilters.page - 1) * activeFilters.pageSize + 1}–
                {Math.min(activeFilters.page * activeFilters.pageSize, total)} of {total.toLocaleString()} records
              </span>
              <Pagination currentPage={activeFilters.page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          )}
        </>
      )}

    </div>
  );
}
