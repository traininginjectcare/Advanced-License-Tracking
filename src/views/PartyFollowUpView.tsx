import React, { useState, useEffect } from 'react';
import { PartyFollowUpSummary } from '../types/index.ts';
import { api } from '../api/client.ts';
import { 
  Users, 
  Search, 
  Download, 
  CheckCircle,
  ArrowUpRight
} from 'lucide-react';

interface PartyFollowUpViewProps {
  onOpenUpload?: (licenceId?: string, importId?: string, exportId?: string, docType?: any) => void;
  onOpenLicence?: (id: string) => void;
  onViewPartyShipments: (partyName: string) => void;
}

export const PartyFollowUpView: React.FC<PartyFollowUpViewProps> = ({
  onViewPartyShipments
}) => {
  const [parties, setParties] = useState<PartyFollowUpSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
            className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
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

      {/* Main Table - Plain, simple, non-clickable numbers */}
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
                      className="hover:bg-slate-50/70 transition-colors select-text"
                    >
                      <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{p.party_name}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono font-medium text-slate-800">
                        {p.total_export_transactions}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono">
                        {p.pending_brc_count > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {p.pending_brc_count} BRC
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono">
                        {p.pending_noc_count > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {p.pending_noc_count} NOC
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono text-slate-500">
                        {p.other_pending_count > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {p.other_pending_count}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono">
                        {hasPending ? (
                          <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {p.total_pending_documents}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Complete</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => onViewPartyShipments(p.party_name)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                          title={`View shipments for ${p.party_name} in Exports register`}
                        >
                          <span>View Shipments</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
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
    </div>
  );
};

