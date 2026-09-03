import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import FilterBar from '../components/FilterBar';
import PricingTable from '../components/PricingTable';
import Pagination from '../components/Pagination';
import { searchPricing } from '../api/pricing';
import type { PricingRecord, SearchFilters } from '../types/pricing';

const DEFAULT_FILTERS: SearchFilters = {
  storeId:     '',
  sku:         '',
  productName: '',
  dateFrom:    '',
  dateTo:      '',
  minPrice:    '',
  maxPrice:    '',
  page:        1,
  pageSize:    50,
  sortBy:      'created_at',
  sortDir:     'desc',
};

export default function SearchPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters]     = useState<SearchFilters>(DEFAULT_FILTERS);
  const [activeFilters, setActiveFilters] = useState<SearchFilters>(DEFAULT_FILTERS);

  // ── Search query — re-runs when activeFilters changes ────────────────────
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['pricing', activeFilters],
    queryFn:  () => searchPricing(activeFilters),
  });

  const records    = data?.data ?? [];
  const total      = data?.pagination.total ?? 0;
  const totalPages = data?.pagination.totalPages ?? 0;

  function handleSearch() {
    setActiveFilters({ ...filters, page: 1 });
  }

  function handleReset() {
    setFilters(DEFAULT_FILTERS);
    setActiveFilters(DEFAULT_FILTERS);
  }

  function handlePageChange(page: number) {
    const next = { ...activeFilters, page };
    setFilters(next);
    setActiveFilters(next);
  }

  function handleRecordUpdated(updated: PricingRecord) {
    // Optimistic update — patch the cached data immediately without a re-fetch
    queryClient.setQueryData<typeof data>(['pricing', activeFilters], (old) => {
      if (!old) return old;
      return {
        ...old,
        data: old.data.map((r) => (r.id === updated.id ? updated : r)),
      };
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Search &amp; Edit Pricing</h1>
          <p className="text-sm text-gray-500 mt-1">
            Filter records and click <strong>✏ Edit</strong> on any row to update it inline.
          </p>
        </div>
        {total > 0 && (
          <div className="text-right">
            <p className="text-2xl font-bold text-brand-600">{total.toLocaleString()}</p>
            <p className="text-xs text-gray-500">records found</p>
          </div>
        )}
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────── */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onSearch={handleSearch}
        onReset={handleReset}
        loading={isLoading}
      />

      {/* ── Error ───────────────────────────────────────────────────── */}
      {isError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          ⚠ {error instanceof Error ? error.message : 'Search failed'}
        </div>
      )}

      {/* ── Loading skeleton ─────────────────────────────────────────── */}
      {isLoading && (
        <div className="card overflow-hidden animate-pulse">
          <div className="h-12 bg-gray-100 border-b border-gray-200" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-11 bg-white border-b border-gray-100 flex items-center px-3 gap-4">
              <div className="h-3 bg-gray-200 rounded w-20" />
              <div className="h-3 bg-gray-200 rounded w-16" />
              <div className="h-3 bg-gray-200 rounded w-40" />
              <div className="h-3 bg-gray-200 rounded w-14" />
              <div className="h-3 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────────────── */}
      {!isLoading && (
        <>
          <PricingTable records={records} onRecordUpdated={handleRecordUpdated} />

          {/* Pagination + summary */}
          {total > 0 && (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                Showing {((activeFilters.page - 1) * activeFilters.pageSize) + 1}–{Math.min(activeFilters.page * activeFilters.pageSize, total)} of {total.toLocaleString()} records
              </span>
              <Pagination
                currentPage={activeFilters.page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
