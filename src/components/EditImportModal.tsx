import React, { useState } from 'react';
import { ImportRecord } from '../types/index.ts';
import { api } from '../api/client.ts';
import { X, ArrowDownRight, AlertCircle, Save } from 'lucide-react';

interface EditImportModalProps {
  importRecord: ImportRecord;
  adminPassword?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditImportModal: React.FC<EditImportModalProps> = ({
  importRecord,
  adminPassword,
  onClose,
  onSuccess
}) => {
  const [importDate, setImportDate] = useState(importRecord.import_date);
  const [invoiceNumber, setInvoiceNumber] = useState(importRecord.invoice_number);
  const [supplier, setSupplier] = useState(importRecord.supplier);
  const [billOfEntry, setBillOfEntry] = useState(importRecord.bill_of_entry_number || '');
  const [quantity, setQuantity] = useState(importRecord.quantity.toString());
  const [unit, setUnit] = useState(importRecord.unit || 'kg');
  const [valueUsd, setValueUsd] = useState(importRecord.value_usd?.toString() || '');
  const [valueInr, setValueInr] = useState(importRecord.value_inr?.toString() || '');
  const [remarks, setRemarks] = useState(importRecord.remarks || '');
  const [password] = useState(adminPassword || 'Injectcare@123');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim()) {
      setError('Invoice number is required.');
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      setError('Quantity must be greater than 0.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.updateImport(
        importRecord.id,
        {
          import_date: importDate,
          invoice_number: invoiceNumber.trim(),
          supplier: supplier.trim(),
          bill_of_entry_number: billOfEntry.trim(),
          quantity: parseFloat(quantity),
          unit,
          value_usd: valueUsd ? parseFloat(valueUsd) : undefined,
          value_inr: valueInr ? parseFloat(valueInr) : undefined,
          remarks
        },
        password
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update import consignment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Edit Duty-Free Import Record</h3>
              <p className="text-xs text-slate-500 font-mono">Invoice #{importRecord.invoice_number}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Invoice Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Import Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={importDate}
                onChange={(e) => setImportDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Supplier / Manufacturer <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Bill of Entry (BOE) Number
              </label>
              <input
                type="text"
                value={billOfEntry}
                onChange={(e) => setBillOfEntry(e.target.value)}
                placeholder="e.g. BOE/JNPT/12345/2025"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Quantity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Unit
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600"
                >
                  <option value="kg">kg</option>
                  <option value="vials">vials</option>
                  <option value="PCS">PCS</option>
                  <option value="MT">MT</option>
                  <option value="g">g</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Value (USD $)
              </label>
              <input
                type="number"
                step="any"
                value={valueUsd}
                onChange={(e) => setValueUsd(e.target.value)}
                placeholder="e.g. 25000"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Value (INR ₹)
              </label>
              <input
                type="number"
                step="any"
                value={valueInr}
                onChange={(e) => setValueInr(e.target.value)}
                placeholder="e.g. 2100000"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Remarks / Notes
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600"
                placeholder="Consignment customs clearance remarks..."
              />
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <strong>Note:</strong> Modifying the import quantity will automatically update the linked export obligation to match this net imported quantity ({quantity || '0'} {unit}).
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Import Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
