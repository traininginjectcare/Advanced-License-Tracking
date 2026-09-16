import React, { useState, useEffect } from 'react';
import { ExportType, Licence, ExportObligation } from '../types/index.ts';
import { api } from '../api/client.ts';
import { formatNumber } from '../utils/format.ts';
import { X, ArrowUpRight, AlertTriangle, FileUp } from 'lucide-react';

interface NewExportModalProps {
  initialLicenceId?: string;
  initialObligationId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewExportModal: React.FC<NewExportModalProps> = ({
  initialLicenceId,
  initialObligationId,
  onClose,
  onSuccess
}) => {
  const [licences, setLicences] = useState<Licence[]>([]);
  const [selectedLicenceId, setSelectedLicenceId] = useState(initialLicenceId || '');
  const [obligations, setObligations] = useState<ExportObligation[]>([]);
  const [selectedObligationId, setSelectedObligationId] = useState(initialObligationId || '');

  const [exportDate, setExportDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [exportType, setExportType] = useState<ExportType>('Direct Export');
  const [partyName, setPartyName] = useState('');
  const [product, setProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('vials');
  const [shippingBillNumber, setShippingBillNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  // Files for immediate upload
  const [shippingBillFile, setShippingBillFile] = useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [brcFile, setBrcFile] = useState<File | null>(null);
  const [nocFile, setNocFile] = useState<File | null>(null);

  const [allowExcess, setAllowExcess] = useState(false);
  const [showExcessWarning, setShowExcessWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLicences();
  }, []);

  useEffect(() => {
    if (selectedLicenceId) {
      loadObligations(selectedLicenceId);
    } else {
      setObligations([]);
      setSelectedObligationId('');
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

  const loadObligations = async (licenceId: string) => {
    try {
      const obs = await api.getObligations(licenceId);
      setObligations(obs);
      if (!selectedObligationId && obs.length > 0) {
        setSelectedObligationId(obs[0].id);
        if (obs[0].product_name) setProduct(obs[0].product_name);
        if (obs[0].unit) setUnit(obs[0].unit);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleObligationChange = (obId: string) => {
    setSelectedObligationId(obId);
    const ob = obligations.find(o => o.id === obId);
    if (ob) {
      if (ob.product_name) setProduct(ob.product_name);
      if (ob.unit) setUnit(ob.unit);
    }
  };

  const currentObligation = obligations.find(o => o.id === selectedObligationId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLicenceId || !selectedObligationId || !invoiceNumber || !partyName || !product || !quantity || !shippingBillNumber) {
      setError('Please fill in all mandatory export fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.createExport({
        licence_id: selectedLicenceId,
        obligation_id: selectedObligationId,
        export_date: exportDate,
        invoice_number: invoiceNumber.trim(),
        export_type: exportType,
        party_name: partyName.trim(),
        product: product.trim(),
        quantity: parseFloat(quantity),
        unit,
        shipping_bill_number: shippingBillNumber.trim(),
        remarks: remarks.trim(),
        allow_excess: allowExcess
      });

      const exportId = res.export?.id;
      if (exportId) {
        // Upload documents if selected
        const uploadHelper = async (file: File, type: any) => {
          const fd = new FormData();
          fd.append('file', file);
          fd.append('document_type', type);
          fd.append('licence_id', selectedLicenceId);
          fd.append('export_id', exportId);
          fd.append('uploaded_by', 'Export Compliance Desk');
          await api.uploadDocument(fd);
        };

        if (shippingBillFile) await uploadHelper(shippingBillFile, 'Shipping Bill');
        if (invoiceFile) await uploadHelper(invoiceFile, 'Export Invoice');
        if (brcFile) await uploadHelper(brcFile, 'BRC');
        if (exportType === 'Third-Party Export' && nocFile) await uploadHelper(nocFile, 'NOC');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.warning) {
        setShowExcessWarning(true);
        setWarningMessage(err.message);
      } else {
        setError(err.message || 'Failed to record export.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Record Export Shipment</h3>
              <p className="text-xs text-slate-500">Obligation Fulfillment & Compliance Verification</p>
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

          {showExcessWarning && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{warningMessage}</span>
              </div>
              <label className="flex items-center gap-2 font-medium cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={allowExcess}
                  onChange={(e) => setAllowExcess(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>Confirm surplus allocation against this obligation</span>
              </label>
            </div>
          )}

          {/* Licence & Obligation selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Advance Authorisation Licence <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedLicenceId}
                onChange={(e) => setSelectedLicenceId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                required
              >
                <option value="">Select Licence</option>
                {licences.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.licence_number} (Exp: {l.export_validity_date})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Linked Export Obligation Record <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedObligationId}
                onChange={(e) => handleObligationChange(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                required
              >
                <option value="">Select Obligation</option>
                {obligations.map(o => (
                  <option key={o.id} value={o.id}>
                    Inv #{o.import_invoice_number} - Pending: {formatNumber(o.pending_quantity)} {o.unit || 'units'} (Due: {o.due_date})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {currentObligation && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900">
              <div>
                <span className="font-semibold">Obligation Status: </span>
                <span className="font-mono">{currentObligation.status}</span> | Due: <span className="font-mono">{currentObligation.due_date}</span>
              </div>
              <div>
                <span>Pending Balance: </span>
                <span className="font-bold text-emerald-800 font-mono text-sm">
                  {formatNumber(currentObligation.pending_quantity)} {currentObligation.unit || 'units'}
                </span>
              </div>
            </div>
          )}

          {/* Export Type Selection */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="block text-xs font-semibold text-slate-800">
              Export Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                exportType === 'Direct Export' ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 font-medium' : 'border-slate-200 bg-white text-slate-700'
              }`}>
                <input
                  type="radio"
                  name="export_type"
                  value="Direct Export"
                  checked={exportType === 'Direct Export'}
                  onChange={() => setExportType('Direct Export')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-xs">Direct Export</div>
                  <div className="text-[10px] text-slate-500">Requires: Shipping Bill, Invoice, BRC</div>
                </div>
              </label>

              <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                exportType === 'Third-Party Export' ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 font-medium' : 'border-slate-200 bg-white text-slate-700'
              }`}>
                <input
                  type="radio"
                  name="export_type"
                  value="Third-Party Export"
                  checked={exportType === 'Third-Party Export'}
                  onChange={() => setExportType('Third-Party Export')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-xs">Third-Party Export</div>
                  <div className="text-[10px] text-amber-700 font-medium">Requires: Shipping Bill, Invoice, BRC + NOC</div>
                </div>
              </label>
            </div>
          </div>

          {/* Export Transaction Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Export Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={exportDate}
                onChange={(e) => setExportDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Export Invoice Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. EXP/ICP/2025/124"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none uppercase font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Shipping Bill Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={shippingBillNumber}
                onChange={(e) => setShippingBillNumber(e.target.value)}
                placeholder="e.g. SB/INNSA1/981240"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none uppercase font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Party / Buyer / Merchant Exporter Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="e.g. MedCare Healthcare Ltd, London, UK"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Exported Finished Product <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="e.g. Amoxicillin for Injection 500mg Vials"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Quantity Exported <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 500000"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none font-mono"
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
                onChange={(e) => setUnit(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none font-mono"
              />
            </div>
          </div>

          {/* Document Uploads section based on Export Type */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                Required Export Compliance Documents
              </span>
              <span className="text-[11px] text-slate-500">You can attach files now or later</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Shipping Bill</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setShippingBillFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Export Invoice</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">BRC / Bank Realisation</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setBrcFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300"
                />
              </div>

              {exportType === 'Third-Party Export' && (
                <div className="p-2 bg-amber-50/70 border border-amber-200 rounded-lg">
                  <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                    NOC (No Objection Certificate) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setNocFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:bg-amber-200 file:text-amber-800 hover:file:bg-amber-300"
                  />
                  <p className="text-[10px] text-amber-700 mt-0.5">Mandatory for merchant/third-party exports under DGFT norms.</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Remarks / Port of Loading
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Shipped through Nhava Sheva (JNPT) container terminal."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
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
                <span>Recording Export...</span>
              </>
            ) : (
              <span>Save Export & Fulfill Obligation</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
