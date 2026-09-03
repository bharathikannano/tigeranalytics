// ─────────────────────────────────────────────────────────────────────────────
// components/FilterBar.tsx
// Row of search filter inputs + Search / Reset buttons.
//
// Props:
//   filters   — current filter values (controlled from parent)
//   onChange  — called with updated filters whenever a field changes
//   onSearch  — called when the user clicks Search
//   onReset   — called when the user clicks Reset
//   loading   — disables buttons while a search is in flight
// ─────────────────────────────────────────────────────────────────────────────

import type { SearchFilters } from '../types/pricing';

interface Props {
  filters:  SearchFilters;
  onChange: (filters: SearchFilters) => void;
  onSearch: () => void;
  onReset:  () => void;
  loading?: boolean;
}

export default function FilterBar({ filters, onChange, onSearch, onReset, loading }: Props) {
  // Helper: update a single field and reset pagination to page 1
  const set = (key: keyof SearchFilters, value: string) =>
    onChange({ ...filters, [key]: value, page: 1 });

  return (
    <div className="card p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Search Filters</h2>

      {/* Filter grid — responsive: 1 → 2 → 3 → 4 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

        <div><label className="label">Store ID</label>
          <input className="input" placeholder="e.g. STORE-042" value={filters.storeId ?? ''}
            onChange={(e) => set('storeId', e.target.value)} /></div>

        <div><label className="label">SKU</label>
          <input className="input" placeholder="e.g. ABC-1234" value={filters.sku ?? ''}
            onChange={(e) => set('sku', e.target.value)} /></div>

        <div><label className="label">Product Name</label>
          <input className="input" placeholder="Partial match" value={filters.productName ?? ''}
            onChange={(e) => set('productName', e.target.value)} /></div>

        <div><label className="label">Date From</label>
          <input type="date" className="input" value={filters.dateFrom ?? ''}
            onChange={(e) => set('dateFrom', e.target.value)} /></div>

        <div><label className="label">Date To</label>
          <input type="date" className="input" value={filters.dateTo ?? ''}
            onChange={(e) => set('dateTo', e.target.value)} /></div>

        <div><label className="label">Min Price</label>
          <input type="number" min="0" step="0.01" className="input" placeholder="0.00"
            value={filters.minPrice ?? ''} onChange={(e) => set('minPrice', e.target.value)} /></div>

        <div><label className="label">Max Price</label>
          <input type="number" min="0" step="0.01" className="input" placeholder="999.99"
            value={filters.maxPrice ?? ''} onChange={(e) => set('maxPrice', e.target.value)} /></div>

        {/* Sort field + direction in one cell */}
        <div><label className="label">Sort By</label>
          <div className="flex gap-2">
            <select className="input flex-1" value={filters.sortBy}
              onChange={(e) => set('sortBy', e.target.value)}>
              <option value="created_at">Upload Date</option>
              <option value="record_date">Record Date</option>
              <option value="store_id">Store ID</option>
              <option value="sku">SKU</option>
              <option value="price">Price</option>
              <option value="product_name">Product Name</option>
            </select>
            <select className="input w-24" value={filters.sortDir}
              onChange={(e) => set('sortDir', e.target.value as 'asc' | 'desc')}>
              <option value="desc">↓ Desc</option>
              <option value="asc">↑ Asc</option>
            </select>
          </div>
        </div>

      </div>

      {/* Action row */}
      <div className="flex items-center gap-3 pt-1">
        <button className="btn-primary"   onClick={onSearch} disabled={loading}>{loading ? 'Searching…' : '🔍 Search'}</button>
        <button className="btn-secondary" onClick={onReset}  disabled={loading}>✕ Reset</button>
        {/* Rows-per-page selector — right-aligned */}
        <div className="ml-auto flex items-center gap-2">
          <label className="label !mb-0">Rows per page</label>
          <select className="input w-20" value={filters.pageSize}
            onChange={(e) => onChange({ ...filters, pageSize: parseInt(e.target.value, 10), page: 1 })}>
            {[20, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
