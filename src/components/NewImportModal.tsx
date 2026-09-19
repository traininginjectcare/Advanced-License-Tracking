import React, { useState, useEffect, useMemo } from 'react';
import { Licence, LicenceProduct, ImportRecord } from '../types/index.ts';
import { api } from '../api/client.ts';
import { formatNumber } from '../utils/format.ts';
import { X, ArrowDownRight, AlertTriangle, Plus, Trash2, ShieldCheck, AlertCircle } from 'lucide-react';

interface NewImportModalProps {
  initialLicenceId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ProductLine {
  id: string;
  licence_product_id: string;
  quantity: string;
  unit: string;
}

export const NewImportModal: React.FC<NewImportModalProps> = ({
  initialLicenceId,
  onClose,
  onSuccess
}) => {
  const [licences, setLicences] = useState<Licence[]>([]);
  const [selectedLicenceId, setSelectedLicenceId] = useState(initialLicenceId || '');
  const [products, setProducts] = useState<LicenceProduct[]>([]);
  const [existingImports, setExistingImports] = useState<ImportRecord[]>([]);
  const [manufacturerList, setManufacturerList] = useState<string[]>([]);

  // Form Fields
  const [importDate, setImportDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [supplier, setSupplier] = useState('');
  const [billOfEntryNumber, setBillOfEntryNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [boeFile, setBoeFile] = useState<File | null>(null);

  // Multi-product lines
  const [productLines, setProductLines] = useState<ProductLine[]>([
    { id: 'row-1', licence_product_id: '', quantity: '', unit: 'kg' }
  ]);

  const [allowOverdraw, setAllowOverdraw] = useState(false);
  const [showOverdrawWarning, setShowOverdrawWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedLicenceId) {
      loadProducts(selectedLicenceId);
    } else {
      setProducts([]);
      setProductLines([{ id: 'row-1', licence_product_id: '', quantity: '', unit: 'kg' }]);
    }
  }, [selectedLicenceId]);

  const loadInitialData = async () => {
    try {
      const [licencesData, importsData, manufacturersData] = await Promise.all([
        api.getLicences(),
        api.getImports(),
        api.getManufacturerNames().catch(() => [])
      ]);
      setLicences(licencesData);
      setExistingImports(importsData);
      setManufacturerList(manufacturersData);
      if (!selectedLicenceId && licencesData.length > 0) {
        setSelectedLicenceId(licencesData[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadProducts = async (licenceId: string) => {
    try {
      const licenceDetail = await api.getLicenceDetail(licenceId);
      const prods = licenceDetail.products || [];
      setProducts(prods);
      if (prods.length > 0) {
        setProductLines([
          { id: 'row-1', licence_product_id: prods[0].id, quantity: '', unit: prods[0].unit }
        ]);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Real-time Duplicate Checks against Database
  const duplicateInvoice = useMemo(() => {
    const trimmed = invoiceNumber.trim().toLowerCase();
    if (!trimmed) return null;
    return existingImports.find(
      i => i.invoice_number && i.invoice_number.trim().toLowerCase() === trimmed
    );
  }, [invoiceNumber, existingImports]);

  const duplicateBoe = useMemo(() => {
    const trimmed = billOfEntryNumber.trim().toLowerCase();
    if (!trimmed) return null;
    return existingImports.find(
      i => i.bill_of_entry_number && i.bill_of_entry_number.trim().toLowerCase() === trimmed
    );
  }, [billOfEntryNumber, existingImports]);

  // Handle Product Line Updates
  const handleProductLineChange = (id: string, field: 'licence_product_id' | 'quantity', value: string) => {
    setProductLines(prev => prev.map(line => {
      if (line.id !== id) return line;
      if (field === 'licence_product_id') {
        const prod = products.find(p => p.id === value);
        return {
          ...line,
          licence_product_id: value,
          unit: prod?.unit || 'kg'
        };
      }
      return { ...line, [field]: value };
    }));
  };

  const addProductLine = () => {
    // Select first unused product if available, else first product
    const usedIds = new Set(productLines.map(l => l.licence_product_id));
    const nextProd = products.find(p => !usedIds.has(p.id)) || products[0];
    setProductLines(prev => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random()}`,
        licence_product_id: nextProd?.id || '',
        quantity: '',
        unit: nextProd?.unit || 'kg'
      }
    ]);
  };

  const removeProductLine = (id: string) => {
    if (productLines.length <= 1) return;
    setProductLines(prev => prev.filter(l => l.id !== id));
  };

  // Obligation previews across all product lines
  const obligationSummary = useMemo(() => {
    let totalQty = 0;
    let totalObligation = 0;
    let latestDueDate = '';

    productLines.forEach(line => {
      const qty = parseFloat(line.quantity) || 0;
      totalQty += qty;
      const prod = products.find(p => p.id === line.licence_product_id);
      if (prod && qty > 0) {
        let lineOb = 0;
        if (prod.approved_quantity > 0 && prod.net_obligation_quantity > 0) {
          lineOb = Math.round(qty * (prod.net_obligation_quantity / prod.approved_quantity));
        } else {
          const ratio = prod.conversion_ratio || 1;
          const wastage = prod.wastage_percentage || 0;
          lineOb = Math.round(qty * ratio * (1 - wastage / 100));
        }
        totalObligation += lineOb;

        const d = new Date(importDate);
        d.setMonth(d.getMonth() + (prod.obligation_period_months || 18));
        const dateStr = d.toISOString().split('T')[0];
        if (!latestDueDate || dateStr > latestDueDate) {
          latestDueDate = dateStr;
        }
      }
    });

    return { totalQty, totalObligation, latestDueDate };
  }, [productLines, products, importDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLicenceId || !invoiceNumber.trim() || !supplier.trim()) {
      setError('Please fill in Licence, Import Date, Invoice Number, and Supplier.');
      return;
    }

    if (duplicateInvoice) {
      setError(`Duplicate entry: Invoice Number "${invoiceNumber.trim()}" already exists in the database.`);
      return;
    }

    if (duplicateBoe) {
      setError(`Duplicate entry: Bill of Entry Number "${billOfEntryNumber.trim()}" already exists in the database.`);
      return;
    }

    // Validate product lines
    const validLines = productLines.filter(l => l.licence_product_id && parseFloat(l.quantity) > 0);
    if (validLines.length === 0) {
      setError('Please add at least one product line with a valid quantity.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const itemsPayload = validLines.map(l => {
        const prod = products.find(p => p.id === l.licence_product_id);
        return {
          licence_product_id: l.licence_product_id,
          product_name: prod?.product_name || 'Item',
          quantity: parseFloat(l.quantity),
          unit: l.unit
        };
      });

      const res = await api.createImport({
        licence_id: selectedLicenceId,
        licence_product_id: validLines[0].licence_product_id,
        import_date: importDate,
        invoice_number: invoiceNumber.trim(),
        supplier: supplier.trim(),
        quantity: itemsPayload.reduce((sum, it) => sum + it.quantity, 0),
        unit: validLines[0].unit,
        bill_of_entry_number: billOfEntryNumber ? billOfEntryNumber.trim() : undefined,
        remarks: remarks.trim(),
        allow_overdraw: allowOverdraw,
        items: itemsPayload
      });

      // If BOE file is selected, upload document
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
    <div id="new-import-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div id="new-import-modal-container" className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Record Import Consignment</h3>
              <p className="text-xs text-slate-500">Multi-product import against Advance Authorisation</p>
            </div>
          </div>
          <button
            id="close-import-modal-button"
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div id="import-modal-error-banner" className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
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

          {/* Section 1: Licence & General Consignment Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Advance Authorisation Licence <span className="text-rose-500">*</span>
              </label>
              <select
                id="import-licence-select"
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
                Import Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="import-date-input"
                type="date"
                value={importDate}
                onChange={(e) => setImportDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-600 outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Invoice Number with real-time duplicate check */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Import Invoice Number <span className="text-rose-500">*</span>
              </label>
              <input
                id="import-invoice-number-input"
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-SINO-2025-0891"
                className={`w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 outline-none uppercase font-mono transition-colors ${
                  duplicateInvoice 
                    ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-rose-500' 
                    : 'border-slate-300 focus:ring-sky-600'
                }`}
                required
              />
              {duplicateInvoice && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  Already exists in database (Licence: {duplicateInvoice.licence_number || 'Record'})
                </p>
              )}
            </div>

            {/* Bill of Entry Number: NOT MANDATORY, with real-time duplicate check */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700">
                  Bill of Entry (BOE) Number
                </label>
                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                  Optional
                </span>
              </div>
              <input
                id="import-boe-number-input"
                type="text"
                value={billOfEntryNumber}
                onChange={(e) => setBillOfEntryNumber(e.target.value)}
                placeholder="e.g. BOE/INNSA1/7829104 (optional)"
                className={`w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 outline-none uppercase font-mono transition-colors ${
                  duplicateBoe 
                    ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-rose-500' 
                    : 'border-slate-300 focus:ring-sky-600'
                }`}
              />
              {duplicateBoe && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  BOE already exists in database (Invoice: {duplicateBoe.invoice_number})
                </p>
              )}
            </div>

            {/* Overseas Supplier / Manufacturer with Autocomplete & Dropdown */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">
                  Manufacturer / Overseas Supplier <span className="text-rose-500">*</span>
                </label>
                {manufacturerList.length > 0 && (
                  <span className="text-[10px] text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded font-medium">
                    {manufacturerList.length} in directory
                  </span>
                )}
              </div>
              <input
                id="import-supplier-input"
                type="text"
                list="import-manufacturers-datalist"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Type or select manufacturer..."
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-600 outline-none bg-white"
                required
              />
              <datalist id="import-manufacturers-datalist">
                {manufacturerList.map((m, idx) => (
                  <option key={idx} value={m} />
                ))}
              </datalist>

              {/* Quick suggestions for common pharma manufacturers */}
              {manufacturerList.length > 0 && !supplier && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  <span className="text-[10px] text-slate-400">Suggestions:</span>
                  {manufacturerList.slice(0, 3).map((m, idx) => {
                    const shortName = m.split('(')[0].trim();
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSupplier(m)}
                        className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-sky-100 hover:text-sky-800 text-slate-600 rounded transition-colors"
                      >
                        + {shortName}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Multi-Product Lines Section */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div>
                <h4 className="text-xs font-semibold text-slate-900">Import Product Lines</h4>
                <p className="text-[11px] text-slate-500">Add one or multiple products imported in this consignment</p>
              </div>
              <button
                id="add-import-product-line-button"
                type="button"
                onClick={addProductLine}
                className="px-2.5 py-1 text-xs font-medium text-sky-700 bg-sky-100 hover:bg-sky-200 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Product Line</span>
              </button>
            </div>

            {productLines.map((line, idx) => {
              const prod = products.find(p => p.id === line.licence_product_id);
              const lineQty = parseFloat(line.quantity) || 0;
              let lineObQty = 0;
              if (prod && lineQty > 0) {
                if (prod.approved_quantity > 0 && prod.net_obligation_quantity > 0) {
                  lineObQty = Math.round(lineQty * (prod.net_obligation_quantity / prod.approved_quantity));
                } else {
                  lineObQty = Math.round(lineQty * (prod.conversion_ratio || 1) * (1 - (prod.wastage_percentage || 0) / 100));
                }
              }

              return (
                <div 
                  key={line.id} 
                  id={`import-product-row-${idx}`}
                  className="bg-white border border-slate-200 rounded-lg p-3 space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Product Line #{idx + 1}</span>
                    {productLines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeProductLine(line.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                        title="Remove product line"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    {/* Product Selection */}
                    <div className="md:col-span-6">
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Select Approved Product Line <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={line.licence_product_id}
                        onChange={(e) => handleProductLineChange(line.id, 'licence_product_id', e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-sky-600 outline-none"
                        required
                      >
                        <option value="">Select Product Line</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.product_name} (Approved: {formatNumber(p.approved_quantity)} {p.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity Input */}
                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Quantity <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          step="any"
                          value={line.quantity}
                          onChange={(e) => handleProductLineChange(line.id, 'quantity', e.target.value)}
                          placeholder="e.g. 100"
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-sky-600 outline-none font-mono"
                          required
                        />
                        <span className="absolute right-2 text-[11px] text-slate-400 font-mono pointer-events-none">
                          {line.unit}
                        </span>
                      </div>
                    </div>

                    {/* Line Obligation Preview */}
                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Export Obligation
                      </label>
                      <div className="text-xs px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-md text-sky-800 font-mono font-semibold truncate">
                        {lineObQty > 0 ? `${formatNumber(lineObQty)} units` : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Obligation Engine Calculation Summary */}
            {obligationSummary.totalQty > 0 && (
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-xs space-y-1.5">
                <div className="flex items-center justify-between font-semibold text-sky-900 border-b border-sky-200 pb-1">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-sky-700" />
                    Automated SION Obligation Generation Summary
                  </span>
                  <span className="text-sky-700 font-mono text-[11px]">DGFT Standard Norms</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-slate-700">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Total Import Quantity:</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {formatNumber(obligationSummary.totalQty)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Generated Obligation:</span>
                    <span className="font-bold text-sky-800 font-mono">
                      {formatNumber(obligationSummary.totalObligation)} finished units
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Obligation Due Date:</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {obligationSummary.latestDueDate || '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Optional Attach BOE Document */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-700">
                Attach Bill of Entry PDF (Customs Copy)
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Optional</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="import-boe-file-input"
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

          {/* Remarks */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Remarks / Quality Batch Reference
            </label>
            <textarea
              id="import-remarks-input"
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Quality inspection completed, customs clearance verified."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-600 outline-none"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50">
          <button
            id="cancel-import-button"
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="submit-import-button"
            type="button"
            onClick={handleSubmit}
            disabled={loading || !!duplicateInvoice || !!duplicateBoe}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
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
