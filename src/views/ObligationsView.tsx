import React, { useState, useEffect } from 'react';
import { ExportObligation } from '../types/index.ts';
import { api } from '../api/client.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { formatNumber } from '../utils/format.ts';
import { 
  Target, 
  Search, 
  ArrowUpRight, 
  Calendar, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface ObligationsViewProps {
  onOpenNewExport: (licenceId?: string, obligationId?: string) => void;
  onOpenLicence: (id: string) => void;
}

export const ObligationsView: React.FC<ObligationsViewProps> = ({
  onOpenNewExport,
  onOpenLicence
}) => {
  const [obligations, setObligations] = useState<ExportObligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getObligations();
      setObligations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = obligations.filter(ob => {
    const matchesSearch = 
      ob.import_invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (ob.product_name && ob.product_name.toLowerCase().includes(search.toLowerCase()));

    let matchesStatus = true;
    if (statusFilter === 'Overdue') {
      matchesStatus = ob.status === 'Overdue' || (ob.days_remaining !== undefined && ob.days_remaining < 0);
    } else if (statusFilter !== 'All') {
      matchesStatus = ob.status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Export Obligations Register</h2>
          <p className="text-xs text-slate-500">
            DGFT SION commitment formulas automatically calculated upon each imported consignment.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Import Invoice or Product..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-md outline-none focus:border-blue-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Status:</span>
          {['All', 'Pending', 'Partially Fulfilled', 'Completed', 'Overdue'].map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === st
                  ? (st === 'Overdue' ? 'bg-rose-600 text-white shadow-xs' : 'bg-blue-600 text-white shadow-xs')
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading export obligations...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No export obligations found for this criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-white border-b border-slate-200 text-slate-400 uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3">Import Ref</th>
                  <th className="px-4 py-3">Import Date</th>
                  <th className="px-4 py-3 text-right">Imported Qty</th>
                  <th className="px-4 py-3 text-right">Required Obligation</th>
                  <th className="px-4 py-3 text-right">Fulfilled Qty</th>
                  <th className="px-4 py-3 text-right">Pending Qty</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map(ob => {
                  const isOverdue = ob.status === 'Overdue' || (ob.days_remaining !== undefined && ob.days_remaining < 0);
                  return (
                    <tr key={ob.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-mono">
                        <span className="font-bold text-slate-900">{ob.import_invoice_number}</span>
                      </td>
                      <td className="px-4 py-3.5 font-mono">{ob.import_date}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-slate-600">
                        {formatNumber(ob.imported_quantity)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-medium text-slate-900">
                        {formatNumber(ob.required_quantity)} {ob.unit || 'units'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-emerald-700">
                        {formatNumber(ob.completed_quantity)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-amber-800">
                        {formatNumber(ob.pending_quantity)}
                      </td>
                      <td className="px-4 py-3.5 font-mono">
                        <div>{ob.due_date}</div>
                        <div className={`text-[10px] font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-400'}`}>
                          {isOverdue 
                            ? `Overdue by ${Math.abs(ob.days_remaining || 0)} days` 
                            : `${ob.days_remaining} days left`}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={ob.status} size="sm" />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {ob.pending_quantity > 0 && (
                            <button
                              type="button"
                              onClick={() => onOpenNewExport(ob.licence_id, ob.id)}
                              className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded text-[11px] font-medium transition-colors"
                            >
                              Fulfill via Export
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenLicence(ob.licence_id)}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                            title="Open Master Licence"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
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
