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
  wastage_quantity: string;
  wastage_percentage: string;
  net_obligation_quantity: string;
  obligation_period_months: string;
}

export const NewLicenceModal: React.FC<NewLicenceModalProps> = ({ onClose, onSuccess }) => {
  const [licenceNumber, setLicenceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  
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
      product_name: '',
      product_type: 'Raw Material / API',
      approved_quantity: '',
      unit: 'kg',
      wastage_quantity: '',
      wastage_percentage: '',
      net_obligation_quantity: '',
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
        wastage_quantity: '',
        wastage_percentage: '',
        net_obligation_quantity: '',
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

    const approved = parseFloat(field === 'approved_quantity' ? value : updated[index].approved_quantity) || 0;

    if (field === 'approved_quantity') {
      const appVal = parseFloat(value) || 0;
      const wastVal = parseFloat(updated[index].wastage_quantity);
      const netVal = parseFloat(updated[index].net_obligation_quantity);
      const pctVal = parseFloat(updated[index].wastage_percentage);

      if (appVal > 0) {
        if (!isNaN(wastVal) && updated[index].wastage_quantity !== '') {
          // If wastage in kg is present, calculate net and percentage
          const net = Math.max(0, appVal - wastVal);
          updated[index].net_obligation_quantity = Number.isInteger(net) ? net.toString() : parseFloat(net.toFixed(4)).toString();
          const pct = (wastVal / appVal) * 100;
          updated[index].wastage_percentage = Number.isInteger(pct) ? pct.toString() : parseFloat(pct.toFixed(2)).toString();
        } else if (!isNaN(netVal) && updated[index].net_obligation_quantity !== '') {
          // If net is present, calculate wastage in kg and percentage
          const w = Math.max(0, appVal - netVal);
          updated[index].wastage_quantity = Number.isInteger(w) ? w.toString() : parseFloat(w.toFixed(4)).toString();
          const pct = (w / appVal) * 100;
          updated[index].wastage_percentage = Number.isInteger(pct) ? pct.toString() : parseFloat(pct.toFixed(2)).toString();
        } else if (!isNaN(pctVal) && updated[index].wastage_percentage !== '') {
          // If % is present, calculate wastage in kg and net
          const w = (appVal * pctVal) / 100;
          updated[index].wastage_quantity = Number.isInteger(w) ? w.toString() : parseFloat(w.toFixed(4)).toString();
          const net = Math.max(0, appVal - w);
          updated[index].net_obligation_quantity = Number.isInteger(net) ? net.toString() : parseFloat(net.toFixed(4)).toString();
        }
      }
    } else if (field === 'wastage_quantity') {
      const wastVal = parseFloat(value);
      if (!isNaN(wastVal) && approved > 0) {
        // Calculate net: approved - wastage
        const net = Math.max(0, approved - wastVal);
        updated[index].net_obligation_quantity = Number.isInteger(net) ? net.toString() : parseFloat(net.toFixed(4)).toString();
        // Calculate percentage: (wastage / approved) * 100
        const pct = (wastVal / approved) * 100;
        updated[index].wastage_percentage = Number.isInteger(pct) ? pct.toString() : parseFloat(pct.toFixed(2)).toString();
      } else if (value === '' && approved > 0) {
        updated[index].wastage_percentage = '';
      }
    } else if (field === 'net_obligation_quantity') {
      const netVal = parseFloat(value);
      if (!isNaN(netVal) && approved > 0) {
        // Calculate wastage in kg: approved - net
        const wastVal = Math.max(0, approved - netVal);
        updated[index].wastage_quantity = Number.isInteger(wastVal) ? wastVal.toString() : parseFloat(wastVal.toFixed(4)).toString();
        // Calculate percentage: (wastage / approved) * 100
        const pct = (wastVal / approved) * 100;
        updated[index].wastage_percentage = Number.isInteger(pct) ? pct.toString() : parseFloat(pct.toFixed(2)).toString();
      }
    } else if (field === 'wastage_percentage') {
      const pctVal = parseFloat(value);
      if (!isNaN(pctVal) && approved > 0) {
        // Calculate wastage in kg: approved * (pct / 100)
        const wastVal = (approved * pctVal) / 100;
        updated[index].wastage_quantity = Number.isInteger(wastVal) ? wastVal.toString() : parseFloat(wastVal.toFixed(4)).toString();
        // Calculate net: approved - wastage
        const net = Math.max(0, approved - wastVal);
        updated[index].net_obligation_quantity = Number.isInteger(net) ? net.toString() : parseFloat(net.toFixed(4)).toString();
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
      const payloadProducts = products.map(p => {
        const approved = parseFloat(p.approved_quantity) || 0;
        const wastQty = parseFloat(p.wastage_quantity) || 0;
        const net = parseFloat(p.net_obligation_quantity) || Math.max(0, approved - wastQty);
        let wastagePct = parseFloat(p.wastage_percentage);
        if (isNaN(wastagePct)) {
          wastagePct = approved > 0 ? (wastQty / approved) * 100 : 0;
        }

        return {
          product_name: p.product_name.trim(),
          product_type: p.product_type as any,
          approved_quantity: approved,
          unit: p.unit.trim(),
          wastage_percentage: parseFloat(wastagePct.toFixed(2)),
          gross_obligation_quantity: approved,
          net_obligation_quantity: parseFloat(net.toFixed(2)),
          conversion_ratio: 1,
          obligation_period_months: parseInt(p.obligation_period_months) || 18
        };
      });

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
                        className="text-rose-600 hover:text-rose-800 text-xs flex items-center gap-1 p-1 hover:bg-rose-50 rounded cursor-pointer"
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Approved Quantity <span className="text-rose-500">*</span> <span className="text-slate-400 font-normal">({p.unit || 'kg'})</span>
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
                      <span className="text-[10px] text-slate-400">Total approved import</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Wastage in Licence <span className="text-slate-400 font-normal">({p.unit || 'kg'})</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={p.wastage_quantity}
                        onChange={(e) => handleProductChange(idx, 'wastage_quantity', e.target.value)}
                        placeholder="e.g. 20"
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white outline-none focus:ring-1 focus:ring-teal-600 font-mono"
                      />
                      <span className="text-[10px] text-slate-400">Wastage given in licence</span>
                    </div>

                    <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-200">
                      <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                        Net Quantity <span className="text-emerald-700 font-normal">({p.unit || 'kg'})</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={p.net_obligation_quantity}
                        onChange={(e) => handleProductChange(idx, 'net_obligation_quantity', e.target.value)}
                        placeholder="e.g. 980"
                        className="w-full text-xs px-2.5 py-1 border border-emerald-300 rounded bg-white outline-none focus:ring-1 focus:ring-emerald-600 font-mono font-bold text-emerald-900"
                      />
                      <span className="text-[10px] text-emerald-700">Net obligation quantity</span>
                    </div>

                    <div className="bg-slate-100/70 p-2 rounded-lg border border-slate-200">
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Wastage % <span className="text-slate-400 text-[10px] font-normal">(Auto)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={p.wastage_percentage}
                        onChange={(e) => handleProductChange(idx, 'wastage_percentage', e.target.value)}
                        placeholder="e.g. 2.00"
                        className="w-full text-xs px-2.5 py-1 border border-slate-300 rounded bg-white outline-none focus:ring-1 focus:ring-teal-600 font-mono text-slate-800"
                      />
                      <span className="text-[10px] text-slate-500">Auto-calculated %</span>
                    </div>
                  </div>
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
