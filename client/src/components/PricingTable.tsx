import { useState } from 'react';
import type { PricingRecord } from '../types/pricing';
import { updatePricingRecord } from '../api/pricing';

interface Props {
  records: PricingRecord[];
  onRecordUpdated: (updated: PricingRecord) => void;
}

type EditState = Partial<Pick<PricingRecord, 'store_id' | 'sku' | 'product_name' | 'price' | 'record_date'>>;

const COL_CLASS = 'px-3 py-2.5 text-sm';
const HEADER_CLASS = 'px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide';

export default function PricingTable({ records, onRecordUpdated }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  function startEdit(r: PricingRecord) {
    setEditingId(r.id);
    setEditState({
      store_id:     r.store_id,
      sku:          r.sku,
      product_name: r.product_name,
      price:        r.price,
      record_date:  r.record_date,
    });
    setSaveError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState({});
    setSaveError('');
  }

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

  function setField<K extends keyof EditState>(key: K, value: EditState[K]) {
    setEditState((prev) => ({ ...prev, [key]: value }));
  }

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
      {saveError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-700">
          ⚠ {saveError}
        </div>
      )}
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className={HEADER_CLASS}>Store ID</th>
            <th className={HEADER_CLASS}>SKU</th>
            <th className={HEADER_CLASS}>Product Name</th>
            <th className={HEADER_CLASS}>Price</th>
            <th className={HEADER_CLASS}>Date</th>
            <th className={HEADER_CLASS}>Last Updated</th>
            <th className={HEADER_CLASS}>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {records.map((r) => {
            const isEditing = editingId === r.id;
            return (
              <tr
                key={r.id}
                className={`transition-colors ${isEditing ? 'bg-brand-50' : 'hover:bg-gray-50'}`}
              >
                {/* Store ID */}
                <td className={COL_CLASS}>
                  {isEditing ? (
                    <input
                      className="input w-28"
                      value={editState.store_id ?? ''}
                      onChange={(e) => setField('store_id', e.target.value)}
                    />
                  ) : (
                    <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{r.store_id}</span>
                  )}
                </td>

                {/* SKU */}
                <td className={COL_CLASS}>
                  {isEditing ? (
                    <input
                      className="input w-28"
                      value={editState.sku ?? ''}
                      onChange={(e) => setField('sku', e.target.value)}
                    />
                  ) : (
                    <span className="font-mono text-xs">{r.sku}</span>
                  )}
                </td>

                {/* Product Name */}
                <td className={`${COL_CLASS} max-w-xs`}>
                  {isEditing ? (
                    <input
                      className="input w-full"
                      value={editState.product_name ?? ''}
                      onChange={(e) => setField('product_name', e.target.value)}
                    />
                  ) : (
                    <span className="truncate block" title={r.product_name}>{r.product_name}</span>
                  )}
                </td>

                {/* Price */}
                <td className={COL_CLASS}>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input w-24"
                      value={editState.price ?? ''}
                      onChange={(e) => setField('price', parseFloat(e.target.value))}
                    />
                  ) : (
                    <span className="font-semibold text-gray-800">
                      {r.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                </td>

                {/* Record Date */}
                <td className={COL_CLASS}>
                  {isEditing ? (
                    <input
                      type="date"
                      className="input w-36"
                      value={editState.record_date ?? ''}
                      onChange={(e) => setField('record_date', e.target.value)}
                    />
                  ) : (
                    <span>{r.record_date}</span>
                  )}
                </td>

                {/* Updated At */}
                <td className={`${COL_CLASS} text-gray-400 text-xs`}>
                  {new Date(r.updated_at).toLocaleString()}
                </td>

                {/* Actions */}
                <td className={`${COL_CLASS} whitespace-nowrap`}>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <button
                        className="btn-primary text-xs px-3 py-1.5"
                        onClick={() => saveEdit(r.id)}
                        disabled={saving}
                      >
                        {saving ? '…' : '✓ Save'}
                      </button>
                      <button
                        className="btn-secondary text-xs px-3 py-1.5"
                        onClick={cancelEdit}
                        disabled={saving}
                      >
                        ✕ Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn-secondary text-xs px-3 py-1.5"
                      onClick={() => startEdit(r)}
                      disabled={editingId !== null}
                    >
                      ✏ Edit
                    </button>
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
