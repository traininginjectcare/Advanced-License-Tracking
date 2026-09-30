import React, { useState, useEffect } from 'react';
import { ExportObligation, Licence } from '../types/index.ts';
import { api } from '../api/client.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { formatNumber } from '../utils/format.ts';
import { 
  Target, 
  Search, 
  ArrowUpRight, 
  Calendar, 
  AlertCircle,
  ExternalLink,
  Filter
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
  const [licences, setLicences] = useState<Licence[]>([]);
  const [selectedLicenceId, setSelectedLicenceId] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    loadData();

    const handleDataUpdated = () => {
      loadData();
    };
    window.addEventListener('tcms-data-updated', handleDataUpdated);
    return () => window.removeEventListener('tcms-data-updated', handleDataUpdated);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [obData, licData] = await Promise.all([
        api.getObligations(),
        api.getLicences()
      ]);
      setObligations(obData);
      setLicences(licData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = obligations.filter(ob => {
    const matchesLicence = selectedLicenceId === 'All' || ob.licence_id === selectedLicenceId;

    const matchesSearch = 
      (ob.licence_number && ob.licence_number.toLowerCase().includes(search.toLowerCase())) ||
      (ob.import_invoice_number && ob.import_invoice_number.toLowerCase().includes(search.toLowerCase())) ||
      (ob.product_name && ob.product_name.toLowerCase().includes(search.toLowerCase()));

    let matchesStatus = true;
    if (statusFilter === 'Overdue') {
      matchesStatus = ob.status === 'Overdue' || (ob.days_remaining !== undefined && ob.days_remaining < 0);
    } else if (statusFilter !== 'All') {
      matchesStatus = ob.status === statusFilter;
    }

    return matchesLicence && matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Export Obligations Register</h2>
          <p className="text-xs text-slate-500">
            Export commitments tracked against advance authorization licences and import consignments.
          </p>
        </div>
      </div>

      {/* Filter Bar with Licence Dropdown */}
      <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Licence Dropdown */}
          <div className="md:col-span-4">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-sky-600" />
              Filter by Advance Licence:
            </label>
            <select
              id="obligation-licence-filter"
              value={selectedLicenceId}
              onChange={(e) => setSelectedLicenceId(e.target.value)}
              className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-md font-medium text-slate-800 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-sky-600 outline-none"
            >
              <option value="All">All Licences ({obligations.length} total obligations)</option>
              {licences.map(lic => {
                const count = obligations.filter(o => o.licence_id === lic.id).length;
                return (
                  <option key={lic.id} value={lic.id}>
                    Licence #{lic.licence_number} ({count} obligations)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Search Input */}
          <div className="md:col-span-8">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Search Obligations:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Licence #, Import Invoice #, or Product..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-md outline-none focus:ring-1 focus:ring-sky-600 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 font-medium mr-1">Status:</span>
            {['All', 'Pending', 'Partially Fulfilled', 'Completed', 'Overdue'].map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === st
                    ? (st === 'Overdue' ? 'bg-rose-600 text-white shadow-xs' : 'bg-blue-600 text-white shadow-xs')
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400">
            Showing <strong>{filtered.length}</strong> of {obligations.length} commitments
          </span>
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
                  <th className="px-5 py-3 text-sky-900 bg-sky-50/50">Licence Number</th>
                  <th className="px-4 py-3">Import Ref</th>
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
                      <td className="px-5 py-3.5 font-mono font-bold text-sky-900 bg-sky-50/20">
                        <button
                          type="button"
                          onClick={() => onOpenLicence(ob.licence_id)}
                          className="hover:underline flex items-center gap-1 cursor-pointer"
                          title="View Licence Details"
                        >
                          <span>{ob.licence_number || 'Licence'}</span>
                          <ExternalLink className="w-3 h-3 text-sky-600 inline" />
                        </button>
                      </td>
                      <td className="px-4 py-3.5 font-mono">
                        <span className="font-bold text-slate-900">{ob.import_invoice_number}</span>
                        {ob.product_name && (
                          <div className="text-[11px] text-slate-500 font-sans">{ob.product_name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono">{ob.import_date}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-slate-600">
                        {ob.imported_quantity !== undefined ? formatNumber(ob.imported_quantity, '0', 3) : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-medium text-slate-900">
                        {formatNumber(ob.required_quantity, '0', 3)} {ob.unit || 'units'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-emerald-700">
                        {formatNumber(ob.completed_quantity, '0', 3)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-amber-800">
                        {formatNumber(ob.pending_quantity, '0', 3)}
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
                              className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
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
