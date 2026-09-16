import React, { useState, useEffect } from 'react';
import { Licence, LicenceCalculations } from '../types/index.ts';
import { api } from '../api/client.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { formatNumber } from '../utils/format.ts';
import { 
  Award, 
  Search, 
  Plus, 
  Calendar, 
  ExternalLink, 
  ArrowDownRight, 
  ArrowUpRight, 
  Trash2,
  FileText
} from 'lucide-react';

interface LicencesViewProps {
  onOpenLicence: (id: string) => void;
  onOpenNewLicence: () => void;
  onOpenNewImport: (licenceId: string) => void;
  onOpenNewExport: (licenceId: string) => void;
}

export const LicencesView: React.FC<LicencesViewProps> = ({
  onOpenLicence,
  onOpenNewLicence,
  onOpenNewImport,
  onOpenNewExport
}) => {
  const [licences, setLicences] = useState<(Licence & { metrics: LicenceCalculations })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getLicences();
      setLicences(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, num: string) => {
    if (!confirm(`Are you sure you want to delete Advance Authorisation "${num}"? All linked imports, obligations, and exports will be deleted.`)) {
      return;
    }
    try {
      await api.deleteLicence(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = licences.filter(l => {
    const matchesSearch = l.licence_number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Advance Authorisation Licences</h2>
          <p className="text-xs text-slate-500">
            Master records for duty-free pharma inputs, raw materials, and export commitment tracking.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenNewLicence}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Advance Licence</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by licence number..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-md outline-none focus:border-blue-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Status:</span>
          {['All', 'Active', 'Expiring Soon', 'Expired', 'Fulfilled'].map(status => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === status
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Licences Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading master licences...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No matching licences found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-white border-b border-slate-200 text-slate-400 uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3">Licence Number</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Approved Qty</th>
                  <th className="px-4 py-3 text-right">Imported Qty</th>
                  <th className="px-4 py-3 text-right">Remaining Import</th>
                  <th className="px-4 py-3">Utilization</th>
                  <th className="px-4 py-3 text-right">Export Obligation</th>
                  <th className="px-4 py-3 text-right">Pending Obligation</th>
                  <th className="px-4 py-3">Export Validity</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map(l => {
                  const m = l.metrics;
                  return (
                    <tr 
                      key={l.id} 
                      onClick={() => onOpenLicence(l.id)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5 font-medium text-blue-600 hover:text-blue-800 font-mono flex items-center gap-2">
                        <Award className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{l.licence_number}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={l.status} size="sm" />
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-slate-600">
                        {formatNumber(m?.total_approved_quantity)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-medium text-slate-900">
                        {formatNumber(m?.total_imported_quantity)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-blue-700">
                        {formatNumber(m?.remaining_import_quantity)}
                      </td>
                      <td className="px-4 py-3.5 min-w-[120px]">
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full" 
                            style={{ width: `${Math.min(100, m?.overall_licence_utilization_percent || 0)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5 inline-block">
                          {m?.overall_licence_utilization_percent || 0}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-medium text-slate-700">
                        {formatNumber(m?.total_export_obligation_created)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-amber-700">
                        {formatNumber(m?.pending_obligation)}
                      </td>
                      <td className="px-4 py-3.5 font-mono">
                        <div>{l.export_validity_date}</div>
                        <div className={`text-[10px] ${(m?.days_to_export_expiry ?? 0) < 60 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                          {(m?.days_to_export_expiry ?? 0) < 0 
                            ? `Expired` 
                            : `${m?.days_to_export_expiry ?? 0}d remaining`}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenNewImport(l.id)}
                            className="p-1.5 text-blue-700 hover:bg-blue-50 rounded transition-colors"
                            title="Record Import against this Licence"
                          >
                            <ArrowDownRight className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenNewExport(l.id)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                            title="Record Export against this Licence"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenLicence(l.id)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View Full Master Details"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(l.id, l.licence_number)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Delete Licence"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
