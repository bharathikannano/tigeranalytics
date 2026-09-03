// ─────────────────────────────────────────────────────────────────────────────
// types/pricing.ts
// Centralised TypeScript types shared across the whole frontend.
// All API response shapes and UI state types live here so every file agrees
// on the same data structure.
// ─────────────────────────────────────────────────────────────────────────────

/** One pricing row stored in the database */
export interface PricingRecord {
  id:           string;
  store_id:     string;
  sku:          string;
  product_name: string;
  price:        number;
  record_date:  string;      // "YYYY-MM-DD"
  upload_id:    string | null;
  created_at:   string;      // ISO timestamp
  updated_at:   string;      // ISO timestamp
}

/** One row in the upload history log */
export interface UploadLog {
  id:          string;
  file_name:   string;
  row_count:   number;
  error_count: number;
  status:      'success' | 'partial' | 'failed';
  created_at:  string;
}

/** Pagination metadata attached to every list response */
export interface Pagination {
  total:      number;
  page:       number;
  pageSize:   number;
  totalPages: number;
}

// API response wrappers
export interface PricingListResponse   { data: PricingRecord[]; pagination: Pagination; }
export interface UploadLogsResponse    { data: UploadLog[];     pagination: Pagination; }
export interface UploadSuccessResponse { message: string; uploadId: string; rowsInserted: number; fileName: string; }
export interface ValidationErrorResponse { error: string; message: string; errors?: string[]; }

/** Filter + sort + pagination options sent to the search API */
export interface SearchFilters {
  storeId?:     string;
  sku?:         string;
  productName?: string;
  dateFrom?:    string;
  dateTo?:      string;
  minPrice?:    string;
  maxPrice?:    string;
  page:         number;
  pageSize:     number;
  sortBy:       string;
  sortDir:      'asc' | 'desc';
}
