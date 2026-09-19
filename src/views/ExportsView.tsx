import React, { useState, useEffect } from 'react';
import { ExportRecord, TransactionDocumentChecklist } from '../types/index.ts';
import { api } from '../api/client.ts';
import { DocumentChecklistBadge } from '../components/DocumentChecklistBadge.tsx';
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

  const handleDelete = async (id: string, inv: string) => {
    if (!confirm(`Are you sure you want to delete export shipment "${inv}"? This will reverse the completed obligation quantity.`)) {
      return;
    }
    try {
      await api.deleteExport(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = exports.filter(e => {
    const q = search.toLowerCase();
    const matchesSearch = 
      e.invoice_number.toLowerCase().includes(q) ||
      e.shipping_bill_number.toLowerCase().includes(q) ||
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
            placeholder="Search by Invoice #, Shipping Bill #, Party, or Product..."
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
                  <th className="px-5 py-3">Export Date</th>
                  <th className="px-4 py-3">Invoice Number</th>
                  <th className="px-4 py-3">Shipping Bill #</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Buyer / Party</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3">Compliance Checklist</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-mono">{exp.export_date}</td>
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
                    <td className="px-4 py-3.5 max-w-xs text-slate-700">
                      <div className="truncate font-medium text-slate-900" title={exp.product}>{exp.product}</div>
                      {exp.batches && exp.batches.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {exp.batches.map((b, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono">
                              {b.batch_number}: {formatNumber(b.quantity)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                      {formatNumber(exp.quantity)} {exp.unit}
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
                          onClick={() => handleDelete(exp.id, exp.invoice_number)}
                          className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded cursor-pointer"
                          title="Delete Export Shipment"
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
    </div>
  );
};
