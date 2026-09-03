// ─────────────────────────────────────────────────────────────────────────────
// components/PricingTable.tsx
// Displays pricing records in a table with inline row editing.
//
// Editing flow per row:
//   1. Click ✏ Edit  → row switches to input fields (editingId set)
//   2. Click ✓ Save  → PUT /api/pricing/:id → parent notified via onRecordUpdated
//   3. Click ✕ Cancel → discard changes, return to read-only view
//
// Only one row can be edited at a time (editingId tracks which one).
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { updatePricingRecord } from '../api/pricing';
import type { PricingRecord } from '../types/pricing';

interface Props {
  records:         PricingRecord[];
  onRecordUpdated: (updated: PricingRecord) => void;  // notify parent after save
}

// The subset of fields the user can edit inline
type EditState = Partial<Pick<PricingRecord, 'store_id' | 'sku' | 'product_name' | 'price' | 'record_date'>>;

// Shared CSS class strings to keep JSX compact
const TD = 'px-3 py-2.5 text-sm';
const TH = 'px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide';

export default function PricingTable({ records, onRecordUpdated }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);  // ID of the row being edited
  const [editState, setEditState] = useState<EditState>({});         // current field values
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState('');

  // Enter edit mode for a row — copy its current values into editState
  function startEdit(r: PricingRecord) {
    setEditingId(r.id);
    setEditState({ store_id: r.store_id, sku: r.sku, product_name: r.product_name, price: r.price, record_date: r.record_date });
    setSaveError('');
  }

  // Discard edits and go back to read-only
  function cancelEdit() { setEditingId(null); setEditState({}); setSaveError(''); }

  // Persist the edited row to the server
  async function saveEdit(id: string) {
    setSaving(true);
    setSaveError('');
    try {
      const result = await updatePricingRecord(id, editState);
      onRecordUpdated(result.data as PricingRecord);
      setEditingId(null);
      setEditState({});
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  // Update a single field in editState
  const setField = <K extends keyof EditState>(key: K, value: EditState[K]) =>
    setEditState((prev) => ({ ...prev, [key]: value }));

  if (records.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-sm">No records found. Try adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      {/* Inline save error — shown above the table so it's always visible */}
      {saveError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-700">⚠ {saveError}</div>
      )}

      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {['Store ID', 'SKU', 'Product Name', 'Price', 'Date', 'Last Updated', 'Actions']
              .map((h) => <th key={h} className={TH}>{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {records.map((r) => {
            const isEditing = editingId === r.id;
            return (
              <tr key={r.id} className={`transition-colors ${isEditing ? 'bg-brand-50' : 'hover:bg-gray-50'}`}>

                {/* Store ID */}
                <td className={TD}>
                  {isEditing
                    ? <input className="input w-28" value={editState.store_id ?? ''} onChange={(e) => setField('store_id', e.target.value)} />
                    : <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{r.store_id}</span>}
                </td>

                {/* SKU */}
                <td className={TD}>
                  {isEditing
                    ? <input className="input w-28" value={editState.sku ?? ''} onChange={(e) => setField('sku', e.target.value)} />
                    : <span className="font-mono text-xs">{r.sku}</span>}
                </td>

                {/* Product Name */}
                <td className={`${TD} max-w-xs`}>
                  {isEditing
                    ? <input className="input w-full" value={editState.product_name ?? ''} onChange={(e) => setField('product_name', e.target.value)} />
                    : <span className="truncate block" title={r.product_name}>{r.product_name}</span>}
                </td>

                {/* Price */}
                <td className={TD}>
                  {isEditing
                    ? <input type="number" step="0.01" min="0" className="input w-24" value={editState.price ?? ''}
                        onChange={(e) => setField('price', parseFloat(e.target.value))} />
                    : <span className="font-semibold text-gray-800">
                        {r.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>}
                </td>

                {/* Record Date */}
                <td className={TD}>
                  {isEditing
                    ? <input type="date" className="input w-36" value={editState.record_date ?? ''} onChange={(e) => setField('record_date', e.target.value)} />
                    : <span>{r.record_date}</span>}
                </td>

                {/* Last Updated (read-only) */}
                <td className={`${TD} text-gray-400 text-xs`}>{new Date(r.updated_at).toLocaleString()}</td>

                {/* Edit / Save / Cancel buttons */}
                <td className={`${TD} whitespace-nowrap`}>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <button className="btn-primary text-xs px-3 py-1.5"   onClick={() => saveEdit(r.id)} disabled={saving}>{saving ? '…' : '✓ Save'}</button>
                      <button className="btn-secondary text-xs px-3 py-1.5" onClick={cancelEdit}           disabled={saving}>✕ Cancel</button>
                    </div>
                  ) : (
                    // Disable Edit on all rows when another row is already being edited
                    <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => startEdit(r)} disabled={editingId !== null}>✏ Edit</button>
                  )}
                </td>

              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
