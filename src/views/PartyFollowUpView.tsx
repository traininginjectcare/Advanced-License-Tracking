import React, { useState, useEffect } from 'react';
import { PartyFollowUpSummary } from '../types/index.ts';
import { api } from '../api/client.ts';
import { formatNumber } from '../utils/format.ts';
import { 
  Users, 
  Search, 
  FileText, 
  AlertCircle, 
  ChevronRight, 
  Download, 
  Mail, 
  Clock, 
  CheckCircle,
  X
} from 'lucide-react';

interface PartyFollowUpViewProps {
  onOpenUpload: (licenceId?: string, importId?: string, exportId?: string, docType?: any) => void;
  onOpenLicence: (id: string) => void;
}

export const PartyFollowUpView: React.FC<PartyFollowUpViewProps> = ({
  onOpenUpload,
  onOpenLicence
}) => {
  const [parties, setParties] = useState<PartyFollowUpSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedParty, setSelectedParty] = useState<PartyFollowUpSummary | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getParties();
      setParties(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = parties.filter(p => 
    p.party_name.toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const headers = ['Party Name', 'Total Shipments', 'Total Pending Documents', 'Pending BRC', 'Pending NOC', 'Other Pending'];
    const rows = filtered.map(p => [
      `"${p.party_name}"`,
      p.total_export_transactions,
      p.total_pending_documents,
      p.pending_brc_count,
      p.pending_noc_count,
      p.other_pending_count
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `InjectCare_Party_FollowUp_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Party & Buyer Document Follow-up</h2>
          <p className="text-xs text-slate-500">
            Track missing Bank Realisation Certificates (e-BRC) and No Objection Certificates (NOC) grouped by merchant/buyer.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCSV}
            className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Follow-up Sheet</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search party or overseas buyer..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-md outline-none focus:border-blue-500"
          />
        </div>
        <span className="text-xs text-slate-400">Total: <strong>{filtered.length}</strong> counterparties</span>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Compiling party compliance status...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No parties found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-white border-b border-slate-200 text-slate-400 uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3">Buyer / Party Name</th>
                  <th className="px-4 py-3 text-center">Export Shipments</th>
                  <th className="px-4 py-3 text-center">Pending BRC</th>
                  <th className="px-4 py-3 text-center">Pending NOC</th>
                  <th className="px-4 py-3 text-center">Other Missing</th>
                  <th className="px-4 py-3 text-center">Total Missing</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map(p => {
                  const hasPending = p.total_pending_documents > 0;
                  return (
                    <tr 
                      key={p.party_name}
                      onClick={() => setSelectedParty(p)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{p.party_name}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono font-medium">
                        {p.total_export_transactions}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono">
                        {p.pending_brc_count > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            {p.pending_brc_count} BRC
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono">
                        {p.pending_noc_count > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            {p.pending_noc_count} NOC
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono text-slate-500">
                        {p.other_pending_count}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono">
                        {hasPending ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                            {p.total_pending_documents}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>100% Complete</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedParty(p);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition-colors"
                        >
                          View Shipments ({p.export_records.length})
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drill-down Drawer / Modal */}
      {selectedParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{selectedParty.party_name}</h3>
                  <p className="text-xs text-slate-500">
                    {selectedParty.total_export_transactions} export shipments | {selectedParty.total_pending_documents} documents pending verification
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedParty(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Export Shipments & Document Status
              </div>

              <div className="space-y-3">
                {selectedParty.export_records.map(rec => {
                  const s = rec.export;
                  return (
                    <div key={s.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900 font-mono text-sm">{s.invoice_number}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                            {s.export_type}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">Date: {s.export_date}</span>
                        </div>
                        <div className="text-xs font-mono font-semibold text-slate-800">
                          SB: {s.shipping_bill_number}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <div>Product: <strong className="text-slate-800">{s.product}</strong> ({formatNumber(s.quantity)} {s.unit})</div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedParty(null);
                            onOpenLicence(s.licence_id);
                          }}
                          className="text-blue-600 font-medium hover:underline text-[11px]"
                        >
                          View Licence Master →
                        </button>
                      </div>

                      {/* Missing documents list */}
                      {rec.missing_documents.length > 0 ? (
                        <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg space-y-2">
                          <div className="text-[11px] font-semibold text-amber-900 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Missing Documents Required:</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {rec.missing_documents.map(doc => (
                              <div key={doc} className="flex items-center gap-2 bg-white px-2.5 py-1 rounded border border-amber-300 text-xs">
                                <span className="text-rose-700 font-semibold">{doc}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedParty(null);
                                    onOpenUpload(s.licence_id, undefined, s.id, doc);
                                  }}
                                  className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-medium hover:bg-blue-700"
                                >
                                  Upload
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4" />
                          <span>All compliance documents archived (Shipping Bill, Invoice, BRC{s.export_type === 'Third-Party Export' ? ', NOC' : ''})</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-mono">Counterparty: {selectedParty.party_name}</span>
              <button
                type="button"
                onClick={() => setSelectedParty(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
