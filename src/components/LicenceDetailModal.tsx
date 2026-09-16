import React, { useState, useEffect } from 'react';
import { LicenceDetailResponse, api } from '../api/client.ts';
import { StatusBadge } from './StatusBadge.tsx';
import { DocumentChecklistBadge } from './DocumentChecklistBadge.tsx';
import { formatNumber } from '../utils/format.ts';
import { 
  X, 
  FileText, 
  Download, 
  Plus, 
  Calendar, 
  ArrowDownRight, 
  ArrowUpRight, 
  AlertCircle, 
  Package, 
  CheckCircle2, 
  ShieldCheck,
  Trash2,
  ExternalLink
} from 'lucide-react';

interface LicenceDetailModalProps {
  licenceId: string;
  onClose: () => void;
  onOpenNewImport: (licenceId: string) => void;
  onOpenNewExport: (licenceId: string) => void;
  onOpenUpload: (licenceId: string) => void;
  onViewDocument: (doc: any) => void;
  onRefreshParent: () => void;
}

export const LicenceDetailModal: React.FC<LicenceDetailModalProps> = ({
  licenceId,
  onClose,
  onOpenNewImport,
  onOpenNewExport,
  onOpenUpload,
  onViewDocument,
  onRefreshParent
}) => {
  const [data, setData] = useState<LicenceDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'imports' | 'obligations' | 'exports' | 'documents'>('overview');

  useEffect(() => {
    loadDetails();
  }, [licenceId]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const res = await api.getLicenceDetail(licenceId);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load licence details');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImport = async (importId: string) => {
    if (!confirm('Are you sure you want to delete this import?')) return;
    try {
      await api.deleteImport(importId);
      loadDetails();
      onRefreshParent();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteExport = async (exportId: string) => {
    if (!confirm('Are you sure you want to delete this export shipment?')) return;
    try {
      await api.deleteExport(exportId);
      loadDetails();
      onRefreshParent();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-xl p-8 max-w-sm w-full text-center space-y-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-600 font-medium">Loading Advance Authorisation Master Record...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-xl p-6 max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">{error || 'Licence not found'}</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-medium rounded-lg">Close</button>
        </div>
      </div>
    );
  }

  const { licence, metrics, products, imports, obligations, exports, documents, missing_documents } = data;
  const licenceDoc = documents.find(d => d.document_type === 'Licence');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight font-mono">{licence.licence_number}</h2>
                <StatusBadge status={licence.status} />
                {metrics.is_import_expired && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-rose-100 text-rose-800 rounded-full">
                    Import Expired
                  </span>
                )}
                {metrics.is_export_expired && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-rose-100 text-rose-800 rounded-full">
                    Export Expired
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Inject Care Parenterals Pvt. Ltd. | Advance Authorisation Master Record
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {licenceDoc ? (
              <button
                type="button"
                onClick={() => onViewDocument(licenceDoc)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Licence PDF</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenUpload(licence.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Upload Licence PDF</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenNewImport(licence.id)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Record Import</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenNewExport(licence.id)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Record Export</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 bg-white border-b border-slate-200 flex gap-6 text-xs font-medium text-slate-500">
          {[
            { id: 'overview', label: 'Master Overview' },
            { id: 'imports', label: `Imports (${imports.length})` },
            { id: 'obligations', label: `Export Obligations (${obligations.length})` },
            { id: 'exports', label: `Exports (${exports.length})` },
            { id: 'documents', label: `Documents (${documents.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* 1. KPI Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-start text-slate-500 text-xs font-medium">
                    <span>Approved Qty</span>
                    <Package className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="mt-2 text-xl font-bold text-slate-900 font-mono">
                    {formatNumber(metrics?.total_approved_quantity)}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Imported: <span className="font-semibold text-slate-700 font-mono">{formatNumber(metrics?.total_imported_quantity)}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div 
                      className="bg-sky-600 h-1.5 rounded-full" 
                      style={{ width: `${Math.min(100, metrics?.overall_licence_utilization_percent || 0)}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                    <span>Utilization</span>
                    <span className="font-semibold text-sky-700">{metrics?.overall_licence_utilization_percent || 0}%</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-start text-slate-500 text-xs font-medium">
                    <span>Remaining Import</span>
                    <ArrowDownRight className="w-4 h-4 text-sky-500" />
                  </div>
                  <div className="mt-2 text-xl font-bold text-sky-700 font-mono">
                    {formatNumber(metrics?.remaining_import_quantity)}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Import Validity: <span className="font-semibold text-slate-700">{licence.import_validity_date}</span>
                  </div>
                  <div className="mt-3 text-[11px]">
                    <span className={`inline-flex items-center gap-1 font-medium ${(metrics?.days_to_import_expiry ?? 0) < 30 ? 'text-rose-600' : 'text-slate-600'}`}>
                      <Calendar className="w-3.5 h-3.5" />
                      {(metrics?.days_to_import_expiry ?? 0) < 0 
                        ? `Expired ${Math.abs(metrics?.days_to_import_expiry ?? 0)} days ago` 
                        : `${metrics?.days_to_import_expiry ?? 0} days left for import`}
                    </span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-start text-slate-500 text-xs font-medium">
                    <span>Export Obligation</span>
                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="mt-2 text-xl font-bold text-slate-900 font-mono">
                    {formatNumber(metrics?.total_export_obligation_created)}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Fulfilled: <span className="font-semibold text-emerald-700 font-mono">{formatNumber(metrics?.total_obligation_fulfilled)}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-1.5 rounded-full" 
                      style={{ width: `${Math.min(100, metrics?.obligation_fulfillment_percent || 0)}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                    <span>Fulfillment</span>
                    <span className="font-semibold text-emerald-700">{metrics?.obligation_fulfillment_percent || 0}%</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-start text-slate-500 text-xs font-medium">
                    <span>Pending Obligation</span>
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="mt-2 text-xl font-bold text-amber-700 font-mono">
                    {formatNumber(metrics?.pending_obligation)}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Export Validity: <span className="font-semibold text-slate-700">{licence.export_validity_date}</span>
                  </div>
                  <div className="mt-3 text-[11px]">
                    <span className={`inline-flex items-center gap-1 font-medium ${(metrics?.days_to_export_expiry ?? 0) < 60 ? 'text-rose-600' : 'text-slate-600'}`}>
                      <Calendar className="w-3.5 h-3.5" />
                      {(metrics?.days_to_export_expiry ?? 0) < 0 
                        ? `Expired ${Math.abs(metrics?.days_to_export_expiry ?? 0)} days ago` 
                        : `${metrics?.days_to_export_expiry ?? 0} days left for export`}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Products Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                  <h3 className="font-semibold text-xs text-slate-800 uppercase tracking-wider">
                    Licence Product Lines & Norms ({products.length})
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">SION Norms / Wastage Allowances</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100/75 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-2.5">Product Name</th>
                        <th className="px-4 py-2.5">Type</th>
                        <th className="px-4 py-2.5 text-right">Approved Qty</th>
                        <th className="px-4 py-2.5">Unit</th>
                        <th className="px-4 py-2.5 text-right">Wastage %</th>
                        <th className="px-4 py-2.5 text-right">Conversion Ratio</th>
                        <th className="px-4 py-2.5 text-right">Net Obligation Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {products.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3 font-semibold text-slate-900">{p.product_name}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium">
                              {p.product_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium">{formatNumber(p.approved_quantity)}</td>
                          <td className="px-4 py-3 font-mono">{p.unit}</td>
                          <td className="px-4 py-3 text-right font-mono">{p.wastage_percentage}%</td>
                          <td className="px-4 py-3 text-right font-mono">1 : {p.conversion_ratio}</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-teal-800">
                            {formatNumber(p.net_obligation_quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Missing Documents Warning Section */}
              {missing_documents.length > 0 && (
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center justify-between pb-2 border-b border-amber-200/70">
                    <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>Attention: {missing_documents.length} Compliance Document{missing_documents.length > 1 ? 's' : ''} Pending</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenUpload(licence.id)}
                      className="text-xs text-amber-800 underline font-medium hover:text-amber-900"
                    >
                      Upload Missing Files
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-3">
                    {missing_documents.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-200/70 text-xs">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-rose-700">{item.missing_document}</span>
                          <p className="text-[11px] text-slate-500">{item.party_or_supplier} ({item.invoice_number})</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800">
                            {item.days_pending} days pending
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'imports' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h3 className="font-semibold text-xs text-slate-800 uppercase tracking-wider">
                  Imports against this Licence ({imports.length})
                </h3>
                <button
                  type="button"
                  onClick={() => onOpenNewImport(licence.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-lg text-xs font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Import</span>
                </button>
              </div>

              {imports.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">No import consignments recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100/75 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Invoice #</th>
                        <th className="px-4 py-2.5">BOE #</th>
                        <th className="px-4 py-2.5">Supplier</th>
                        <th className="px-4 py-2.5 text-right">Quantity</th>
                        <th className="px-4 py-2.5">Checklist</th>
                        <th className="px-4 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {imports.map(imp => (
                        <tr key={imp.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3 font-mono">{imp.import_date}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900 font-mono">{imp.invoice_number}</td>
                          <td className="px-4 py-3 font-mono text-sky-800 font-medium">{imp.bill_of_entry_number}</td>
                          <td className="px-4 py-3 truncate max-w-xs">{imp.supplier}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                            {formatNumber(imp.quantity)} {imp.unit}
                          </td>
                          <td className="px-4 py-3">
                            <DocumentChecklistBadge
                              checklist={imp.checklist}
                              onOpenUpload={() => onOpenUpload(licence.id)}
                              onViewDocuments={() => {
                                if (imp.documents && imp.documents.length > 0) {
                                  onViewDocument(imp.documents[0]);
                                } else {
                                  onOpenUpload(licence.id);
                                }
                              }}
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteImport(imp.id)}
                              className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50"
                              title="Delete Import"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'obligations' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h3 className="font-semibold text-xs text-slate-800 uppercase tracking-wider">
                  Export Obligations Ledger ({obligations.length})
                </h3>
                <span className="text-[11px] text-slate-500">Automatically derived from imports</span>
              </div>

              {obligations.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">No export obligations recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100/75 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-2.5">Import Invoice</th>
                        <th className="px-4 py-2.5">Import Date</th>
                        <th className="px-4 py-2.5 text-right">Required Export</th>
                        <th className="px-4 py-2.5 text-right">Completed</th>
                        <th className="px-4 py-2.5 text-right">Balance</th>
                        <th className="px-4 py-2.5">Due Date</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {obligations.map(ob => (
                        <tr key={ob.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3 font-semibold font-mono text-slate-900">{ob.import_invoice_number}</td>
                          <td className="px-4 py-3 font-mono">{ob.import_date}</td>
                          <td className="px-4 py-3 text-right font-mono font-medium">{formatNumber(ob.required_quantity)}</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700">{formatNumber(ob.completed_quantity)}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-amber-800">{formatNumber(ob.pending_quantity)}</td>
                          <td className="px-4 py-3 font-mono">
                            <div>{ob.due_date}</div>
                            <div className={`text-[10px] font-medium ${(ob.days_remaining ?? 0) < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                              {(ob.days_remaining ?? 0) < 0 
                                ? `${Math.abs(ob.days_remaining ?? 0)} days overdue` 
                                : `${ob.days_remaining} days remaining`}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={ob.status} size="sm" />
                          </td>
                          <td className="px-4 py-3 text-right">
                            {ob.pending_quantity > 0 && (
                              <button
                                type="button"
                                onClick={() => onOpenNewExport(licence.id)}
                                className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded text-[11px] font-medium transition-colors"
                              >
                                Fulfill via Export
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'exports' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h3 className="font-semibold text-xs text-slate-800 uppercase tracking-wider">
                  Export Shipments against this Licence ({exports.length})
                </h3>
                <button
                  type="button"
                  onClick={() => onOpenNewExport(licence.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Export</span>
                </button>
              </div>

              {exports.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">No export shipments recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100/75 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Invoice #</th>
                        <th className="px-4 py-2.5">Shipping Bill #</th>
                        <th className="px-4 py-2.5">Type</th>
                        <th className="px-4 py-2.5">Buyer / Party</th>
                        <th className="px-4 py-2.5 text-right">Quantity</th>
                        <th className="px-4 py-2.5">Checklist</th>
                        <th className="px-4 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {exports.map(exp => (
                        <tr key={exp.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3 font-mono">{exp.export_date}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900 font-mono">{exp.invoice_number}</td>
                          <td className="px-4 py-3 font-mono text-emerald-800 font-medium">{exp.shipping_bill_number}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              exp.export_type === 'Third-Party Export' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {exp.export_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 truncate max-w-xs font-medium">{exp.party_name}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                            {formatNumber(exp.quantity)} {exp.unit}
                          </td>
                          <td className="px-4 py-3">
                            <DocumentChecklistBadge
                              checklist={exp.checklist}
                              onOpenUpload={() => onOpenUpload(licence.id)}
                              onViewDocuments={() => {
                                if (exp.documents && exp.documents.length > 0) {
                                  onViewDocument(exp.documents[0]);
                                } else {
                                  onOpenUpload(licence.id);
                                }
                              }}
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteExport(exp.id)}
                              className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50"
                              title="Delete Export"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h3 className="font-semibold text-xs text-slate-800 uppercase tracking-wider">
                  Documents Stored for Licence ({documents.length})
                </h3>
                <button
                  type="button"
                  onClick={() => onOpenUpload(licence.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 rounded-lg text-xs font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload Document</span>
                </button>
              </div>

              {documents.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">No documents uploaded for this licence yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100/75 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-2.5">Document Type</th>
                        <th className="px-4 py-2.5">File Name</th>
                        <th className="px-4 py-2.5">Uploaded Date</th>
                        <th className="px-4 py-2.5">Uploaded By</th>
                        <th className="px-4 py-2.5 text-right">Size</th>
                        <th className="px-4 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {documents.map(doc => (
                        <tr key={doc.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3 font-semibold text-slate-900">
                            <span className="inline-flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-teal-600" />
                              {doc.document_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-700 truncate max-w-sm">{doc.file_name}</td>
                          <td className="px-4 py-3">{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3">{doc.uploaded_by}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-500">
                            {(doc.file_size / 1024).toFixed(1)} KB
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => onViewDocument(doc)}
                              className="px-2 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 rounded text-[11px] font-medium transition-colors"
                            >
                              Preview PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex justify-between items-center text-xs text-slate-500">
          <div>
            Record ID: <span className="font-mono text-slate-600">{licence.id}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
          >
            Close Master View
          </button>
        </div>
      </div>
    </div>
  );
};
