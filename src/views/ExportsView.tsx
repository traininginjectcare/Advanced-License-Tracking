import React, { useState, useEffect } from 'react';
import { ExportRecord, TransactionDocumentChecklist } from '../types/index.ts';
import { api } from '../api/client.ts';
import { DocumentChecklistBadge } from '../components/DocumentChecklistBadge.tsx';
import { AdminDeleteConfirmModal } from '../components/AdminDeleteConfirmModal.tsx';
import { formatNumber } from '../utils/format.ts';
import { 
  ArrowUpRight, 
  Search, 
  Plus, 
  Trash2, 
  FileText,
  ExternalLink,
  X,
  Building2
} from 'lucide-react';

interface ExportsViewProps {
  initialSearch?: string;
  onClearInitialSearch?: () => void;
  onOpenNewExport: () => void;
  onOpenLicence: (id: string) => void;
  onOpenUpload: (licenceId?: string, importId?: string, exportId?: string, docType?: any) => void;
  onViewDocument: (doc: any) => void;
  onOpenDeecDeclaration?: (exportRecord: ExportRecord) => void;
}

export const ExportsView: React.FC<ExportsViewProps> = ({
  initialSearch = '',
  onClearInitialSearch,
  onOpenNewExport,
  onOpenLicence,
  onOpenUpload,
  onViewDocument,
  onOpenDeecDeclaration
}) => {
  const [exports, setExports] = useState<(ExportRecord & { checklist: TransactionDocumentChecklist })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [typeFilter, setTypeFilter] = useState('All');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; invoice: string; licence_number?: string } | null>(null);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getExports();
      setExports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = exports.filter(e => {
    const q = search.toLowerCase();
    const matchesSearch = 
      (e.licence_number && e.licence_number.toLowerCase().includes(q)) ||
      e.invoice_number.toLowerCase().includes(q) ||
      (e.shipping_bill_number && e.shipping_bill_number.toLowerCase().includes(q)) ||
      e.party_name.toLowerCase().includes(q) ||
      e.product.toLowerCase().includes(q);

    const matchesType = typeFilter === 'All' || e.export_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Exports & Shipping Bill Register</h2>
          <p className="text-xs text-slate-500">
            Export shipments fulfilling Advance Authorisation obligations (Direct Exports & Third-Party Merchant Exports).
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenNewExport}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record Export Shipment</span>
        </button>
      </div>

      {/* Party Filter Banner if navigated from Party Follow-up */}
      {search && (
        <div className="flex items-center justify-between px-3.5 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-slate-600">Showing shipments matching:</span>
            <span className="font-bold bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-900 font-mono">{search}</span>
            <span className="text-slate-500 font-medium">({filtered.length} shipment{filtered.length === 1 ? '' : 's'} found)</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              onClearInitialSearch?.();
            }}
            className="text-blue-700 hover:text-blue-900 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Show All Shipments</span>
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Licence #, Invoice #, Shipping Bill #, Party, or Product..."
            className="w-full text-xs pl-9 pr-8 py-2 border border-slate-200 rounded-md outline-none focus:border-blue-500 font-mono"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                onClearInitialSearch?.();
              }}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Export Type:</span>
          {['All', 'Direct Export', 'Third-Party Export'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                typeFilter === t
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading export register...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No export shipments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-white border-b border-slate-200 text-slate-400 uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-sky-900 bg-sky-50/50">Licence Number</th>
                  <th className="px-4 py-3">Export Date</th>
                  <th className="px-4 py-3">Invoice Number</th>
                  <th className="px-4 py-3">Shipping Bill #</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Buyer / Party</th>
                  <th className="px-4 py-3">Finished Product & Batches</th>
                  <th className="px-4 py-3 text-right">Quantity (Kg / Vials)</th>
                  <th className="px-4 py-3 text-right">Value (USD / INR)</th>
                  <th className="px-4 py-3">Compliance Checklist</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-sky-900 bg-sky-50/20">
                      <button
                        type="button"
                        onClick={() => onOpenLicence(exp.licence_id)}
                        className="hover:underline flex items-center gap-1 cursor-pointer"
                        title="View Licence Details"
                      >
                        <span>{exp.licence_number || 'Licence'}</span>
                        <ExternalLink className="w-3 h-3 text-sky-600 inline" />
                      </button>
                    </td>
                    <td className="px-4 py-3.5 font-mono">{exp.export_date}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 font-mono">
                      {exp.invoice_number}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-medium">
                      {exp.shipping_bill_number ? (
                        <span className="text-blue-600">{exp.shipping_bill_number}</span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Pending / Not added</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        exp.export_type === 'Third-Party Export' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {exp.export_type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 max-w-xs truncate font-medium">
                      {exp.party_name}
                    </td>
                    <td className="px-4 py-3.5 max-w-md text-slate-700">
                      <div className="font-semibold text-slate-900" title={exp.product}>{exp.product}</div>
                      {exp.batches && exp.batches.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {exp.batches.map((b, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded text-[10px] font-mono">
                              <strong>{b.batch_number}:</strong>{' '}
                              {b.quantity_kg !== undefined && b.quantity_kg !== null ? `${formatNumber(b.quantity_kg, '0', 3)} kg` : ''}
                              {b.quantity_kg !== undefined && b.quantity_vials !== undefined ? ' | ' : ''}
                              {b.quantity_vials !== undefined && b.quantity_vials !== null ? `${formatNumber(b.quantity_vials, '0', 0)} vials` : ''}
                              {b.quantity_kg === undefined && b.quantity_vials === undefined ? `${formatNumber(b.quantity, '0', 3)} units` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-900">
                      {exp.quantity_kg !== undefined && exp.quantity_kg !== null ? (
                        <div className="font-bold text-slate-900">
                          {formatNumber(exp.quantity_kg, '0', 3)} kg
                        </div>
                      ) : null}
                      {exp.quantity_vials !== undefined && exp.quantity_vials !== null ? (
                        <div className="text-[11px] font-semibold text-sky-700">
                          {formatNumber(exp.quantity_vials, '0', 0)} vials
                        </div>
                      ) : null}
                      {exp.quantity_kg === undefined && exp.quantity_vials === undefined && (
                        <span className="font-bold">{formatNumber(exp.quantity, '0', 3)} {exp.unit}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-800">
                      {exp.total_value_usd !== undefined && exp.total_value_usd !== null ? (
                        <div className="font-semibold text-emerald-700">
                          $ {formatNumber(exp.total_value_usd, '0', 2)}
                        </div>
                      ) : null}
                      {exp.total_value_inr !== undefined && exp.total_value_inr !== null ? (
                        <div className="text-[11px] text-slate-500">
                          ₹ {formatNumber(exp.total_value_inr, '0', 2)}
                        </div>
                      ) : null}
                      {exp.total_value_usd === undefined && exp.total_value_inr === undefined && (
                        <span className="text-slate-400 italic text-[11px]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <DocumentChecklistBadge
                        checklist={exp.checklist}
                        onOpenUpload={() => onOpenUpload(exp.licence_id, undefined, exp.id)}
                        onViewDocuments={() => {
                          if (exp.documents && exp.documents.length > 0) {
                            onViewDocument(exp.documents[0]);
                          } else {
                            onOpenUpload(exp.licence_id, undefined, exp.id);
                          }
                        }}
                      />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {exp.export_type === 'Third-Party Export' && (
                          <button
                            type="button"
                            onClick={() => onOpenDeecDeclaration?.(exp)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer"
                            title="Generate / View Statutory DEEC Export Declaration (Third-Party Export)"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">DEEC</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenLicence(exp.licence_id)}
                          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded cursor-pointer"
                          title="Open Master Licence"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ id: exp.id, invoice: exp.invoice_number, licence_number: exp.licence_number })}
                          className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded cursor-pointer"
                          title="Delete Export Shipment (Requires Admin Password)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin Protected Deletion Modal */}
      <AdminDeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Export Shipment"
        itemIdentifier={`Invoice: ${deleteTarget?.invoice || ''} (${deleteTarget?.licence_number || 'Advance Licence'})`}
        consequenceText="Deleting this export shipment will reverse the fulfilled export obligation balance and restore pending commitment obligations."
        onConfirm={async (password) => {
          if (deleteTarget) {
            await api.deleteExport(deleteTarget.id, password);
            await loadData();
          }
        }}
      />
    </div>
  );
};
