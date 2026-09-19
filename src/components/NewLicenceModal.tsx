import React, { useState } from 'react';
import { api } from '../api/client.ts';
import { X, Plus, Trash2, Award, AlertCircle, FileUp } from 'lucide-react';

interface NewLicenceModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface ProductFormRow {
  product_name: string;
  product_type: string;
  approved_quantity: string;
  unit: string;
  wastage_percentage: string;
  gross_obligation_quantity: string;
  net_obligation_quantity: string;
  conversion_ratio: string;
  obligation_period_months: string;
}

export const NewLicenceModal: React.FC<NewLicenceModalProps> = ({ onClose, onSuccess }) => {
  const [licenceNumber, setLicenceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [showGrossObligation, setShowGrossObligation] = useState(true);
  
  // Default import validity: 12 months from issue
  const defaultImportVal = new Date();
  defaultImportVal.setMonth(defaultImportVal.getMonth() + 12);
  const [importValidity, setImportValidity] = useState(defaultImportVal.toISOString().split('T')[0]);

  // Default export validity: 18 months from issue
  const defaultExportVal = new Date();
  defaultExportVal.setMonth(defaultExportVal.getMonth() + 18);
  const [exportValidity, setExportValidity] = useState(defaultExportVal.toISOString().split('T')[0]);

  const [licenceFile, setLicenceFile] = useState<File | null>(null);

  const [products, setProducts] = useState<ProductFormRow[]>([
    {
      product_name: 'Amoxicillin Sodium Sterile USP/BP',
      product_type: 'Raw Material / API',
      approved_quantity: '1000',
      unit: 'kg',
      wastage_percentage: '2.0',
      gross_obligation_quantity: '7500000',
      net_obligation_quantity: '7350000',
      conversion_ratio: '7500',
      obligation_period_months: '18'
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddProduct = () => {
    setProducts([
      ...products,
      {
        product_name: '',
        product_type: 'Raw Material / API',
        approved_quantity: '',
        unit: 'kg',
        wastage_percentage: '2.0',
        gross_obligation_quantity: '',
        net_obligation_quantity: '',
        conversion_ratio: '1.0',
        obligation_period_months: '18'
      }
    ]);
  };

  const handleRemoveProduct = (index: number) => {
    if (products.length <= 1) {
      alert('A licence must contain at least one product line.');
      return;
    }
    setProducts(products.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, field: keyof ProductFormRow, value: string) => {
    const updated = [...products];
    updated[index] = { ...updated[index], [field]: value };

    const qty = parseFloat(field === 'approved_quantity' ? value : updated[index].approved_quantity) || 0;
    const ratio = parseFloat(field === 'conversion_ratio' ? value : updated[index].conversion_ratio) || 1;
    const wastage = parseFloat(field === 'wastage_percentage' ? value : updated[index].wastage_percentage) || 0;

    if (field === 'approved_quantity' || field === 'conversion_ratio') {
      if (qty > 0 && ratio > 0) {
        const gross = Math.round(qty * ratio);
        updated[index].gross_obligation_quantity = gross.toString();
        const net = Math.round(gross * (1 - wastage / 100));
        updated[index].net_obligation_quantity = net.toString();
      }
    } else if (field === 'gross_obligation_quantity') {
      const gross = parseFloat(value) || 0;
      if (gross > 0) {
        const net = Math.round(gross * (1 - wastage / 100));
        updated[index].net_obligation_quantity = net.toString();
        if (qty > 0) {
          updated[index].conversion_ratio = (gross / qty).toString();
        }
      }
    } else if (field === 'wastage_percentage') {
      const gross = parseFloat(updated[index].gross_obligation_quantity) || (qty * ratio);
      if (gross > 0) {
        const net = Math.round(gross * (1 - wastage / 100));
        updated[index].net_obligation_quantity = net.toString();
      }
    } else if (field === 'net_obligation_quantity') {
      const net = parseFloat(value) || 0;
      if (net > 0 && wastage < 100) {
        const gross = Math.round(net / (1 - wastage / 100));
        updated[index].gross_obligation_quantity = gross.toString();
        if (qty > 0) {
          updated[index].conversion_ratio = (gross / qty).toString();
        }
      }
    }

    setProducts(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenceNumber.trim()) {
      setError('Please enter a valid Licence Number.');
      return;
    }

    for (let i = 0; i < products.length; i++) {
      if (!products[i].product_name.trim()) {
        setError(`Please specify the Product Name for line #${i + 1}.`);
        return;
      }
      if (!products[i].approved_quantity || parseFloat(products[i].approved_quantity) <= 0) {
        setError(`Approved Quantity must be greater than 0 for line #${i + 1}.`);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const payloadProducts = products.map(p => ({
        product_name: p.product_name.trim(),
        product_type: p.product_type,
        approved_quantity: parseFloat(p.approved_quantity),
        unit: p.unit.trim(),
        wastage_percentage: parseFloat(p.wastage_percentage) || 0,
        gross_obligation_quantity: parseFloat(p.gross_obligation_quantity) || (parseFloat(p.approved_quantity) * (parseFloat(p.conversion_ratio) || 1)),
        net_obligation_quantity: parseFloat(p.net_obligation_quantity) || 0,
        conversion_ratio: parseFloat(p.conversion_ratio) || 1,
        obligation_period_months: parseInt(p.obligation_period_months) || 18
      }));

      const created = await api.createLicence({
        licence_number: licenceNumber.trim(),
        issue_date: issueDate,
        import_validity_date: importValidity,
        export_validity_date: exportValidity,
        products: payloadProducts
      });

      // If user provided a licence PDF file, upload it immediately
      if (licenceFile && created && created.id) {
        try {
          const formData = new FormData();
          formData.append('file', licenceFile);
          formData.append('document_type', 'Licence');
          formData.append('licence_id', created.id);
          formData.append('uploaded_by', 'DGFT Liaison Executive');
          await api.uploadDocument(formData);
        } catch (uploadErr) {
          console.warn('Licence PDF upload failed:', uploadErr);
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create licence.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Create Advance Authorisation Licence</h3>
              <p className="text-xs text-slate-500">Inject Care Master Compliance Record</p>
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section: Licence Header Info */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Licence Master Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Licence Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={licenceNumber}
                  onChange={(e) => setLicenceNumber(e.target.value)}
                  placeholder="e.g. AA/0310894521/2025"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 focus:border-teal-600 outline-none uppercase font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Issue Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 focus:border-teal-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Import Validity Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={importValidity}
                  onChange={(e) => setImportValidity(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 focus:border-teal-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Export Validity Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={exportValidity}
                  onChange={(e) => setExportValidity(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 focus:border-teal-600 outline-none"
                  required
                />
              </div>
            </div>

            {/* Upload PDF */}
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Attach Official Licence PDF (DGFT Copy)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setLicenceFile(e.target.files?.[0] || null)}
                  className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                {licenceFile && (
                  <span className="text-xs text-emerald-600 font-medium">✓ {licenceFile.name} ready</span>
                )}
              </div>
            </div>
          </div>

          {/* Section: Product Lines */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved Product Lines</h4>
                <p className="text-[11px] text-slate-400">Configure multiple raw materials, APIs, or packaging products approved under this licence.</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-md text-xs font-medium text-slate-700 cursor-pointer transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={showGrossObligation}
                    onChange={(e) => setShowGrossObligation(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Show Gross Obligation</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md text-xs font-medium transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Product Line</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {products.map((p, idx) => (
                <div key={idx} className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-xs font-semibold text-slate-700">Line #{idx + 1}</span>
                    {products.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(idx)}
                        className="text-rose-600 hover:text-rose-800 text-xs flex items-center gap-1 p-1 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Product Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={p.product_name}
                        onChange={(e) => handleProductChange(idx, 'product_name', e.target.value)}
                        placeholder="e.g. Amoxicillin Sterile Dry Powder"
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white outline-none focus:ring-1 focus:ring-teal-600"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Product Type
                      </label>
                      <select
                        value={p.product_type}
                        onChange={(e) => handleProductChange(idx, 'product_type', e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white outline-none focus:ring-1 focus:ring-teal-600"
                      >
                        <option value="Raw Material / API">Raw Material / API</option>
                        <option value="Packaging Material">Packaging Material</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Finished Product">Finished Product</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Unit
                      </label>
                      <select
                        value={p.unit}
                        onChange={(e) => handleProductChange(idx, 'unit', e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white outline-none focus:ring-1 focus:ring-teal-600"
                      >
                        <option value="kg">kg (Kilograms)</option>
                        <option value="vials">vials (Vials)</option>
                        <option value="ampoules">ampoules (Ampoules)</option>
                        <option value="MT">MT (Metric Ton)</option>
                        <option value="g">g (Grams)</option>
                        <option value="packs">packs (Packs)</option>
                      </select>
                    </div>
                  </div>

                  <div className={`grid grid-cols-2 ${showGrossObligation ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-3 pt-1`}>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Approved Quantity <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={p.approved_quantity}
                        onChange={(e) => handleProductChange(idx, 'approved_quantity', e.target.value)}
                        placeholder="e.g. 1000"
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white outline-none focus:ring-1 focus:ring-teal-600 font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Conversion Ratio
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={p.conversion_ratio}
                        onChange={(e) => handleProductChange(idx, 'conversion_ratio', e.target.value)}
                        placeholder="e.g. 7500"
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white outline-none focus:ring-1 focus:ring-teal-600 font-mono"
                      />
                    </div>

                    {showGrossObligation && (
                      <div className="bg-blue-50/60 p-1.5 rounded-lg border border-blue-200">
                        <label className="block text-[11px] font-semibold text-blue-800 mb-1">
                          Gross Obligation
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={p.gross_obligation_quantity}
                          onChange={(e) => handleProductChange(idx, 'gross_obligation_quantity', e.target.value)}
                          placeholder="Approved × Ratio"
                          className="w-full text-xs px-2 py-1 border border-blue-300 rounded bg-white outline-none focus:ring-1 focus:ring-blue-600 font-mono font-semibold text-blue-900"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Wastage %
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={p.wastage_percentage}
                        onChange={(e) => handleProductChange(idx, 'wastage_percentage', e.target.value)}
                        placeholder="e.g. 2.0"
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white outline-none focus:ring-1 focus:ring-teal-600 font-mono"
                      />
                    </div>

                    <div className="bg-emerald-50/60 p-1.5 rounded-lg border border-emerald-200">
                      <label className="block text-[11px] font-semibold text-emerald-800 mb-1">
                        Net Obligation Qty
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={p.net_obligation_quantity}
                        onChange={(e) => handleProductChange(idx, 'net_obligation_quantity', e.target.value)}
                        placeholder="Calculated"
                        className="w-full text-xs px-2 py-1 border border-emerald-300 rounded bg-white outline-none focus:ring-1 focus:ring-emerald-600 font-mono text-emerald-900 font-bold"
                      />
                    </div>
                  </div>

                  {showGrossObligation && p.gross_obligation_quantity && (
                    <div className="text-[11px] text-slate-600 bg-white px-3 py-1.5 rounded border border-slate-200 flex items-center justify-between">
                      <span className="font-mono text-slate-500">
                        Formula: Gross ({Number(p.gross_obligation_quantity).toLocaleString()}) - {p.wastage_percentage || 0}% wastage = Net Obligation: <strong className="text-emerald-700 font-bold">{Number(p.net_obligation_quantity || 0).toLocaleString()}</strong> {p.unit}
                      </span>
                      <span className="text-[10px] text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded">
                        SION Auto-Calculated
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
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
                <span>Saving to Database...</span>
              </>
            ) : (
              <span>Create Licence & Product Lines</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
