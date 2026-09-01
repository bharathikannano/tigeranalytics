import { useCallback, useEffect, useState } from 'react';
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
  const [filters, setFilters]       = useState<SearchFilters>(DEFAULT_FILTERS);
  const [records, setRecords]       = useState<PricingRecord[]>([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading]       = useState(false);
  const [searched, setSearched]     = useState(false);
  const [error, setError]           = useState('');

  const doSearch = useCallback(async (f: SearchFilters) => {
    setLoading(true);
    setError('');
    try {
      const res = await searchPricing(f);
      setRecords(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-search on mount to show latest records
  useEffect(() => { doSearch(DEFAULT_FILTERS); }, [doSearch]);

  function handleSearch() { doSearch(filters); }

  function handleReset() {
    setFilters(DEFAULT_FILTERS);
    doSearch(DEFAULT_FILTERS);
  }

  function handlePageChange(page: number) {
    const next = { ...filters, page };
    setFilters(next);
    doSearch(next);
  }

  function handleRecordUpdated(updated: PricingRecord) {
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
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
        {searched && (
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
        loading={loading}
      />

      {/* ── Error ───────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          ⚠ {error}
        </div>
      )}

      {/* ── Loading skeleton ─────────────────────────────────────────── */}
      {loading && (
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
      {!loading && (
        <>
          <PricingTable records={records} onRecordUpdated={handleRecordUpdated} />

          {/* Pagination + summary */}
          {total > 0 && (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                Showing {((filters.page - 1) * filters.pageSize) + 1}–{Math.min(filters.page * filters.pageSize, total)} of {total.toLocaleString()} records
              </span>
              <Pagination
                currentPage={filters.page}
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
