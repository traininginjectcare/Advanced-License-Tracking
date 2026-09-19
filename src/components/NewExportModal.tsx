import React, { useState, useEffect, useMemo } from 'react';
import { ExportType, Licence, ExportObligation, ExportRecord, LicenceProduct } from '../types/index.ts';
import { api } from '../api/client.ts';
import { formatNumber } from '../utils/format.ts';
import { X, ArrowUpRight, AlertTriangle, Plus, Trash2, ShieldCheck, AlertCircle, Layers, CheckCircle2 } from 'lucide-react';

interface NewExportModalProps {
  initialLicenceId?: string;
  initialObligationId?: string;
  onClose: () => void;
  onSuccess: (createdExport?: ExportRecord) => void;
}

interface BatchItem {
  id: string;
  batch_number: string;
  quantity: string;
}

interface ExportProductLine {
  id: string;
  product: string;
  unit: string;
  directQuantity: string;
  grossQuantityOverride?: string;
  batches: BatchItem[];
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
  const [licenceProducts, setLicenceProducts] = useState<LicenceProduct[]>([]);
  const [existingExports, setExistingExports] = useState<ExportRecord[]>([]);
  const [partyOptions, setPartyOptions] = useState<string[]>([]);

  // Selected specific obligation (optional now, auto-calculated FIFO product-wise)
  const [selectedObligationId, setSelectedObligationId] = useState(initialObligationId || '');

