import React from 'react';
import { DashboardResponse } from '../api/client.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { DashboardCharts } from '../components/DashboardCharts.tsx';
import { formatNumber } from '../utils/format.ts';
import { 
  Award, 
  ArrowDownRight, 
  ArrowUpRight, 
  AlertCircle, 
  Clock, 
  FileText, 
  CheckCircle2, 
  Calendar,
  ExternalLink,
  Plus,
  TrendingUp,
  Layers,
  Sparkles
} from 'lucide-react';

interface DashboardViewProps {
  data: DashboardResponse;
  onOpenLicence: (id: string) => void;
  onOpenNewLicence: () => void;
  onOpenNewImport: (licenceId?: string) => void;
  onOpenNewExport: (licenceId?: string) => void;
  onOpenUpload: (licenceId?: string, importId?: string, exportId?: string, docType?: any) => void;
  onRefresh: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  onOpenLicence,
  onOpenNewLicence,
  onOpenNewImport,
  onOpenNewExport,
  onOpenUpload,
  onRefresh
}) => {
  const { kpis, licence_summaries, obligations, document_follow_ups } = data;

  const overdueObligations = obligations.filter(o => o.status === 'Overdue' || (o.days_remaining !== undefined && o.days_remaining < 0));
  const pendingObligations = obligations.filter(o => o.status === 'Pending' || o.status === 'Partially Fulfilled');

  const activeLicencesCount = kpis.active_licences_count ?? kpis.active_licences ?? licence_summaries.length;
  const importedQty = Number(kpis.total_imported_quantity) || 0;
  const approvedQty = Number(kpis.total_approved_import_quantity) || (importedQty + (Number(kpis.remaining_import_quantity) || 0));
  const importUtilization = approvedQty > 0 ? Math.round((importedQty / approvedQty) * 100) : (kpis.overall_utilization_rate ?? 0);

  const fulfilledQty = Number(kpis.export_obligation_completed ?? kpis.total_obligation_fulfilled ?? 0);
  const totalObligation = Number(kpis.total_export_obligation) || (fulfilledQty + (Number(kpis.pending_export_obligation) || 0));
  const obligationFulfillment = totalObligation > 0 ? Math.round((fulfilledQty / totalObligation) * 100) : 0;
  const pendingQty = Number(kpis.pending_export_obligation ?? kpis.total_pending_obligation ?? 0);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Welcome */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Advance Licence Dashboard
            </h2>
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-full border border-blue-200">
              Live Compliance
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            <strong className="text-slate-800 font-semibold">Inject Care Parenterals Pvt. Ltd.</strong> — Real-time tracking of DGFT Advance Authorisations, duty-free raw material imports, and mandatory export obligations.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onRefresh}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <span>Refresh Data</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewLicence}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Licence</span>
          </button>
        </div>
      </div>

      {/* Vibrant KPI Cards Grid with Brand Color Accents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 shrink-0">
        {/* Active Licences */}
        <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Licences</p>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-black text-slate-900 font-mono">{activeLicencesCount}</p>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {licence_summaries.length} Total
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full bg-blue-50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all rounded-full"
              style={{ width: `${Math.min(100, importUtilization)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex justify-between">
            <span>DGFT Authorisations</span>
            <span className="font-semibold text-slate-700">{importUtilization}% Avg Quota Utilized</span>
          </p>
        </div>

        {/* Imports Utilized */}
        <div className="bg-white p-5 rounded-xl border border-sky-100 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-cyan-500"></div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Raw Material Imports</p>
            <span className="p-2 bg-sky-50 text-sky-600 rounded-lg group-hover:scale-110 transition-transform">
              <ArrowDownRight className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-black text-slate-900 font-mono">{formatNumber(importedQty)}</p>
            <span className="text-xs font-bold text-sky-700">KG</span>
          </div>
          <div className="mt-3 h-1.5 w-full bg-sky-50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-sky-500 to-cyan-500 transition-all rounded-full"
              style={{ width: `${Math.min(100, importUtilization)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex justify-between">
            <span>Quota Cap: {formatNumber(approvedQty)} kg</span>
            <span className="font-semibold text-sky-700">{importUtilization}%</span>
          </p>
        </div>

        {/* Export Obligation Fulfilled */}
        <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Obligation Fulfilled</p>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-black text-emerald-600 font-mono">{formatNumber(fulfilledQty)}</p>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {obligationFulfillment}% Done
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full bg-emerald-50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all rounded-full"
              style={{ width: `${Math.min(100, obligationFulfillment)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex justify-between">
            <span>Mandated EO: {formatNumber(totalObligation)} kg</span>
            <span className="font-semibold text-emerald-700">Discharged</span>
          </p>
        </div>

        {/* Pending & Overdue Obligation */}
        <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500"></div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Obligation</p>
            <span className={`p-2 rounded-lg group-hover:scale-110 transition-transform ${
              overdueObligations.length > 0 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
            }`}>
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-black text-amber-700 font-mono">{formatNumber(pendingQty)}</p>
            <span className="text-xs font-bold text-slate-500">KG</span>
          </div>
          <div className="mt-3 h-1.5 w-full bg-amber-50 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all rounded-full ${
                overdueObligations.length > 0 ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, (pendingQty / (totalObligation || 1)) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex justify-between">
            <span className={overdueObligations.length > 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}>
              {overdueObligations.length > 0 ? `${overdueObligations.length} Overdue Shipment` : 'All Within Schedule'}
            </span>
            <span className="text-slate-400">18-Month Period</span>
          </p>
        </div>
      </div>

      {/* Colorful Interactive Charts Section */}
      <DashboardCharts 
        licenceSummaries={licence_summaries} 
        kpis={kpis} 
        obligations={obligations} 
      />

      {/* Main Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Licences Summary & Urgent Obligations */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Licences Progress Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-700 text-sm">Licence Summary Table</h3>
                <p className="text-[11px] text-slate-500">Utilization of approved import quotas & export progress</p>
              </div>
              <span className="text-xs font-mono text-slate-500 font-medium">
                {licence_summaries.length} Records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-white border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Licence Number</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-right">Imports</th>
                    <th className="px-4 py-3 text-right">Obligation</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                  {licence_summaries.map((ls, idx) => {
                    const licenceId = ls.licence?.id || ls.licence_id || `lic-${idx}`;
                    const licenceNumber = ls.licence?.licence_number || ls.licence_number || 'N/A';
                    const productName = ls.licence?.products?.[0]?.product_name || ls.product_name || 'Pharmaceutical Injectable';
                    const status = ls.licence?.status || ls.status || 'Active';
                    const utilization = ls.overall_licence_utilization_percent ?? 0;
                    const daysToExpiry = ls.days_to_export_expiry ?? 0;

                    return (
                      <tr 
                        key={licenceId} 
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                        onClick={() => onOpenLicence(licenceId)}
                      >
                        <td className="px-4 py-3 font-medium text-blue-600 hover:text-blue-800 font-mono">
                          {licenceNumber}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {productName}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                          {utilization}%
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {daysToExpiry < 0 ? (
                            <span className="text-rose-600 font-semibold">Overdue</span>
                          ) : utilization >= 100 ? (
                            <span className="text-emerald-600 font-semibold">Fulfilled</span>
                          ) : (
                            <span className="text-slate-600">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={status} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenLicence(licenceId);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Open Master View"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending & Overdue Obligations Ledger */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-700 text-sm">
                  Pending & Overdue Obligations Register ({pendingObligations.length})
                </h3>
                <p className="text-[11px] text-slate-500">Monitor upcoming deadlines and take prompt export fulfillment action</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-white border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Import Ref</th>
                    <th className="px-4 py-3 text-right">Required</th>
                    <th className="px-4 py-3 text-right">Pending</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {pendingObligations.slice(0, 6).map((ob, idx) => {
                    const isOverdue = ob.status === 'Overdue' || (ob.days_remaining !== undefined && ob.days_remaining < 0);
                    return (
                      <tr key={ob.id || `ob-${ob.licence_id}-${idx}`} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 font-mono">{ob.import_invoice_number}</div>
                          <div className="text-[10px] text-slate-400">Import: {ob.import_date}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                          {formatNumber(ob.required_quantity)} {ob.unit || 'units'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">
                          {formatNumber(ob.pending_quantity)}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          <div>{ob.due_date}</div>
                          <span className={`text-[10px] font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-500'}`}>
                            {isOverdue 
                              ? `Overdue by ${Math.abs(ob.days_remaining || 0)} days` 
                              : `${ob.days_remaining} days left`}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={ob.status} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => onOpenNewExport(ob.licence_id)}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded text-[11px] font-medium transition-colors"
                          >
                            Fulfill
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Party Follow-up & Documentation Health */}
        <div className="flex flex-col gap-6">
          {/* Party Follow-up Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <h3 className="font-bold text-slate-700 text-sm mb-4 flex justify-between items-center">
              <span>Party Follow-up</span>
              <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-normal">Accountant View</span>
            </h3>
            <div className="space-y-3 overflow-y-auto max-h-[260px]">
              {document_follow_ups.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                  <span>All party documentation is up to date.</span>
                </div>
              ) : (
                document_follow_ups.slice(0, 5).map((item, idx) => (
                  <div key={item.id || `followup-${idx}`} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{item.party_or_supplier}</p>
                      <p className="text-[10px] text-slate-500">
                        Pending: {item.missing_document} (Inv #{item.invoice_number})
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-bold ${
                        item.urgency === 'critical' ? 'text-rose-600' : 'text-amber-600'
                      }`}>
                        {item.days_pending}d pending
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Documentation Health Card - Professional Polish Highlight */}
          {(() => {
            const missingDocs = kpis.total_missing_documents || 0;
            const healthPercent = Math.max(70, Math.min(100, Math.round(100 - (missingDocs * 1.5))));
            const boeCount = document_follow_ups.filter(d => d.missing_document.toLowerCase().includes('bill')).length;
            const brcCount = document_follow_ups.filter(d => d.missing_document.toLowerCase().includes('brc')).length;
            const boePercent = Math.max(75, Math.min(100, 100 - (boeCount * 4)));
            const brcPercent = Math.max(60, Math.min(100, 100 - (brcCount * 6)));

            return (
              <div className="bg-blue-900 rounded-xl shadow-lg p-5 text-white flex flex-col justify-between">
                <div>
                  <h4 className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">Documentation Health</h4>
                  <p className="text-2xl font-light mt-2">
                    {healthPercent}% <span className="text-xs text-blue-300 ml-1">Completed</span>
                  </p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-[10px]">
                      <span>Bill of Entry</span>
                      <span>{boePercent}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-blue-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 transition-all" style={{ width: `${boePercent}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span>BRC / Bank Documents</span>
                      <span>{brcPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-blue-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 transition-all" style={{ width: `${brcPercent}%` }}></div>
                    </div>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => onOpenUpload()}
                  className="w-full mt-5 py-2 bg-blue-700 hover:bg-blue-600 rounded text-xs font-bold transition-colors cursor-pointer"
                >
                  Generate Compliance Report
                </button>
              </div>
            );
          })()}
        </div>

      </div>
    </div>
  );
};
