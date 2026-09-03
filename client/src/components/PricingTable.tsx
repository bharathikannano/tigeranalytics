// ─────────────────────────────────────────────────────────────────────────────
// components/PricingTable.tsx
// Table of pricing records with inline row-level editing.
//
// Editing flow:
//   Click ✏ Edit  → row turns into input fields (editingId set to r.id)
//   Click ✓ Save  → PUT /api/pricing/:id → parent's onRecordUpdated() called
//   Click ✕ Cancel → discard edits, back to read-only
//
// Only one row can be open at a time (editingId guards the Edit button).
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { updatePricingRecord } from '../api/pricing';
import type { PricingRecord } from '../types/pricing';

interface Props {
  records:         PricingRecord[];
  onRecordUpdated: (updated: PricingRecord) => void;
}

type EditState = Partial<Pick<PricingRecord, 'store_id' | 'sku' | 'product_name' | 'price' | 'record_date'>>;

// Shared CSS strings to keep table cells tidy
const TD = 'px-3 py-2.5 text-sm';
const TH = 'px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide';

// Reusable text input cell — shows a read value or an editable input
function Cell({ editing, display, input }: { editing: boolean; display: React.ReactNode; input: React.ReactNode }) {
  return <>{editing ? input : display}</>;
}

export default function PricingTable({ records, onRecordUpdated }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({});
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState('');

  const set = <K extends keyof EditState>(k: K, v: EditState[K]) =>
    setEditState((p) => ({ ...p, [k]: v }));

  function startEdit(r: PricingRecord) {
    setEditingId(r.id);
    setEditState({ store_id: r.store_id, sku: r.sku, product_name: r.product_name, price: r.price, record_date: r.record_date });
    setSaveError('');
  }

  function cancelEdit() { setEditingId(null); setEditState({}); setSaveError(''); }

  async function saveEdit(id: string) {
    setSaving(true);
    setSaveError('');
    try {
      const res = await updatePricingRecord(id, editState);
      onRecordUpdated(res.data as PricingRecord);
      cancelEdit();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!records.length) return (
    <div className="text-center py-16 text-gray-400">
      <p className="text-4xl mb-3">📭</p>
      <p className="text-sm">No records found. Try adjusting your filters.</p>
    </div>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      {saveError && <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-700">⚠ {saveError}</div>}
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>{['Store ID','SKU','Product Name','Price','Date','Last Updated','Actions'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {records.map((r) => {
            const isEditing = editingId === r.id;
            return (
              <tr key={r.id} className={`transition-colors ${isEditing ? 'bg-brand-50' : 'hover:bg-gray-50'}`}>

                <td className={TD}><Cell editing={isEditing}
                  display={<span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{r.store_id}</span>}
                  input={<input className="input w-28" value={editState.store_id ?? ''} onChange={(e) => set('store_id', e.target.value)} />}
                /></td>

                <td className={TD}><Cell editing={isEditing}
                  display={<span className="font-mono text-xs">{r.sku}</span>}
                  input={<input className="input w-28" value={editState.sku ?? ''} onChange={(e) => set('sku', e.target.value)} />}
                /></td>

                <td className={`${TD} max-w-xs`}><Cell editing={isEditing}
                  display={<span className="truncate block" title={r.product_name}>{r.product_name}</span>}
                  input={<input className="input w-full" value={editState.product_name ?? ''} onChange={(e) => set('product_name', e.target.value)} />}
                /></td>

                <td className={TD}><Cell editing={isEditing}
                  display={<span className="font-semibold">{r.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                  input={<input type="number" step="0.01" min="0" className="input w-24" value={editState.price ?? ''} onChange={(e) => set('price', parseFloat(e.target.value))} />}
                /></td>

                <td className={TD}><Cell editing={isEditing}
                  display={<span>{r.record_date}</span>}
                  input={<input type="date" className="input w-36" value={editState.record_date ?? ''} onChange={(e) => set('record_date', e.target.value)} />}
                /></td>

                {/* Last updated is always read-only */}
                <td className={`${TD} text-gray-400 text-xs`}>{new Date(r.updated_at).toLocaleString()}</td>

                {/* Action buttons swap between Edit mode and Save/Cancel */}
                <td className={`${TD} whitespace-nowrap`}>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <button className="btn-primary text-xs px-3 py-1.5"   onClick={() => saveEdit(r.id)} disabled={saving}>{saving ? '…' : '✓ Save'}</button>
                      <button className="btn-secondary text-xs px-3 py-1.5" onClick={cancelEdit}           disabled={saving}>✕ Cancel</button>
                    </div>
                  ) : (
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
