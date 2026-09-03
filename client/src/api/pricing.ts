import type {
  PricingListResponse,
  UploadLogsResponse,
  UploadSuccessResponse,
  ValidationErrorResponse,
  SearchFilters,
} from '../types/pricing';

const BASE = import.meta.env.VITE_API_URL || '/api/pricing';

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

export async function uploadCsv(
  file: File,
  onProgress?: (pct: number) => void
): Promise<UploadSuccessResponse> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/upload`);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as UploadSuccessResponse);
      } else {
        try {
          const err: ValidationErrorResponse = JSON.parse(xhr.responseText);
          reject(Object.assign(new Error(err.message), { details: err }));
        } catch {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.send(formData);
  });
}

export async function searchPricing(filters: SearchFilters): Promise<PricingListResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([ k, v ]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  const res = await fetch(`${BASE}?${params.toString()}`);
  return handleResponse<PricingListResponse>(res);
}

export async function updatePricingRecord(
  id: string,
  data: Partial<{
    store_id: string;
    sku: string;
    product_name: string;
    price: number;
    record_date: string;
  }>
) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<{ message: string; data: unknown }>(res);
}

export async function getUploadLogs(page = 1, pageSize = 20): Promise<UploadLogsResponse> {
  const res = await fetch(`${BASE}/upload-logs?page=${page}&pageSize=${pageSize}`);
  return handleResponse<UploadLogsResponse>(res);
}
