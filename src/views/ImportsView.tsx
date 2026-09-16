import React, { useState, useEffect } from 'react';
import { ImportRecord, TransactionDocumentChecklist } from '../types/index.ts';
import { api } from '../api/client.ts';
import { DocumentChecklistBadge } from '../components/DocumentChecklistBadge.tsx';
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

  const handleDelete = async (id: string, inv: string) => {
    if (!confirm(`Are you sure you want to delete import invoice "${inv}"? This will restore licence balance and remove the linked export obligation.`)) {
      return;
    }
    try {
      await api.deleteImport(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = imports.filter(i => {
    const q = search.toLowerCase();
    return (
      i.invoice_number.toLowerCase().includes(q) ||
      i.bill_of_entry_number.toLowerCase().includes(q) ||
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
            placeholder="Search by Invoice #, Bill of Entry (BOE) #, or Supplier..."
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
                  <th className="px-5 py-3">Import Date</th>
                  <th className="px-4 py-3">Invoice Number</th>
                  <th className="px-4 py-3">Bill of Entry #</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3">Compliance Checklist</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map(imp => (
                  <tr key={imp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-mono">{imp.import_date}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 font-mono">
                      {imp.invoice_number}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-blue-600 font-medium">
                      {imp.bill_of_entry_number}
                    </td>
                    <td className="px-4 py-3.5 max-w-xs truncate font-medium">
                      {imp.supplier}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                      {formatNumber(imp.quantity)} {imp.unit}
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
                          onClick={() => handleDelete(imp.id, imp.invoice_number)}
                          className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded"
                          title="Delete Import"
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
