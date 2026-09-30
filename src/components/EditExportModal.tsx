import React, { useState } from 'react';
import { ExportRecord, ExportBatchItem } from '../types/index.ts';
import { api } from '../api/client.ts';
import { X, ArrowUpRight, AlertCircle, Save, Plus, Trash2 } from 'lucide-react';

interface EditExportModalProps {
  exportRecord: ExportRecord;
  adminPassword?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditExportModal: React.FC<EditExportModalProps> = ({
  exportRecord,
  adminPassword,
  onClose,
  onSuccess
}) => {
  const [exportDate, setExportDate] = useState(exportRecord.export_date);
  const [invoiceNumber, setInvoiceNumber] = useState(exportRecord.invoice_number);
  const [shippingBillNumber, setShippingBillNumber] = useState(exportRecord.shipping_bill_number || '');
  const [exportType, setExportType] = useState(exportRecord.export_type);
  const [partyName, setPartyName] = useState(exportRecord.party_name);
  const [product, setProduct] = useState(exportRecord.product);
  
  const [quantityVials, setQuantityVials] = useState(exportRecord.quantity_vials?.toString() || exportRecord.quantity?.toString() || '');
  const [quantityKg, setQuantityKg] = useState(exportRecord.quantity_kg?.toString() || '');
  const [unit, setUnit] = useState(exportRecord.unit || 'vials');
  
  const [totalValUsd, setTotalValUsd] = useState(exportRecord.total_value_usd?.toString() || exportRecord.value_usd?.toString() || '');
  const [totalValInr, setTotalValInr] = useState(exportRecord.total_value_inr?.toString() || exportRecord.value_inr?.toString() || '');
  const [grossQuantity, setGrossQuantity] = useState(exportRecord.gross_quantity?.toString() || '');
  const [netQuantity, setNetQuantity] = useState(exportRecord.net_quantity?.toString() || '');
  const [remarks, setRemarks] = useState(exportRecord.remarks || '');
  const [password] = useState(adminPassword || 'Injectcare@123');

  const initialBatches: ExportBatchItem[] = (exportRecord.batches && exportRecord.batches.length > 0)
    ? exportRecord.batches.map(b => ({
        batch_number: b.batch_number,
        quantity: b.quantity || 0,
        quantity_vials: b.quantity_vials || (b.quantity || 0),
        quantity_kg: b.quantity_kg,
        value_inr: b.value_inr,
        value_usd: b.value_usd
      }))
    : [];

  const [batches, setBatches] = useState<ExportBatchItem[]>(initialBatches);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddBatch = () => {
    setBatches([
      ...batches,
      {
        batch_number: `B-${new Date().getFullYear().toString().slice(-2)}${Math.floor(100 + Math.random() * 900)}`,
        quantity: 0,
        quantity_vials: 0,
        quantity_kg: 0
      }
    ]);
  };

  const handleRemoveBatch = (index: number) => {
    setBatches(batches.filter((_, i) => i !== index));
  };

  const handleBatchChange = (index: number, field: keyof ExportBatchItem, val: string) => {
    const updated = [...batches];
    if (field === 'batch_number') {
      updated[index].batch_number = val;
    } else {
      (updated[index] as any)[field] = parseFloat(val) || 0;
    }
    setBatches(updated);

    // Sum vials and kg
    let sumV = 0;
    let sumK = 0;
    updated.forEach(b => {
      sumV += Number(b.quantity_vials || b.quantity || 0);
      sumK += Number(b.quantity_kg || 0);
    });
    if (sumV > 0) setQuantityVials(sumV.toString());
    if (sumK > 0) setQuantityKg(sumK.toFixed(3).replace(/\.?0+$/, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim()) {
      setError('Invoice number is required.');
      return;
    }
    if (!partyName.trim()) {
      setError('Buyer / consignee party name is required.');
      return;
    }
    const finalV = parseFloat(quantityVials) || 0;
    const finalK = parseFloat(quantityKg) || 0;
    if (finalV <= 0 && finalK <= 0) {
      setError('Export quantity must be greater than 0.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.updateExport(
        exportRecord.id,
        {
          export_date: exportDate,
          invoice_number: invoiceNumber.trim(),
          shipping_bill_number: shippingBillNumber.trim(),
          export_type: exportType,
          party_name: partyName.trim(),
          product: product.trim(),
          quantity: finalV > 0 ? finalV : finalK,
          unit: finalV > 0 ? 'vials' : (unit || 'kg'),
          quantity_vials: finalV > 0 ? finalV : undefined,
          quantity_kg: finalK > 0 ? finalK : undefined,
          total_value_usd: totalValUsd ? parseFloat(totalValUsd) : undefined,
          total_value_inr: totalValInr ? parseFloat(totalValInr) : undefined,
          gross_quantity: grossQuantity ? parseFloat(grossQuantity) : undefined,
          net_quantity: netQuantity ? parseFloat(netQuantity) : undefined,
          remarks,
          batches: batches.length > 0 ? batches : undefined
        },
        password
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update export shipment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Edit Export Shipment Record</h3>
              <p className="text-xs text-slate-500 font-mono">Invoice #{exportRecord.invoice_number}</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Invoice Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 font-mono font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Export Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={exportDate}
                onChange={(e) => setExportDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Export Type
              </label>
              <select
                value={exportType}
                onChange={(e) => setExportType(e.target.value as any)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 font-medium"
              >
                <option value="Direct Export">Direct Export</option>
                <option value="Third-Party Export">Third-Party Export</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Shipping Bill Number
              </label>
              <input
                type="text"
                value={shippingBillNumber}
                onChange={(e) => setShippingBillNumber(e.target.value)}
                placeholder="e.g. SB/1234567/2025"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Party / Consignee Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600"
                required
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Product Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Export Quantity (Vials)
              </label>
              <input
                type="number"
                step="any"
                value={quantityVials}
                onChange={(e) => setQuantityVials(e.target.value)}
                placeholder="e.g. 21210"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 font-mono font-bold text-sky-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Export Quantity (kg)
              </label>
              <input
                type="number"
                step="any"
                value={quantityKg}
                onChange={(e) => setQuantityKg(e.target.value)}
                placeholder="e.g. 25.45"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 font-mono font-bold text-emerald-800"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Value (USD $)
              </label>
              <input
                type="number"
                step="any"
                value={totalValUsd}
                onChange={(e) => setTotalValUsd(e.target.value)}
                placeholder="e.g. 15000"
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
                value={totalValInr}
                onChange={(e) => setTotalValInr(e.target.value)}
                placeholder="e.g. 1250000"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Remarks
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600"
              />
            </div>
          </div>

          {/* Batch Tracking Section */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Manufacturing Batches Breakdown</h4>
                <p className="text-[11px] text-slate-400">Track batch numbers with individual vial and kg quantities for DEEC declaration.</p>
              </div>
              <button
                type="button"
                onClick={handleAddBatch}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Batch</span>
              </button>
            </div>

            {batches.length > 0 ? (
              <div className="space-y-2">
                {batches.map((b, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={b.batch_number}
                        onChange={(e) => handleBatchChange(idx, 'batch_number', e.target.value)}
                        placeholder="Batch No (e.g. B-2501)"
                        className="w-full text-xs px-2 py-1 border border-slate-300 rounded font-mono font-bold bg-white"
                      />
                    </div>
                    <div className="w-28">
                      <input
                        type="number"
                        step="any"
                        value={b.quantity_vials || ''}
                        onChange={(e) => handleBatchChange(idx, 'quantity_vials', e.target.value)}
                        placeholder="Vials"
                        className="w-full text-xs px-2 py-1 border border-slate-300 rounded font-mono bg-white text-right"
                      />
                    </div>
                    <div className="w-28">
                      <input
                        type="number"
                        step="any"
                        value={b.quantity_kg || ''}
                        onChange={(e) => handleBatchChange(idx, 'quantity_kg', e.target.value)}
                        placeholder="Kg"
                        className="w-full text-xs px-2 py-1 border border-slate-300 rounded font-mono bg-white text-right"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveBatch(idx)}
                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No individual batch split defined. Click "Add Batch" to specify batch numbers.
              </div>
            )}
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
                  <span>Save Export Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