  // Form Fields
  const [exportDate, setExportDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [exportType, setExportType] = useState<ExportType>('Direct Export');
  const [partyName, setPartyName] = useState('');
  const [shippingBillNumber, setShippingBillNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [generateDeec, setGenerateDeec] = useState(false);

  // Multi-Product Lines with Batch Numbers
  const [productLines, setProductLines] = useState<ExportProductLine[]>([
    {
      id: 'prod-1',
      product: '',
      unit: 'vials',
      directQuantity: '',
      grossQuantityOverride: '',
      batches: [{ id: 'batch-1', batch_number: '', quantity: '' }]
    }
  ]);

  // Optional Document Files
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
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedLicenceId) {
      loadLicenceContext(selectedLicenceId);
    } else {
      setObligations([]);
      setLicenceProducts([]);
    }
  }, [selectedLicenceId]);

  const loadInitialData = async () => {
    try {
      const [licencesData, exportsData, partyNamesData] = await Promise.all([
        api.getLicences(),
        api.getExports(),
        api.getPartyNames().catch(() => [])
      ]);
      setLicences(licencesData);
      setExistingExports(exportsData);
      setPartyOptions(partyNamesData);
      if (!selectedLicenceId && licencesData.length > 0) {
        setSelectedLicenceId(licencesData[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadLicenceContext = async (licenceId: string) => {
    try {
      const [obs, detail] = await Promise.all([
        api.getObligations(licenceId),
        api.getLicenceDetail(licenceId)
      ]);
      setObligations(obs);
      const prods = detail.products || [];
      setLicenceProducts(prods);

      // Default product name if first product line empty
      if (prods.length > 0 && (!productLines[0].product || productLines[0].product === '')) {
        setProductLines([
          {
            id: 'prod-1',
            product: prods[0].product_name,
            unit: prods[0].unit || 'vials',
            directQuantity: '',
            batches: [{ id: 'batch-1', batch_number: '', quantity: '' }]
          }
        ]);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Selected licence obligation metrics
  const selectedLicence = licences.find(l => l.id === selectedLicenceId);
  const totalLicenceObligation = obligations.reduce((sum, o) => sum + (o.required_quantity || 0), 0);
  const completedLicenceObligation = obligations.reduce((sum, o) => sum + (o.completed_quantity || 0), 0);
  const pendingLicenceObligation = Math.max(0, totalLicenceObligation - completedLicenceObligation);

  // Real-time Duplicate Checks
  const duplicateInvoice = useMemo(() => {
    const trimmed = invoiceNumber.trim().toLowerCase();
    if (!trimmed) return null;
    return existingExports.find(
      e => e.invoice_number && e.invoice_number.trim().toLowerCase() === trimmed
    );
  }, [invoiceNumber, existingExports]);

  const duplicateSb = useMemo(() => {
    const trimmed = shippingBillNumber.trim().toLowerCase();
    if (!trimmed) return null;
    return existingExports.find(
      e => e.shipping_bill_number && e.shipping_bill_number.trim().toLowerCase() === trimmed
    );
  }, [shippingBillNumber, existingExports]);

  // Product Line Operations
  const handleProductChange = (lineId: string, value: string) => {
    setProductLines(prev => prev.map(line => {
      if (line.id !== lineId) return line;
      const matchedProd = licenceProducts.find(p => p.product_name === value);
      return {
        ...line,
        product: value,
        unit: matchedProd?.unit || line.unit
      };
    }));
  };

  const handleUnitChange = (lineId: string, unit: string) => {
    setProductLines(prev => prev.map(line => line.id === lineId ? { ...line, unit } : line));
  };

  const handleDirectQuantityChange = (lineId: string, qty: string) => {
    setProductLines(prev => prev.map(line => line.id === lineId ? { ...line, directQuantity: qty } : line));
  };

  const handleGrossOverrideChange = (lineId: string, val: string) => {
    setProductLines(prev => prev.map(line => line.id === lineId ? { ...line, grossQuantityOverride: val } : line));
  };

  // Batch Operations per Product Line
  const handleBatchChange = (lineId: string, batchId: string, field: 'batch_number' | 'quantity', value: string) => {
    setProductLines(prev => prev.map(line => {
      if (line.id !== lineId) return line;
      const updatedBatches = line.batches.map(b => b.id === batchId ? { ...b, [field]: value } : b);
      return { ...line, batches: updatedBatches };
    }));
  };

  const addBatchToLine = (lineId: string) => {
    setProductLines(prev => prev.map(line => {
      if (line.id !== lineId) return line;
      return {
        ...line,
        batches: [
          ...line.batches,
          { id: `batch-${Date.now()}-${Math.random()}`, batch_number: '', quantity: '' }
        ]
      };
    }));
  };

  const removeBatchFromLine = (lineId: string, batchId: string) => {
    setProductLines(prev => prev.map(line => {
      if (line.id !== lineId) return line;
      if (line.batches.length <= 1) return line;
      return {
        ...line,
        batches: line.batches.filter(b => b.id !== batchId)
      };
    }));
  };

  const addProductLine = () => {
    const usedProds = new Set(productLines.map(l => l.product));
    const nextProd = licenceProducts.find(p => !usedProds.has(p.product_name)) || licenceProducts[0];
    setProductLines(prev => [
      ...prev,
      {
        id: `prod-${Date.now()}-${Math.random()}`,
        product: nextProd?.product_name || '',
        unit: nextProd?.unit || 'vials',
        directQuantity: '',
        grossQuantityOverride: '',
        batches: [{ id: `batch-${Date.now()}`, batch_number: '', quantity: '' }]
      }
    ]);
  };

  const removeProductLine = (lineId: string) => {
    if (productLines.length <= 1) return;
    setProductLines(prev => prev.filter(l => l.id !== lineId));
  };

  // Auto-calculated Line and Total Quantities (Net and Gross according to licence SION norms)
  const computedProductLines = useMemo(() => {
    return productLines.map(line => {
      const batchSum = line.batches.reduce((sum, b) => sum + (parseFloat(b.quantity) || 0), 0);
      const hasBatches = line.batches.some(b => b.batch_number.trim() !== '' && parseFloat(b.quantity) > 0);
      const netQty = hasBatches ? batchSum : (parseFloat(line.directQuantity) || 0);

      // Match with licence product to auto-derive gross quantity from permitted wastage or conversion
      const matchedProd = licenceProducts.find(
        p => p.product_name.toLowerCase().trim() === line.product.toLowerCase().trim()
      ) || licenceProducts[0];

      const wastage = matchedProd?.wastage_percentage || 0;
      let calculatedGross = netQty;
      if (wastage > 0 && wastage < 100) {
        calculatedGross = Math.round(netQty / (1 - wastage / 100));
      } else if (matchedProd?.gross_obligation_quantity && matchedProd?.net_obligation_quantity && matchedProd.net_obligation_quantity > 0) {
        calculatedGross = Math.round(netQty * (matchedProd.gross_obligation_quantity / matchedProd.net_obligation_quantity));
      }

      const grossQty = (line.grossQuantityOverride && line.grossQuantityOverride.trim() !== '')
        ? (parseFloat(line.grossQuantityOverride) || calculatedGross)
        : calculatedGross;

      return {
        ...line,
        netQty,
        grossQty,
        calculatedGross,
        wastage,
        matchedProd,
        effectiveQty: netQty,
        hasBatches
      };
    });
  }, [productLines, licenceProducts]);

  const grandTotalQuantity = useMemo(() => {
    return computedProductLines.reduce((sum, l) => sum + l.netQty, 0);
  }, [computedProductLines]);

  const grandTotalGrossQuantity = useMemo(() => {
    return computedProductLines.reduce((sum, l) => sum + l.grossQty, 0);
  }, [computedProductLines]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLicenceId || !invoiceNumber.trim() || !partyName.trim()) {
      setError('Please fill in Licence, Export Date, Invoice Number, and Party Name.');
      return;
    }

    if (duplicateInvoice) {
      setError(`Duplicate entry: Export Invoice Number "${invoiceNumber.trim()}" already exists in the database.`);
      return;
    }

    if (duplicateSb) {
      setError(`Duplicate entry: Shipping Bill Number "${shippingBillNumber.trim()}" already exists in the database.`);
      return;
    }

    if (grandTotalQuantity <= 0) {
      setError('Please provide valid export quantities or batch quantities (greater than 0).');
      return;
    }

    const validLines = computedProductLines.filter(l => l.product.trim() !== '' && l.effectiveQty > 0);
    if (validLines.length === 0) {
      setError('Please ensure each product line has a valid product name and quantity.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build items payload with batches and gross/net quantities
      const itemsPayload = validLines.map(line => {
        const validBatches = line.batches
          .filter(b => b.batch_number.trim() && parseFloat(b.quantity) > 0)
          .map(b => ({
            batch_number: b.batch_number.trim(),
            quantity: parseFloat(b.quantity)
          }));

        return {
          product: line.product.trim(),
          quantity: line.netQty,
          net_quantity: line.netQty,
          gross_quantity: line.grossQty,
          unit: line.unit,
          batches: validBatches.length > 0 ? validBatches : undefined
        };
      });

      // Flat list of all batches
      const allBatches = itemsPayload.flatMap(it => it.batches || []);

      const res = await api.createExport({
        licence_id: selectedLicenceId,
        obligation_id: selectedObligationId || undefined,
        export_date: exportDate,
        invoice_number: invoiceNumber.trim(),
        export_type: exportType,
        party_name: partyName.trim(),
        product: itemsPayload.map(it => `${it.product} (${formatNumber(it.quantity)} ${it.unit})`).join(', '),
        quantity: grandTotalQuantity,
        net_quantity: grandTotalQuantity,
        gross_quantity: grandTotalGrossQuantity,
        unit: validLines[0].unit,
        shipping_bill_number: shippingBillNumber ? shippingBillNumber.trim() : undefined,
        remarks: remarks.trim(),
        allow_excess: allowExcess,
        items: itemsPayload,
        batches: allBatches.length > 0 ? allBatches : undefined
      });

      const exportId = res.export?.id;
      if (exportId) {
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
        if (nocFile) await uploadHelper(nocFile, 'NOC');
      }

      // Only trigger auto DEEC modal preview if this is a Third-Party Export and user requested DEEC
      if (exportType === 'Third-Party Export' && generateDeec) {
        onSuccess(res.export);
      } else {
        onSuccess(undefined);
      }
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
    <div id="new-export-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div id="new-export-modal-container" className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Record Export Consignment</h3>
              <p className="text-xs text-slate-500">Multi-product shipment, internal batch tracking & obligation credit</p>
            </div>
          </div>
          <button
            id="close-export-modal-button"
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div id="export-modal-error-banner" className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
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

          {/* Section 1: Licence Selection (Obligations auto-calculated product-wise) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="block text-xs font-semibold text-slate-800">
              Advance Authorisation Licence <span className="text-rose-500">*</span>
            </label>
            <select
              id="export-licence-select"
              value={selectedLicenceId}
              onChange={(e) => setSelectedLicenceId(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none bg-white font-medium"
              required
            >
              <option value="">Select Licence</option>
              {licences.map(l => (
                <option key={l.id} value={l.id}>
                  {l.licence_number} (Exp: {l.export_validity_date})
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                Obligation details are auto-calculated product-wise based on licence SION norms. Gross and net quantities are automatically computed.
              </span>
            </div>
          </div>

          {/* Section 2: Export Type Selection */}
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
                  onChange={() => {
                    setExportType('Direct Export');
                    setGenerateDeec(false);
                  }}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-xs">Direct Export</div>
                  <div className="text-[10px] text-slate-500">Invoice, Shipping Bill & BRC</div>
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
                  onChange={() => {
                    setExportType('Third-Party Export');
                    setGenerateDeec(true);
                  }}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-xs">Third-Party Export</div>
                  <div className="text-[10px] text-slate-500">Merchant Exporter (DEEC Declaration applicable)</div>
                </div>
              </label>
            </div>
          </div>

          {/* Section 3: Shipment Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Export Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="export-date-input"
                type="date"
                value={exportDate}
                onChange={(e) => setExportDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                required
              />
            </div>

            {/* Export Invoice Number with real-time duplicate check */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Export Invoice Number <span className="text-rose-500">*</span>
              </label>
              <input
                id="export-invoice-number-input"
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. EXP/ICP/2025/124"
                className={`w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 outline-none uppercase font-mono transition-colors ${
                  duplicateInvoice 
                    ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-rose-500' 
                    : 'border-slate-300 focus:ring-emerald-600'
                }`}
                required
              />
              {duplicateInvoice && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  Invoice already exists in database (Party: {duplicateInvoice.party_name})
                </p>
              )}
            </div>

            {/* Shipping Bill Number: NOT MANDATORY, with duplicate check */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700">
                  Shipping Bill Number
                </label>
                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                  Optional
                </span>
              </div>
              <input
                id="export-shipping-bill-input"
                type="text"
                value={shippingBillNumber}
                onChange={(e) => setShippingBillNumber(e.target.value)}
                placeholder="e.g. SB/INNSA1/981240 (optional)"
                className={`w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 outline-none uppercase font-mono transition-colors ${
                  duplicateSb 
                    ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-rose-500' 
                    : 'border-slate-300 focus:ring-emerald-600'
                }`}
              />
              {duplicateSb && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  Shipping Bill already exists (Invoice: {duplicateSb.invoice_number})
                </p>
              )}
            </div>
          </div>

          {/* Party Name with Dropdown & Autocomplete */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Party / Buyer / Merchant Exporter Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="export-party-name-input"
                type="text"
                list="party-names-datalist"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="Select from previous parties or type a new party..."
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
                required
              />
              <datalist id="party-names-datalist">
                {partyOptions.map((pName, i) => (
                  <option key={i} value={pName} />
                ))}
              </datalist>
            </div>
            {partyOptions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="text-[10px] text-slate-400 font-medium">Recent Parties:</span>
                {partyOptions.slice(0, 5).map((pName, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPartyName(pName)}
                    className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-600 rounded transition-colors cursor-pointer"
                  >
                    {pName}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Multi-Product Lines with Internal Batch Numbers & Auto-Totaling */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-700" />
                  Export Product Lines & Internal Batch Numbers
                </h4>
                <p className="text-[11px] text-slate-500">
                  Specify exported products with batch-level breakdown. Quantities auto-total automatically.
                </p>
              </div>
              <button
                id="add-export-product-line-button"
                type="button"
                onClick={addProductLine}
                className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product Line</span>
              </button>
            </div>

            {computedProductLines.map((line, pIdx) => (
              <div
                key={line.id}
                id={`export-product-card-${pIdx}`}
                className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-semibold text-slate-800">
                    Product Line #{pIdx + 1}
                  </span>
                  {productLines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProductLine(line.id)}
                      className="text-slate-400 hover:text-rose-600 text-xs p-1 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Line</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  {/* Product Name */}
                  <div className="md:col-span-8">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Finished Product Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      list={`product-options-${line.id}`}
                      value={line.product}
                      onChange={(e) => handleProductChange(line.id, e.target.value)}
                      placeholder="e.g. Amoxicillin for Injection 500mg Vials"
                      className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 outline-none"
                      required
                    />
                    <datalist id={`product-options-${line.id}`}>
                      {licenceProducts.map((p, i) => (
                        <option key={i} value={p.product_name} />
                      ))}
                    </datalist>
                  </div>

                  {/* Unit */}
                  <div className="md:col-span-4">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={line.unit}
                      onChange={(e) => handleUnitChange(line.id, e.target.value)}
                      placeholder="e.g. vials, ampoules, kg"
                      className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Internal Batch Numbers Sub-Table */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700">
                      Internal Batch Numbers & Pack Quantities
                    </span>
                    <button
                      type="button"
                      onClick={() => addBatchToLine(line.id)}
                      className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Batch Number</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {line.batches.map((batch, bIdx) => (
                      <div key={batch.id} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-6">
                          <input
                            type="text"
                            value={batch.batch_number}
                            onChange={(e) => handleBatchChange(line.id, batch.id, 'batch_number', e.target.value)}
                            placeholder={`Batch #${bIdx + 1} (e.g. B-2501)`}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 bg-white rounded-md focus:ring-1 focus:ring-emerald-600 outline-none font-mono uppercase"
                          />
                        </div>
                        <div className="col-span-5">
                          <input
                            type="number"
                            step="any"
                            value={batch.quantity}
                            onChange={(e) => handleBatchChange(line.id, batch.id, 'quantity', e.target.value)}
                            placeholder="Batch quantity"
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 bg-white rounded-md focus:ring-1 focus:ring-emerald-600 outline-none font-mono"
                          />
                        </div>
                        <div className="col-span-1 text-center">
                          {line.batches.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeBatchFromLine(line.id, batch.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                              title="Remove batch"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Line Total Auto-Calculation Display: Net and Gross Obligation */}
                  <div className="pt-2 border-t border-slate-200/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 text-[11px] font-medium">
                        {line.hasBatches ? 'Total Net Quantity (sum of batches):' : 'Net Export Consignment Quantity:'}
                      </span>
                      {line.hasBatches ? (
                        <span className="font-mono font-bold text-emerald-800 text-sm">
                          {formatNumber(line.netQty)} {line.unit}
                        </span>
                      ) : (
                        <div className="w-36">
                          <input
                            type="number"
                            step="any"
                            value={line.directQuantity}
                            onChange={(e) => handleDirectQuantityChange(line.id, e.target.value)}
                            placeholder="Net quantity"
                            className="w-full text-xs px-2.5 py-1 border border-slate-300 bg-white rounded-md font-mono font-bold text-right outline-none focus:ring-1 focus:ring-emerald-600"
                          />
                        </div>
                      )}
                    </div>

                    {/* Gross Obligation Quantity Auto-Calculated from Licence */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-lg">
                      <div>
                        <span className="text-[11px] font-semibold text-emerald-950 block">
                          Gross Quantity Accounted in Licence
                        </span>
                        <span className="text-[10px] text-emerald-700">
                          {line.wastage > 0 
                            ? `Auto-computed: Net + ${line.wastage}% permitted manufacturing loss`
                            : 'Auto-added based on Master Licence product SION norms'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-900 text-sm">
                          {formatNumber(line.grossQty)} {line.unit}
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={line.grossQuantityOverride || ''}
                          onChange={(e) => handleGrossOverrideChange(line.id, e.target.value)}
                          placeholder="Override gross"
                          title="Optional manual override of gross quantity"
                          className="w-28 text-[11px] px-2 py-1 border border-slate-300 bg-white rounded-md font-mono text-right outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Grand Total Quantity Auto-Calculation Banner (Net & Gross) */}
            <div id="export-grand-total-banner" className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span className="font-semibold text-emerald-950">
                    Total Consignment Export Quantity (Auto-Calculated):
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 mr-2">Net Export:</span>
                  <span className="font-mono font-bold text-base text-emerald-800">
                    {formatNumber(grandTotalQuantity)} {productLines[0]?.unit || 'units'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-emerald-200/70 text-[11px]">
                <span className="text-emerald-800 font-medium">
                  Total Gross Obligation Accounted in Licence:
                </span>
                <span className="font-mono font-bold text-emerald-950 text-sm">
                  {formatNumber(grandTotalGrossQuantity)} {productLines[0]?.unit || 'units'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 5: Documents (All Optional as per user requirement) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                Export Documents (Optional - can be attached now or later)
              </span>
              <span className="text-[10px] text-slate-500">Supported: PDF, Images</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Shipping Bill Copy
                </label>
                <input
                  id="export-sb-file-input"
                  type="file"
                  accept=".pdf,.png,.jpg"
                  onChange={(e) => setShippingBillFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Export Invoice Copy
                </label>
                <input
                  id="export-invoice-file-input"
                  type="file"
                  accept=".pdf,.png,.jpg"
                  onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  BRC / e-BRC Bank Realisation
                </label>
                <input
                  id="export-brc-file-input"
                  type="file"
                  accept=".pdf,.png,.jpg"
                  onChange={(e) => setBrcFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300"
                />
              </div>

              {/* NOC: NOT MANDATORY */}
              <div className="p-2 bg-slate-100 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-slate-700">
                    NOC (No Objection Certificate)
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                </div>
                <input
                  id="export-noc-file-input"
                  type="file"
                  accept=".pdf,.png,.jpg"
                  onChange={(e) => setNocFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">
                  NOC comes in later and can be uploaded any time from the document center.
                </p>
              </div>
            </div>
          </div>

          {/* DEEC Declaration Auto-Creation Toggle (Strictly for Third-Party Merchant Exports) */}
          {exportType === 'Third-Party Export' && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between animate-in fade-in duration-150">
              <label className="flex items-center gap-3 cursor-pointer text-xs text-blue-950 font-medium">
                <input
                  id="export-generate-deec-checkbox"
                  type="checkbox"
                  checked={generateDeec}
                  onChange={(e) => setGenerateDeec(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <div>
                  <span className="font-semibold text-slate-900 block">
                    Auto-generate DEEC Export Declaration document
                  </span>
                  <span className="text-[11px] text-slate-600">
                    Statutory manufacturer declaration for Third-Party Merchant Export against Advance Authorisation.
                  </span>
                </div>
              </label>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded uppercase tracking-wider shrink-0">
                Third-Party Only
              </span>
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Remarks / Port of Loading / Notes
            </label>
            <textarea
              id="export-remarks-input"
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Cleared through Nhava Sheva (JNPT) sea terminal, container seal intact."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 outline-none"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50">
          <button
            id="cancel-export-button"
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="submit-export-button"
            type="button"
            onClick={handleSubmit}
            disabled={loading || !!duplicateInvoice || !!duplicateSb}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Recording Export...</span>
              </>
            ) : (
              <span>{exportType === 'Third-Party Export' && generateDeec ? 'Save Export & Generate DEEC' : 'Save Export & Credit Obligation'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
