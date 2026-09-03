// ─────────────────────────────────────────────────────────────────────────────
// api/pricing.ts
// Centralized Axios API client for all backend communication.
//
// Benefits of Axios:
//   • Built-in request/response interceptors for clean error standardization
//   • Native upload progress tracking via onUploadProgress (no XHR boilerplate)
//   • Automatic JSON serialization and param encoding
//
// BASE URL:
//   • Local dev  → proxied by Vite to http://localhost:4000 (see vite.config.ts)
//   • Production → set VITE_API_URL env var in Amplify console
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios';
import type {
  PricingListResponse,
  UploadLogsResponse,
  UploadSuccessResponse,
  ValidationErrorResponse,
  SearchFilters,
  PricingRecord,
} from '../types/pricing';

const BASE = import.meta.env.VITE_API_URL || '/api/pricing';

// Shared Axios client instance
const api = axios.create({
  baseURL: BASE,
});

// Response interceptor: unwraps data directly and preserves structured validation errors
api.interceptors.response.use(
  (res) => res.data,
  (error) => {
    const data = error.response?.data as ValidationErrorResponse | undefined;
    const message = data?.message || error.message || 'Request failed';
    const err = Object.assign(new Error(message), {
      details: data || { error: 'NetworkError', message },
    });
    return Promise.reject(err);
  }
);

// ── Upload CSV ────────────────────────────────────────────────────────────────
// Uses Axios native onUploadProgress to monitor upload percentage cleanly
export function uploadCsv(
  file: File,
  onProgress?: (pct: number) => void
): Promise<UploadSuccessResponse> {
  const form = new FormData();
  form.append('file', file);

  return api.post('/upload', form, {
    onUploadProgress: (e) => {
      if (e.total && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });
}

// ── Search pricing records ────────────────────────────────────────────────────
// Passes query params to Axios; empty filters are omitted
export function searchPricing(filters: SearchFilters): Promise<PricingListResponse> {
  const params: Record<string, unknown> = {};
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params[k] = v;
  });

  return api.get('', { params });
}

// ── Update a single pricing record ────────────────────────────────────────────
// Sends partial updates; server updates provided fields and refreshes updated_at
export function updatePricingRecord(
  id: string,
  data: Partial<Pick<PricingRecord, 'store_id' | 'sku' | 'product_name' | 'price' | 'record_date'>>
): Promise<{ message: string; data: unknown }> {
  return api.put(`/${id}`, data);
}

// ── Fetch upload history logs ─────────────────────────────────────────────────
export function getUploadLogs(page = 1, pageSize = 20): Promise<UploadLogsResponse> {
  return api.get('/upload-logs', { params: { page, pageSize } });
}
