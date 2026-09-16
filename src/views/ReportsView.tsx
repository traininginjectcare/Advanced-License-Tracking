import React, { useState, useEffect } from 'react';
import { api } from '../api/client.ts';
import { formatNumber } from '../utils/format.ts';
import { 
  BarChart3, 
  Download, 
  Printer, 
  Filter, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle,
  Clock
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<string>('licence-utilization');
  const [reportData, setReportData] = useState<{ headers: string[]; rows: any[][] }>({ headers: [], rows: [] });
  const [loading, setLoading] = useState(false);

  const reportList = [
    { id: 'licence-utilization', title: '1. Advance Licence Utilization Report', desc: 'Approved quotas, imported drawdowns, balance, and utilization percentages.' },
    { id: 'import-summary', title: '2. Import Consignment Summary', desc: 'All duty-free bills of entry, suppliers, products, and customs clearance dates.' },
    { id: 'export-obligations', title: '3. Export Obligation Summary', desc: 'Commitment ledger linking each import to required and fulfilled export targets.' },
    { id: 'pending-obligations', title: '4. Pending Obligations Report', desc: 'Unfulfilled export requirements with upcoming validity deadlines.' },
    { id: 'overdue-obligations', title: '5. Overdue Obligations Audit', desc: 'Critical report of expired or past-due commitments requiring DGFT extension or redemption.' },
    { id: 'party-pending-docs', title: '6. Party-Wise Pending Documents', desc: 'Counterparty checklist of outstanding e-BRCs, NOCs, and commercial invoices.' },
    { id: 'doc-completion', title: '7. Document Compliance Completion Audit', desc: 'Complete audit of every import and export transaction document readiness.' }
  ];

  useEffect(() => {
    generateReport(selectedReport);
  }, [selectedReport]);

  const generateReport = async (reportId: string) => {
    setLoading(true);
    try {
      const [licences, imports, obligations, exports, parties, docs] = await Promise.all([
        api.getLicences(),
        api.getImports(),
        api.getObligations(),
        api.getExports(),
        api.getParties(),
        api.getDocuments()
      ]);

      let headers: string[] = [];
      let rows: any[][] = [];

      switch (reportId) {
        case 'licence-utilization':
          headers = ['Licence Number', 'Status', 'Approved Qty', 'Imported Qty', 'Remaining Import', 'Utilization %', 'Export Obligation', 'Fulfilled Obligation', 'Pending Obligation', 'Fulfillment %', 'Export Validity'];
          rows = licences.map(l => [
            l.licence_number,
            l.status,
            formatNumber(l.metrics?.total_approved_quantity),
            formatNumber(l.metrics?.total_imported_quantity),
            formatNumber(l.metrics?.remaining_import_quantity),
            `${l.metrics?.overall_licence_utilization_percent || 0}%`,
            formatNumber(l.metrics?.total_export_obligation_created),
            formatNumber(l.metrics?.total_obligation_fulfilled),
            formatNumber(l.metrics?.pending_obligation),
            `${l.metrics?.obligation_fulfillment_percent || 0}%`,
            l.export_validity_date
          ]);
          break;

        case 'import-summary':
          headers = ['Import Date', 'Invoice Number', 'Bill of Entry #', 'Supplier', 'Quantity', 'Unit', 'Licence ID'];
          rows = imports.map(i => [
            i.import_date,
            i.invoice_number,
            i.bill_of_entry_number,
            i.supplier,
            formatNumber(i.quantity),
            i.unit,
            i.licence_id
          ]);
          break;

        case 'export-obligations':
          headers = ['Import Invoice', 'Import Date', 'Required Export', 'Fulfilled Qty', 'Pending Qty', 'Unit', 'Due Date', 'Status'];
          rows = obligations.map(o => [
            o.import_invoice_number,
            o.import_date,
            formatNumber(o.required_quantity),
            formatNumber(o.completed_quantity),
            formatNumber(o.pending_quantity),
            o.unit || 'units',
            o.due_date,
            o.status
          ]);
          break;

        case 'pending-obligations':
          headers = ['Import Invoice', 'Import Date', 'Pending Qty', 'Unit', 'Due Date', 'Days Remaining', 'Status'];
          rows = obligations
            .filter(o => (o.pending_quantity || 0) > 0)
            .map(o => [
              o.import_invoice_number,
              o.import_date,
              formatNumber(o.pending_quantity),
              o.unit || 'units',
              o.due_date,
              o.days_remaining ?? 0,
              o.status
            ]);
          break;

        case 'overdue-obligations':
          headers = ['Import Invoice', 'Import Date', 'Pending Qty', 'Unit', 'Due Date', 'Days Overdue', 'Status'];
          rows = obligations
            .filter(o => o.status === 'Overdue' || (o.days_remaining !== undefined && o.days_remaining < 0))
            .map(o => [
              o.import_invoice_number,
              o.import_date,
              formatNumber(o.pending_quantity),
              o.unit || 'units',
              o.due_date,
              Math.abs(o.days_remaining || 0),
              'CRITICAL OVERDUE'
            ]);
          break;

        case 'party-pending-docs':
          headers = ['Party Name', 'Total Shipments', 'Pending BRC', 'Pending NOC', 'Other Pending', 'Total Missing'];
          rows = parties.map(p => [
            p.party_name,
            p.total_export_transactions,
            p.pending_brc_count,
            p.pending_noc_count,
            p.other_pending_count,
            p.total_pending_documents
          ]);
          break;

        case 'doc-completion':
          headers = ['Transaction Type', 'Invoice / Ref Number', 'Counterparty', 'Required Docs', 'Uploaded Docs', 'Missing Items', 'Status'];
          const importRows = imports.map(i => [
            'Import Consignment',
            i.invoice_number,
            i.supplier,
            i.checklist?.total_required || 1,
            i.checklist?.total_uploaded || 0,
            i.checklist?.missing_documents?.join('; ') || 'None',
            i.checklist?.is_complete ? 'Complete' : 'Pending Docs'
          ]);
          const exportRows = exports.map(e => [
            `Export (${e.export_type})`,
            e.invoice_number,
            e.party_name,
            e.checklist?.total_required || 3,
            e.checklist?.total_uploaded || 0,
            e.checklist?.missing_documents?.join('; ') || 'None',
            e.checklist?.is_complete ? 'Complete' : 'Pending Docs'
          ]);
          rows = [...importRows, ...exportRows];
          break;

        default:
          break;
      }

      setReportData({ headers, rows });
    } catch (err) {
      console.error('Report error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (reportData.headers.length === 0) return;
    const csvContent = 'data:text/csv;charset=utf-8,' + [
      reportData.headers.join(','),
      ...reportData.rows.map(r => r.map(val => `"${val}"`).join(','))
    ].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `InjectCare_${selectedReport}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentInfo = reportList.find(r => r.id === selectedReport);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Compliance Audit & Statutory Reports</h2>
          <p className="text-xs text-slate-500">
            Generate and export DGFT Advance Authorisation audit sheets and Customs reconciliation statements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadCSV}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Report Selector Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {reportList.map(r => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSelectedReport(r.id)}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              selectedReport === r.id
                ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <div className="font-semibold text-xs leading-snug">{r.title}</div>
            <p className={`text-[10px] mt-1 line-clamp-2 ${selectedReport === r.id ? 'text-blue-100' : 'text-slate-500'}`}>
              {r.desc}
            </p>
          </button>
        ))}
      </div>

      {/* Report Preview Panel */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">{currentInfo?.title}</h3>
            <p className="text-xs text-slate-500">{currentInfo?.desc}</p>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            {reportData.rows.length} total rows generated
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Generating report preview...</div>
        ) : reportData.rows.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No records found for this report.</div>
        ) : (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-xs text-left">
              <thead className="bg-white sticky top-0 text-slate-400 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  {reportData.headers.map((h, i) => (
                    <th key={i} className="px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {reportData.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/70">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-2.5 whitespace-nowrap">
                        {cell}
                      </td>
                    ))}
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
