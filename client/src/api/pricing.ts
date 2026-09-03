// ─────────────────────────────────────────────────────────────────────────────
// api/pricing.ts
// All HTTP calls to the backend live here.
// Components never use fetch() directly — they call these functions instead.
//
// BASE URL:
//   • Local dev  → proxied by Vite to http://localhost:4000 (see vite.config.ts)
//   • Production → set VITE_API_URL env var in Amplify console
// ─────────────────────────────────────────────────────────────────────────────

import type {
  PricingListResponse,
  UploadLogsResponse,
  UploadSuccessResponse,
  ValidationErrorResponse,
  SearchFilters,
} from '../types/pricing';

const BASE = import.meta.env.VITE_API_URL || '/api/pricing';

// ── Shared helper ─────────────────────────────────────────────────────────────
// Throws a structured error for any non-2xx response so callers can rely on
// try/catch instead of checking res.ok manually.
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err: ValidationErrorResponse = await res.json().catch(() => ({
      error: 'NetworkError',
      message: res.statusText,
    }));
    throw Object.assign(new Error(err.message), { details: err });
  }
  return res.json() as Promise<T>;
}

// ── Upload CSV ────────────────────────────────────────────────────────────────
// Uses XHR (instead of fetch) so we can track real upload progress.
// onProgress receives a 0-100 percentage value.
export function uploadCsv(file: File, onProgress?: (pct: number) => void): Promise<UploadSuccessResponse> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/upload`);

    // Fire onProgress as bytes are sent
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const err: ValidationErrorResponse = JSON.parse(xhr.responseText);
          reject(Object.assign(new Error(err.message), { details: err }));
        } catch {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(form);
  });
}

// ── Search pricing records ────────────────────────────────────────────────────
// Converts the SearchFilters object to query-string params and fetches results.
export function searchPricing(filters: SearchFilters): Promise<PricingListResponse> {
  const params = new URLSearchParams();
  // Only include non-empty filter values in the request
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  return fetch(`${BASE}?${params}`).then(handleResponse<PricingListResponse>);
}

// ── Update a single pricing record ────────────────────────────────────────────
// Sends only the changed fields; the server merges them with the existing row.
export function updatePricingRecord(
  id: string,
  data: Partial<Pick<import('../types/pricing').PricingRecord, 'store_id' | 'sku' | 'product_name' | 'price' | 'record_date'>>
) {
  return fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handleResponse<{ message: string; data: unknown }>);
}

// ── Fetch upload history logs ─────────────────────────────────────────────────
export function getUploadLogs(page = 1, pageSize = 20): Promise<UploadLogsResponse> {
  return fetch(`${BASE}/upload-logs?page=${page}&pageSize=${pageSize}`)
    .then(handleResponse<UploadLogsResponse>);
}
