import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import UploadDropzone from '../components/UploadDropzone';
import { uploadCsv, getUploadLogs } from '../api/pricing';
import type { UploadLog } from '../types/pricing';
import { useState } from 'react';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export default function UploadPage() {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress]         = useState(0);
  const [status, setStatus]             = useState<UploadStatus>('idle');
  const [result, setResult]             = useState<{ rowsInserted: number; fileName: string } | null>(null);
  const [errors, setErrors]             = useState<string[]>([]);
  const [errorMsg, setErrorMsg]         = useState('');

  // ── Fetch upload logs via TanStack Query ─────────────────────────────────
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['upload-logs'],
    queryFn: () => getUploadLogs(),
  });
  const logs: UploadLog[] = logsData?.data ?? [];

  // ── Upload mutation ───────────────────────────────────────────────────────
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadCsv(file, setProgress),
    onMutate: () => {
      setStatus('uploading');
      setProgress(0);
      setResult(null);
      setErrors([]);
      setErrorMsg('');
    },
    onSuccess: (res) => {
      setResult({ rowsInserted: res.rowsInserted, fileName: res.fileName });
      setStatus('success');
      setSelectedFile(null);
      // Invalidate logs cache so the history table auto-refreshes
      queryClient.invalidateQueries({ queryKey: ['upload-logs'] });
    },
    onError: (err) => {
      setStatus('error');
      if (err && typeof err === 'object' && 'details' in err) {
        const d = (err as { details: { message: string; errors?: string[] } }).details;
        setErrorMsg(d.message);
        setErrors(d.errors ?? []);
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
      }
    },
  });

  function handleFile(file: File) {
    setSelectedFile(file);
    setStatus('idle');
    setResult(null);
    setErrors([]);
    setErrorMsg('');
    setProgress(0);
  }

  function reset() {
    setSelectedFile(null);
    setStatus('idle');
    setProgress(0);
    setResult(null);
    setErrors([]);
    setErrorMsg('');
  }

  const statusBadge = (s: UploadLog['status']) => {
    if (s === 'success') return <span className="badge-success">✓ Success</span>;
    if (s === 'failed')  return <span className="badge-error">✕ Failed</span>;
    return <span className="badge-warning">⚠ Partial</span>;
  };

  return (
    <div className="space-y-8">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Pricing Feeds</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload CSV files from retail stores. All rows are validated before saving — any errors will prevent a partial write.
        </p>
      </div>

      {/* ── CSV spec hint ────────────────────────────────────────────── */}
      <div className="card p-4 flex gap-4 items-start bg-blue-50 border-blue-200">
        <span className="text-2xl">ℹ️</span>
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Expected CSV format</p>
          <code className="block bg-white/70 rounded px-3 py-2 font-mono text-xs border border-blue-200">
            Store ID,SKU,Product Name,Price,Date<br />
            STORE-001,ABC-001,Widget Pro,9.99,2024-01-15<br />
            STORE-002,XYZ-999,Gadget Deluxe,49.99,2024-01-15
          </code>
          <p className="mt-2 text-xs text-blue-600">Column headers are case-insensitive. Date must be parseable (e.g. YYYY-MM-DD). Price must be numeric.</p>
        </div>
      </div>

      {/* ── Upload card ──────────────────────────────────────────────── */}
      <div className="card p-6 space-y-5">
        <UploadDropzone onFile={handleFile} disabled={status === 'uploading'} />

        {/* Selected file preview */}
        {selectedFile && status !== 'success' && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
            <span className="text-xl">📄</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <button className="btn-danger text-xs" onClick={reset}>Remove</button>
          </div>
        )}

        {/* Progress bar */}
        {status === 'uploading' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Uploading…</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-brand-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Success banner */}
        {status === 'success' && result && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-green-800">Upload successful!</p>
              <p className="text-sm text-green-700">
                <strong>{result.rowsInserted.toLocaleString()}</strong> records imported from <em>{result.fileName}</em>.
              </p>
            </div>
          </div>
        )}

        {/* Error banner */}
        {status === 'error' && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="font-semibold text-red-800 mb-1">⚠ Upload failed</p>
            <p className="text-sm text-red-700">{errorMsg}</p>
            {errors.length > 0 && (
              <ul className="mt-2 max-h-48 overflow-y-auto space-y-0.5">
                {errors.map((e, i) => (
                  <li key={i} className="text-xs text-red-600 font-mono">• {e}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            className="btn-primary"
            onClick={() => selectedFile && uploadMutation.mutate(selectedFile)}
            disabled={!selectedFile || status === 'uploading'}
          >
            {status === 'uploading' ? 'Uploading…' : '⬆ Upload'}
          </button>
          {(status === 'success' || status === 'error') && (
            <button className="btn-secondary" onClick={reset}>Upload Another</button>
          )}
        </div>
      </div>

      {/* ── Upload history ───────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Upload History</h2>
        <div className="card overflow-hidden">
          {logsLoading ? (
            <p className="text-center py-8 text-sm text-gray-400">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="text-center py-8 text-sm text-gray-400">No uploads yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">File Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Rows</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Uploaded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium truncate max-w-xs" title={log.file_name}>{log.file_name}</td>
                    <td className="px-4 py-3">{log.row_count.toLocaleString()}</td>
                    <td className="px-4 py-3">{statusBadge(log.status)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
