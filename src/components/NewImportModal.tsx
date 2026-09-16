import React, { useState, useEffect } from 'react';
import { Licence, LicenceProduct } from '../types/index.ts';
import { api } from '../api/client.ts';
import { formatNumber } from '../utils/format.ts';
import { X, ArrowDownRight, AlertTriangle, CheckCircle, FileUp } from 'lucide-react';

interface NewImportModalProps {
  initialLicenceId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewImportModal: React.FC<NewImportModalProps> = ({
  initialLicenceId,
  onClose,
  onSuccess
}) => {
  const [licences, setLicences] = useState<Licence[]>([]);
  const [selectedLicenceId, setSelectedLicenceId] = useState(initialLicenceId || '');
  const [products, setProducts] = useState<LicenceProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  
  const [importDate, setImportDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [supplier, setSupplier] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [billOfEntryNumber, setBillOfEntryNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [boeFile, setBoeFile] = useState<File | null>(null);

  const [allowOverdraw, setAllowOverdraw] = useState(false);
  const [showOverdrawWarning, setShowOverdrawWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLicences();
  }, []);

  useEffect(() => {
    if (selectedLicenceId) {
      loadProducts(selectedLicenceId);
    } else {
      setProducts([]);
      setSelectedProductId('');
    }
  }, [selectedLicenceId]);

  const loadLicences = async () => {
    try {
      const data = await api.getLicences();
      setLicences(data);
      if (!selectedLicenceId && data.length > 0) {
        setSelectedLicenceId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadProducts = async (licenceId: string) => {
    try {
      const licenceDetail = await api.getLicenceDetail(licenceId);
      setProducts(licenceDetail.products || []);
      if (licenceDetail.products && licenceDetail.products.length > 0) {
        setSelectedProductId(licenceDetail.products[0].id);
        setUnit(licenceDetail.products[0].unit);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      setUnit(prod.unit);
    }
  };

  // Compute live obligation preview
  const currentProduct = products.find(p => p.id === selectedProductId);
  const currentQty = parseFloat(quantity) || 0;
  
  let previewObligationQty = 0;
  let previewDueDate = '';

  if (currentProduct && currentQty > 0) {
    const ratio = currentProduct.conversion_ratio || 1;
    const wastage = currentProduct.wastage_percentage || 0;
    
    if (currentProduct.approved_quantity > 0 && currentProduct.net_obligation_quantity > 0) {
      previewObligationQty = Math.round(currentQty * (currentProduct.net_obligation_quantity / currentProduct.approved_quantity));
    } else {
      previewObligationQty = Math.round(currentQty * ratio * (1 - wastage / 100));
    }

    const d = new Date(importDate);
    d.setMonth(d.getMonth() + (currentProduct.obligation_period_months || 18));
    previewDueDate = d.toISOString().split('T')[0];
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLicenceId || !selectedProductId || !invoiceNumber || !supplier || !quantity || !billOfEntryNumber) {
      setError('Please fill in all required import fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.createImport({
        licence_id: selectedLicenceId,
        licence_product_id: selectedProductId,
        import_date: importDate,
        invoice_number: invoiceNumber.trim(),
        supplier: supplier.trim(),
        quantity: parseFloat(quantity),
        unit,
        bill_of_entry_number: billOfEntryNumber.trim(),
        remarks: remarks.trim(),
        allow_overdraw: allowOverdraw
      });

      // If BOE file is selected, upload to Google Drive & Firestore repository immediately
      if (boeFile && res.import && res.import.id) {
        try {
          const formData = new FormData();
          formData.append('file', boeFile);
          formData.append('document_type', 'Bill of Entry');
          formData.append('licence_id', selectedLicenceId);
          formData.append('import_id', res.import.id);
          formData.append('uploaded_by', 'Import Documentation Desk');
          await api.uploadDocument(formData);
        } catch (uploadErr) {
          console.warn('BOE upload failed:', uploadErr);
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.warning) {
        setShowOverdrawWarning(true);
        setWarningMessage(err.message);
      } else {
        setError(err.message || 'Failed to record import.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Record Import Consignment</h3>
              <p className="text-xs text-slate-500">Bill of Entry against Advance Authorisation</p>
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {error}
            </div>
          )}

          {showOverdrawWarning && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{warningMessage}</span>
              </div>
              <label className="flex items-center gap-2 font-medium cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={allowOverdraw}
                  onChange={(e) => setAllowOverdraw(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>Authorise special overdraw import against this licence</span>
              </label>
            </div>
          )}

          {/* Licence & Product Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Advance Authorisation Licence <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedLicenceId}
                onChange={(e) => setSelectedLicenceId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-600 outline-none"
                required
              >
                <option value="">Select Licence</option>
                {licences.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.licence_number} (Exp: {l.import_validity_date})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Approved Product Line <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-600 outline-none"
                required
              >
                <option value="">Select Product</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.product_name} (Approved: {formatNumber(p.approved_quantity)} {p.unit})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Import Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Import Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={importDate}
                onChange={(e) => setImportDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-600 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Import Invoice Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-SINO-2025-0891"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-600 outline-none uppercase font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Bill of Entry (BOE) Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={billOfEntryNumber}
                onChange={(e) => setBillOfEntryNumber(e.target.value)}
                placeholder="e.g. BOE/INNSA1/7829104"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-600 outline-none uppercase font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Overseas Supplier / Manufacturer <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. Sinochem Pharmaceutical Corp., Shanghai"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-600 outline-none"
                required
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
                  placeholder="e.g. 1200"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-600 outline-none font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  value={unit}
                  readOnly
                  className="w-full text-xs px-3 py-2 border border-slate-200 bg-slate-100 rounded-lg text-slate-600 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Automatic Obligation Engine Calculation Preview */}
          {currentQty > 0 && currentProduct && (
            <div className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-xl space-y-1 text-xs">
              <div className="flex items-center justify-between font-semibold text-sky-900 pb-1 border-b border-sky-200/60">
                <span>⚡ Automated Export Obligation Calculation</span>
                <span className="text-sky-700 text-[11px]">Formula: DGFT SION Norms</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1 text-slate-700">
                <div>
                  <span className="text-slate-500 text-[11px] block">Required Export Obligation:</span>
                  <span className="font-semibold text-sky-800 text-sm font-mono">
                    {formatNumber(previewObligationQty)} finished units
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Calculated Due Date:</span>
                  <span className="font-semibold text-slate-900 text-sm font-mono">
                    {previewDueDate}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-sky-600/80 pt-1">
                Saving this import will automatically generate and bind this obligation record into the tracking register.
              </p>
            </div>
          )}

          {/* Attach BOE Document */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Attach Bill of Entry PDF (Customs Out-of-Charge Copy)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".pdf,.png,.jpg"
                onChange={(e) => setBoeFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
              />
              {boeFile && (
                <span className="text-xs text-emerald-600 font-medium">✓ {boeFile.name} ready</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Remarks / Quality Batch Reference
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Batch AMX-2025-04, COA verified, Custom Out-of-charge completed."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-600 outline-none"
            />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Recording Import...</span>
              </>
            ) : (
              <span>Save Import & Create Obligation</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
