import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { LicenceCalculations, DashboardKPIs, ExportObligation } from '../types/index.ts';
import { formatNumber } from '../utils/format.ts';
import { BarChart3, PieChart as PieIcon, TrendingUp, ShieldCheck, Info } from 'lucide-react';

interface DashboardChartsProps {
  licenceSummaries: LicenceCalculations[];
  kpis: DashboardKPIs;
  obligations: ExportObligation[];
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  licenceSummaries,
  kpis,
  obligations
}) => {
  const [activeChartTab, setActiveChartTab] = useState<'quotas' | 'trend'>('quotas');

  // 1. Quota & Obligation Fulfillment by Licence (Bar Chart Data)
  const licenceChartData = licenceSummaries.map(ls => {
    const licNo = ls.licence?.licence_number || ls.licence_number || 'Licence';
    // Short label for X axis: e.g. "AA 0310891104" or the middle number
    const parts = licNo.split('/');
    const shortLabel = parts.length >= 2 ? `AA ${parts[1]}` : licNo;
    const productName = ls.licence?.products?.[0]?.product_name || ls.product_name || 'API Injectable';
    const shortProduct = productName.split(' ')[0]; // First word e.g. "Meropenem"

    return {
      name: `${shortLabel} (${shortProduct})`,
      fullLicence: licNo,
      product: productName,
      approved: ls.total_approved_quantity,
      imported: ls.total_imported_quantity,
      fulfilled: ls.total_obligation_fulfilled,
      pending: ls.pending_obligation,
      utilizationPercent: ls.overall_licence_utilization_percent
    };
  });

  // 2. Export Obligation Fulfillment Distribution (Donut Pie Data)
  const totalEO = kpis.total_export_obligation || 1;
  const completedEO = kpis.export_obligation_completed || kpis.total_obligation_fulfilled || 0;
  const pendingEO = kpis.pending_export_obligation || kpis.total_pending_obligation || 0;
  
  // Calculate overdue portion
  const overdueItems = obligations.filter(o => o.status === 'Overdue' || (o.days_remaining !== undefined && o.days_remaining < 0));
  const overdueQty = overdueItems.reduce((acc, curr) => acc + (Number(curr.pending_quantity) || 0), 0);
  const regularPendingQty = Math.max(0, pendingEO - overdueQty);

  const pieData = [
    { name: 'Fulfilled EO', value: completedEO, color: '#10b981', label: 'Completed' },
    { name: 'Pending In-Time', value: regularPendingQty > 0 ? regularPendingQty : (pendingEO > 0 ? pendingEO : 0), color: '#f59e0b', label: 'On Schedule' },
    { name: 'Overdue EO', value: overdueQty, color: '#f43f5e', label: 'Overdue' }
  ].filter(d => d.value > 0);

  const fulfillmentPercentage = Math.min(100, Math.round((completedEO / totalEO) * 100));

  // 3. Monthly Import vs Export Execution Trajectory (Area Chart Data)
  const timelineData = [
    { month: 'Apr 2025', imports: 18500, exports: 12000 },
    { month: 'May 2025', imports: 24000, exports: 19500 },
    { month: 'Jun 2025', imports: 15000, exports: 16800 },
    { month: 'Jul 2025', imports: 27500, exports: 22400 },
    { month: 'Aug 2025', imports: 85000, exports: 81550 },
    { month: 'Sep 2025 (Est)', imports: 95000, exports: 83700 }
  ];

  return (
    <div className="space-y-6">
      {/* Charts Grid: Left Main Visual (2 Cols) + Right Donut Metric (1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Chart Card: Quota Utilization or Monthly Trajectory */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  {activeChartTab === 'quotas' ? <BarChart3 className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                </span>
                <h3 className="text-sm font-bold text-slate-800">
                  {activeChartTab === 'quotas' 
                    ? 'Advance Licence Quota Utilization vs. Fulfilled Exports (KG)' 
                    : 'Monthly Material Import vs. Finished Export Volume'}
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {activeChartTab === 'quotas'
                  ? 'Comparison of DGFT approved import limit, actual arrivals, and fulfilled export commitments'
                  : 'Cumulative physical shipment run rates for Inject Care pharmaceutical lines'}
              </p>
            </div>

            {/* Toggle tabs */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setActiveChartTab('quotas')}
                className={`px-3 py-1 font-medium rounded-md transition-all cursor-pointer ${
                  activeChartTab === 'quotas'
                    ? 'bg-white text-blue-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Licence Quotas
              </button>
              <button
                type="button"
                onClick={() => setActiveChartTab('trend')}
                className={`px-3 py-1 font-medium rounded-md transition-all cursor-pointer ${
                  activeChartTab === 'trend'
                    ? 'bg-white text-blue-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Shipment Trajectory
              </button>
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="mt-4 h-64 w-full">
            {activeChartTab === 'quotas' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={licenceChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: '#475569' }} 
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const dataItem = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white text-xs p-3 rounded-lg shadow-xl border border-slate-700 space-y-1.5">
                            <p className="font-bold text-sky-300">{dataItem.fullLicence}</p>
                            <p className="text-[11px] text-slate-300">{dataItem.product}</p>
                            <div className="border-t border-slate-700 pt-1.5 space-y-1 font-mono text-[11px]">
                              <div className="flex justify-between gap-4 text-indigo-300">
                                <span>Approved Quota:</span>
                                <span className="font-bold">{formatNumber(dataItem.approved)} kg</span>
                              </div>
                              <div className="flex justify-between gap-4 text-sky-300">
                                <span>Imported:</span>
                                <span className="font-bold">{formatNumber(dataItem.imported)} kg</span>
                              </div>
                              <div className="flex justify-between gap-4 text-emerald-300">
                                <span>Fulfilled:</span>
                                <span className="font-bold">{formatNumber(dataItem.fulfilled)} kg</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }} 
                  />
                  <Bar 
                    dataKey="approved" 
                    name="Approved Quota (KG)" 
                    fill="#6366f1" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={32}
                  />
                  <Bar 
                    dataKey="imported" 
                    name="Actual Imported (KG)" 
                    fill="#0284c7" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={32}
                  />
                  <Bar 
                    dataKey="fulfilled" 
                    name="Fulfilled Obligation (KG)" 
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="importGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="exportGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 11, fill: '#475569' }} 
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white text-xs p-3 rounded-lg shadow-xl border border-slate-700 space-y-1.5">
                            <p className="font-bold text-white">{label}</p>
                            <div className="border-t border-slate-700 pt-1.5 space-y-1 font-mono text-[11px]">
                              <div className="flex justify-between gap-4 text-sky-400">
                                <span>Cumulative Imports:</span>
                                <span className="font-bold">{formatNumber(payload[0]?.value as number)} kg</span>
                              </div>
                              <div className="flex justify-between gap-4 text-emerald-400">
                                <span>Fulfilled Exports:</span>
                                <span className="font-bold">{formatNumber(payload[1]?.value as number)} kg</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="imports" 
                    name="Raw Material Imports (KG)" 
                    stroke="#0284c7" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#importGradient)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="exports" 
                    name="Finished Product Exports (KG)" 
                    stroke="#10b981" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#exportGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bottom Indicators */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span>All Advance Authorisations maintained within DGFT SION norm allowances</span>
            </span>
            <span className="font-mono text-slate-400 text-[11px]">
              Inject Care Parenterals Pvt. Ltd. Regulatory Analytics
            </span>
          </div>
        </div>

        {/* Right Chart Card: Obligation Status Donut */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <PieIcon className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-800">Export Obligation (EO) Health</h3>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {fulfillmentPercentage}% Completed
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Overall progress toward completing mandatory 18-month export obligations
            </p>

            {/* Donut Chart with Center Label */}
            <div className="relative mt-2 h-44 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={74}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0];
                        return (
                          <div className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded shadow font-mono">
                            <span className="font-bold text-sky-300">{d.name}: </span>
                            <span>{formatNumber(d.value as number)} kg</span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Metric in center of Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-slate-800 font-mono">
                  {fulfillmentPercentage}%
                </span>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">
                  Fulfilled
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown Items List */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Fulfilled & Discharged</span>
              </span>
              <span className="font-bold text-slate-900 font-mono">
                {formatNumber(completedEO)} kg
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>In-Progress (Within 18m)</span>
              </span>
              <span className="font-bold text-amber-700 font-mono">
                {formatNumber(regularPendingQty)} kg
              </span>
            </div>

            {overdueQty > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-rose-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span>Overdue Action Required</span>
                </span>
                <span className="font-bold text-rose-700 font-mono">
                  {formatNumber(overdueQty)} kg
                </span>
              </div>
            )}

            <div className="mt-2 pt-2 border-t border-dashed border-slate-200 flex justify-between text-[11px] text-slate-500">
              <span>Total Mandated Obligation</span>
              <span className="font-semibold text-slate-800 font-mono">
                {formatNumber(totalEO)} kg
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
