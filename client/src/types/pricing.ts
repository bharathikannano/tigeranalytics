// Shared TypeScript interfaces

export interface PricingRecord {
  id: string;
  store_id: string;
  sku: string;
  product_name: string;
  price: number;
  record_date: string;
  upload_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadLog {
  id: string;
  file_name: string;
  row_count: number;
  error_count: number;
  status: 'success' | 'partial' | 'failed';
  created_at: string;
}

export interface Pagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PricingListResponse {
  data: PricingRecord[];
  pagination: Pagination;
}

export interface UploadLogsResponse {
  data: UploadLog[];
  pagination: Pagination;
}

export interface UploadSuccessResponse {
  message: string;
  uploadId: string;
  rowsInserted: number;
  fileName: string;
}

export interface ValidationErrorResponse {
  error: string;
  message: string;
  errors?: string[];
}

export interface SearchFilters {
  storeId?: string;
  sku?: string;
  productName?: string;
  dateFrom?: string;
  dateTo?: string;
  minPrice?: string;
  maxPrice?: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortDir: 'asc' | 'desc';
}
