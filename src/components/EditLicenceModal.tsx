import React, { useState } from 'react';
import { Licence, LicenceProduct } from '../types/index.ts';
import { api } from '../api/client.ts';
import { X, Plus, Trash2, Edit3, AlertCircle, Save } from 'lucide-react';

interface EditLicenceModalProps {
  licence: Licence;
  adminPassword?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface EditProductFormRow {
  id?: string;
  product_name: string;
  product_type: string;
  approved_vials: string;
  approved_quantity: string;
  unit: string;
  wastage_quantity: string;
  wastage_percentage: string;
  net_obligation_quantity: string;
  content_per_vial_net: string;
  content_per_vial_gross: string;
  obligation_period_months: string;
}

export const EditLicenceModal: React.FC<EditLicenceModalProps> = ({
  licence,
  adminPassword,
  onClose,
  onSuccess
}) => {
  const [licenceNumber, setLicenceNumber] = useState(licence.licence_number);
  const [issueDate, setIssueDate] = useState(licence.issue_date);
  const [importValidity, setImportValidity] = useState(licence.import_validity_date);
  const [exportValidity, setExportValidity] = useState(licence.export_validity_date);
  const [status, setStatus] = useState(licence.status);
  const [password, setPassword] = useState(adminPassword || 'Injectcare@123');

  const initialProducts: EditProductFormRow[] = (licence.products && licence.products.length > 0)
    ? licence.products.map(p => {
        const vials = p.approved_vials || 0;
        const appKg = p.approved_quantity || 0;
        const netKg = p.net_obligation_quantity || 0;
        let netPv = p.net_content_per_vial?.toString() || '';
        let grossPv = p.gross_content_per_vial?.toString() || '';
        if (vials > 0 && !netPv && netKg > 0) {
          netPv = (netKg / vials).toFixed(7).replace(/\.?0+$/, '');
        }
        if (vials > 0 && !grossPv && appKg > 0) {
          grossPv = (appKg / vials).toFixed(7).replace(/\.?0+$/, '');
        }
        return {
          id: p.id,
          product_name: p.product_name,
          product_type: p.product_type,
          approved_vials: p.approved_vials ? p.approved_vials.toString() : '',
          approved_quantity: p.approved_quantity.toString(),
          unit: p.unit || 'kg',
          wastage_quantity: p.wastage_quantity ? p.wastage_quantity.toString() : '',
          wastage_percentage: p.wastage_percentage ? p.wastage_percentage.toString() : '5.00',
          net_obligation_quantity: p.net_obligation_quantity ? p.net_obligation_quantity.toString() : '',
          content_per_vial_net: netPv,
          content_per_vial_gross: grossPv,
          obligation_period_months: p.obligation_period_months ? p.obligation_period_months.toString() : '18'
        };
      })
    : [
        {
          product_name: '',
          product_type: 'Raw Material / API',
          approved_vials: '',
          approved_quantity: '',
          unit: 'kg',
          wastage_quantity: '',
          wastage_percentage: '5.00',
          net_obligation_quantity: '',
          content_per_vial_net: '',
          content_per_vial_gross: '',
          obligation_period_months: '18'
        }
      ];

  const [products, setProducts] = useState<EditProductFormRow[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddProduct = () => {
    setProducts([
      ...products,
      {
        product_name: '',
        product_type: 'Raw Material / API',
        approved_vials: '',
        approved_quantity: '',
        unit: 'kg',
        wastage_quantity: '',
        wastage_percentage: '5.00',
        net_obligation_quantity: '',
        content_per_vial_net: '',
        content_per_vial_gross: '',
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

  const handleProductChange = (index: number, field: keyof EditProductFormRow, value: string) => {
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
          const net = Math.max(0, appVal - wastVal);
          updated[index].net_obligation_quantity = Number.isInteger(net) ? net.toString() : parseFloat(net.toFixed(4)).toString();
          const pct = (wastVal / appVal) * 100;
          updated[index].wastage_percentage = Number.isInteger(pct) ? pct.toString() : parseFloat(pct.toFixed(2)).toString();
        } else if (!isNaN(netVal) && updated[index].net_obligation_quantity !== '') {
          const w = Math.max(0, appVal - netVal);
          updated[index].wastage_quantity = Number.isInteger(w) ? w.toString() : parseFloat(w.toFixed(4)).toString();
          const pct = (w / appVal) * 100;
          updated[index].wastage_percentage = Number.isInteger(pct) ? pct.toString() : parseFloat(pct.toFixed(2)).toString();
        } else if (!isNaN(pctVal) && updated[index].wastage_percentage !== '') {
          const w = (appVal * pctVal) / 100;
          updated[index].wastage_quantity = Number.isInteger(w) ? w.toString() : parseFloat(w.toFixed(4)).toString();
          const net = Math.max(0, appVal - w);
          updated[index].net_obligation_quantity = Number.isInteger(net) ? net.toString() : parseFloat(net.toFixed(4)).toString();
        }
      }
    } else if (field === 'wastage_quantity') {
      const wastVal = parseFloat(value);
      if (!isNaN(wastVal) && approved > 0) {
        const net = Math.max(0, approved - wastVal);
        updated[index].net_obligation_quantity = Number.isInteger(net) ? net.toString() : parseFloat(net.toFixed(4)).toString();
        const pct = (wastVal / approved) * 100;
        updated[index].wastage_percentage = Number.isInteger(pct) ? pct.toString() : parseFloat(pct.toFixed(2)).toString();
      } else if (value === '' && approved > 0) {
        updated[index].wastage_percentage = '';
      }
    } else if (field === 'net_obligation_quantity') {
      const netVal = parseFloat(value);
      if (!isNaN(netVal) && approved > 0) {
        const wastVal = Math.max(0, approved - netVal);
        updated[index].wastage_quantity = Number.isInteger(wastVal) ? wastVal.toString() : parseFloat(wastVal.toFixed(4)).toString();
        const pct = (wastVal / approved) * 100;
        updated[index].wastage_percentage = Number.isInteger(pct) ? pct.toString() : parseFloat(pct.toFixed(2)).toString();
      }
    } else if (field === 'wastage_percentage') {
      const pctVal = parseFloat(value);
      if (!isNaN(pctVal) && approved > 0) {
        const wastVal = (approved * pctVal) / 100;
        updated[index].wastage_quantity = Number.isInteger(wastVal) ? wastVal.toString() : parseFloat(wastVal.toFixed(4)).toString();
        const net = Math.max(0, approved - wastVal);
        updated[index].net_obligation_quantity = Number.isInteger(net) ? net.toString() : parseFloat(net.toFixed(4)).toString();
      }
    }

    // Auto-recalculate per-vial content
    const vials = parseFloat(updated[index].approved_vials) || 0;
    const currentApproved = parseFloat(updated[index].approved_quantity) || 0;
    const currentNet = parseFloat(updated[index].net_obligation_quantity) || 0;

    if (vials > 0) {
      if (currentNet > 0) {
        const netPv = currentNet / vials;
        updated[index].content_per_vial_net = netPv < 0.0001 ? netPv.toFixed(7).replace(/\.?0+$/, '') : netPv.toFixed(5).replace(/\.?0+$/, '');
      }
      if (currentApproved > 0) {
        const grossPv = currentApproved / vials;
        updated[index].content_per_vial_gross = grossPv < 0.0001 ? grossPv.toFixed(7).replace(/\.?0+$/, '') : grossPv.toFixed(5).replace(/\.?0+$/, '');
      }
    }

    setProducts(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenceNumber.trim()) {
      setError('Licence number cannot be empty.');
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

        const vials = parseFloat(p.approved_vials) || undefined;
        const netPv = parseFloat(p.content_per_vial_net) || (vials && net > 0 ? parseFloat((net / vials).toFixed(7)) : undefined);
        const grossPv = parseFloat(p.content_per_vial_gross) || (vials && approved > 0 ? parseFloat((approved / vials).toFixed(7)) : undefined);

        return {
          id: p.id,
          product_name: p.product_name.trim(),
          product_type: p.product_type as any,
          approved_quantity: approved,
          approved_vials: vials,
          net_content_per_vial: netPv,
          gross_content_per_vial: grossPv,
          unit: p.unit.trim(),
          wastage_percentage: parseFloat(wastagePct.toFixed(2)),
          wastage_quantity: wastQty > 0 ? wastQty : undefined,
          gross_obligation_quantity: approved,
          net_obligation_quantity: parseFloat(net.toFixed(2)),
          conversion_ratio: 1,
          obligation_period_months: parseInt(p.obligation_period_months) || 18
        };
      });

      await api.updateLicence(
        licence.id,
        {
          licence_number: licenceNumber.trim(),
          issue_date: issueDate,
          import_validity_date: importValidity,
          export_validity_date: exportValidity,
          status,
          products: payloadProducts
        },
        password
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update licence.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Edit Advance Authorisation Licence</h3>
              <p className="text-xs text-slate-500">Password Protected Admin Modification Gate</p>
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

          {/* Master Details */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Licence Master Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Licence Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={licenceNumber}
                  onChange={(e) => setLicenceNumber(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 outline-none uppercase font-mono"
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
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Import Validity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={importValidity}
                  onChange={(e) => setImportValidity(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Export Validity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={exportValidity}
                  onChange={(e) => setExportValidity(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 outline-none font-medium"
                >
                  <option value="Active">Active</option>
                  <option value="Expiring Soon">Expiring Soon</option>
                  <option value="Expired">Expired</option>
                  <option value="Fulfilled">Fulfilled</option>
                  <option value="Surrendered">Surrendered</option>
                </select>
              </div>
            </div>
          </div>

          {/* Product Lines */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved Product Lines</h4>
                <p className="text-[11px] text-slate-400">Modify approved raw materials, vials count, per-vial content, or wastage allowance.</p>
              </div>
              <button
                type="button"
                onClick={handleAddProduct}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md text-xs font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product Line</span>
              </button>
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
                        placeholder="e.g. Amoxicillin Sterile API"
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-1">
                    {/* Approved Quantity in Vials */}
                    <div className="bg-sky-50/50 p-2 rounded-lg border border-sky-200">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-sky-900">
                          Approved Vials
                        </label>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleProductChange(idx, 'approved_vials', '7500000')}
                            className="px-1 py-0.5 text-[9px] font-bold bg-sky-100 hover:bg-sky-200 text-sky-800 rounded border border-sky-300 cursor-pointer"
                            title="75 Lakhs (75,00,000 vials)"
                          >
                            75L
                          </button>
                          <button
                            type="button"
                            onClick={() => handleProductChange(idx, 'approved_vials', '5000000')}
                            className="px-1 py-0.5 text-[9px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                            title="50 Lakhs (50,00,000 vials)"
                          >
                            50L
                          </button>
                        </div>
                      </div>
                      <input
                        type="number"
                        step="any"
                        value={p.approved_vials}
                        onChange={(e) => handleProductChange(idx, 'approved_vials', e.target.value)}
                        placeholder="e.g. 7500000"
                        className="w-full text-xs px-2 py-1 border border-sky-300 rounded bg-white outline-none focus:ring-1 focus:ring-sky-600 font-mono font-semibold text-sky-950"
                      />
                      <span className="text-[10px] text-sky-700">Finished vials count</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Approved Qty <span className="text-rose-500">*</span> <span className="text-slate-400 font-normal">({p.unit || 'kg'})</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={p.approved_quantity}
                        onChange={(e) => handleProductChange(idx, 'approved_quantity', e.target.value)}
                        placeholder="e.g. 945"
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white outline-none focus:ring-1 focus:ring-teal-600 font-mono"
                        required
                      />
                      <span className="text-[10px] text-slate-400">Gross import approved</span>
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
                        placeholder="e.g. 45"
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white outline-none focus:ring-1 focus:ring-teal-600 font-mono"
                      />
                      <span className="text-[10px] text-slate-400">Wastage allowance</span>
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
                        placeholder="e.g. 900"
                        className="w-full text-xs px-2.5 py-1 border border-emerald-300 rounded bg-white outline-none focus:ring-1 focus:ring-emerald-600 font-mono font-bold text-emerald-900"
                      />
                      <span className="text-[10px] text-emerald-700">Net export commitment</span>
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
                        placeholder="e.g. 5.00"
                        className="w-full text-xs px-2.5 py-1 border border-slate-300 rounded bg-white outline-none focus:ring-1 focus:ring-teal-600 font-mono text-slate-800"
                      />
                      <span className="text-[10px] text-slate-500">Auto-calculated %</span>
                    </div>
                  </div>

                  {/* Per-Vial Content Formulation Card */}
                  {(parseFloat(p.approved_vials) > 0 || parseFloat(p.content_per_vial_net) > 0) && (
                    <div className="p-3 bg-sky-50/80 border border-sky-200 rounded-lg text-xs space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between text-[11px] font-bold text-sky-950 gap-2">
                        <span className="flex items-center gap-1.5">
                          <span>🧪 Content Per Vial Analysis:</span>
                          <span className="font-normal text-sky-700">
                            {parseFloat(p.approved_vials) > 0 ? `${Number(p.approved_vials).toLocaleString()} vials total` : ''}
                          </span>
                        </span>
                        <span className="text-[10px] font-mono text-sky-700 font-semibold bg-sky-100 px-2 py-0.5 rounded border border-sky-300">
                          Wastage Margin: {p.wastage_percentage || '0'}%
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                        <div className="bg-white p-2.5 rounded-lg border border-emerald-300 shadow-2xs flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider font-sans">
                              Net Export Content Per Vial:
                            </span>
                            <div className="font-bold text-emerald-700 text-sm mt-0.5">
                              {p.content_per_vial_net || '0.00012'} kg / vial
                            </div>
                          </div>
                          {parseFloat(p.content_per_vial_net) > 0 && (
                            <span className="text-[10px] text-slate-500 font-sans mt-0.5">
                              = {(parseFloat(p.content_per_vial_net) * 1000).toFixed(3)} g ({parseFloat((parseFloat(p.content_per_vial_net) * 1000000).toFixed(1))} mg) in finished vial
                            </span>
                          )}
                        </div>

                        <div className="bg-white p-2.5 rounded-lg border border-sky-300 shadow-2xs flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-semibold text-sky-800 uppercase tracking-wider font-sans">
                              Gross Import Content Per Vial (Before Wastage):
                            </span>
                            <div className="font-bold text-sky-900 text-sm mt-0.5">
                              {p.content_per_vial_gross || '0.000126'} kg / vial
                            </div>
                          </div>
                          {parseFloat(p.content_per_vial_gross) > 0 && (
                            <span className="text-[10px] text-slate-500 font-sans mt-0.5">
                              = {(parseFloat(p.content_per_vial_gross) * 1000).toFixed(3)} g ({parseFloat((parseFloat(p.content_per_vial_gross) * 1000000).toFixed(1))} mg) gross allocation
                            </span>
                          )}
                        </div>
                      </div>
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
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
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
                <span>Updating Licence...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Licence Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
