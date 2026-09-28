import React, { useState, useEffect } from 'react';
import { ImportRecord, TransactionDocumentChecklist } from '../types/index.ts';
import { api } from '../api/client.ts';
import { DocumentChecklistBadge } from '../components/DocumentChecklistBadge.tsx';
import { AdminDeleteConfirmModal } from '../components/AdminDeleteConfirmModal.tsx';
import { formatNumber } from '../utils/format.ts';
import { 
  ArrowDownRight, 
  Search, 
  Plus, 
  Trash2, 
  FileText,
  ExternalLink
} from 'lucide-react';

interface ImportsViewProps {
  onOpenNewImport: () => void;
  onOpenLicence: (id: string) => void;
  onOpenUpload: (licenceId?: string, importId?: string) => void;
  onViewDocument: (doc: any) => void;
}

export const ImportsView: React.FC<ImportsViewProps> = ({
  onOpenNewImport,
  onOpenLicence,
  onOpenUpload,
  onViewDocument
}) => {
  const [imports, setImports] = useState<(ImportRecord & { checklist: TransactionDocumentChecklist })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; invoice: string; licence_number?: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getImports();
      setImports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = imports.filter(i => {
    const q = search.toLowerCase();
    return (
      (i.licence_number && i.licence_number.toLowerCase().includes(q)) ||
      i.invoice_number.toLowerCase().includes(q) ||
      (i.bill_of_entry_number && i.bill_of_entry_number.toLowerCase().includes(q)) ||
      i.supplier.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Imports & Bill of Entry Register</h2>
          <p className="text-xs text-slate-500">
            Duty-free raw materials and active pharmaceutical ingredients (API) cleared under Advance Authorisation.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenNewImport}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record Import Consignment</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Licence #, Invoice #, Bill of Entry (BOE) #, or Supplier..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-md outline-none focus:border-blue-500 font-mono"
          />
        </div>
        <span className="text-xs text-slate-400">Total: <strong>{filtered.length}</strong> consignments</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading imports ledger...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No import records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-white border-b border-slate-200 text-slate-400 uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-sky-900 bg-sky-50/50">Licence Number</th>
                  <th className="px-4 py-3">Import Date</th>
                  <th className="px-4 py-3">Invoice Number</th>
                  <th className="px-4 py-3">Bill of Entry #</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Value (USD / INR)</th>
                  <th className="px-4 py-3">Compliance Checklist</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map(imp => (
                  <tr key={imp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-sky-900 bg-sky-50/20">
                      <button
                        type="button"
                        onClick={() => onOpenLicence(imp.licence_id)}
                        className="hover:underline flex items-center gap-1 cursor-pointer"
                        title="View Licence Details"
                      >
                        <span>{imp.licence_number || 'Licence'}</span>
                        <ExternalLink className="w-3 h-3 text-sky-600 inline" />
                      </button>
                    </td>
                    <td className="px-4 py-3.5 font-mono">{imp.import_date}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 font-mono">
                      {imp.invoice_number}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-medium">
                      {imp.bill_of_entry_number ? (
                        <span className="text-blue-600">{imp.bill_of_entry_number}</span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Pending / Not added</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 max-w-xs font-medium">
                      <div className="text-slate-900 truncate">{imp.supplier}</div>
                      {imp.items && imp.items.length > 1 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {imp.items.map((it, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                              {it.product_name}: {formatNumber(it.quantity, '0', 3)} {it.unit}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                      {formatNumber(imp.quantity, '0', 3)} {imp.unit}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-800">
                      {imp.value_usd !== undefined && imp.value_usd !== null ? (
                        <div className="font-semibold text-emerald-700">
                          $ {formatNumber(imp.value_usd, '0', 2)}
                        </div>
                      ) : null}
                      {imp.value_inr !== undefined && imp.value_inr !== null ? (
                        <div className="text-[11px] text-slate-500">
                          ₹ {formatNumber(imp.value_inr, '0', 2)}
                        </div>
                      ) : null}
                      {imp.value_usd === undefined && imp.value_inr === undefined && (
                        <span className="text-slate-400 italic text-[11px]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <DocumentChecklistBadge
                        checklist={imp.checklist}
                        onOpenUpload={() => onOpenUpload(imp.licence_id, imp.id)}
                        onViewDocuments={() => {
                          if (imp.documents && imp.documents.length > 0) {
                            onViewDocument(imp.documents[0]);
                          } else {
                            onOpenUpload(imp.licence_id, imp.id);
                          }
                        }}
                      />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenLicence(imp.licence_id)}
                          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                          title="Open Master Licence"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ id: imp.id, invoice: imp.invoice_number, licence_number: imp.licence_number })}
                          className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded cursor-pointer"
                          title="Delete Import (Requires Admin Password)"
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
        title="Delete Import Consignment"
        itemIdentifier={`Invoice: ${deleteTarget?.invoice || ''} (${deleteTarget?.licence_number || 'Advance Licence'})`}
        consequenceText="Deleting this consignment will restore the available duty-free import balance on the licence and remove the corresponding export obligation."
        onConfirm={async (password) => {
          if (deleteTarget) {
            await api.deleteImport(deleteTarget.id, password);
            await loadData();
          }
        }}
      />
    </div>
  );
};
