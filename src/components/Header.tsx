import React from 'react';
import { Search, Plus, Database, ShieldAlert, ArrowDownRight, ArrowUpRight, Award, Upload, HardDrive, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  currentTab?: string;
  onOpenSearch: () => void;
  onOpenNewLicence: () => void;
  onOpenNewImport: () => void;
  onOpenNewExport: () => void;
  onOpenUpload: () => void;
  dbStatus: any;
  overdueObligationsCount?: number;
  missingDocumentsCount?: number;
}

const TAB_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Advance Licence Dashboard',
    subtitle: 'DGFT Duty Exemption & Export Obligation Overview'
  },
  licences: {
    title: 'Advance Licences Register',
    subtitle: 'Directorate General of Foreign Trade (DGFT) Authorizations'
  },
  imports: {
    title: 'Import Declarations (BOE)',
    subtitle: 'Customs Duty Exemption & Bill of Entry Ledger'
  },
  obligations: {
    title: 'Export Obligations & Redemptions',
    subtitle: 'Fulfillment Milestones, EODC & Bank Guarantee Closures'
  },
  exports: {
    title: 'Export Register (Shipping Bills)',
    subtitle: 'Customs Shipping Bills & FOB Value Realization'
  },
  parties: {
    title: 'Party Follow-up & Ledgers',
    subtitle: 'Supplier & Buyer Compliance & Pending Documentation'
  },
  documents: {
    title: 'Documents Archive',
    subtitle: 'Secure Google Drive & Regulatory Dossier Repositories'
  },
  reports: {
    title: 'Audit & Compliance Reports',
    subtitle: 'Statutory Reports, Customs Audit Packs & Analytics'
  },
  settings: {
    title: 'Database & System Settings',
    subtitle: 'Cloud Firestore & Google Workspace Configuration'
  }
};

export const Header: React.FC<HeaderProps> = ({
  currentTab = 'dashboard',
  onOpenSearch,
  onOpenNewLicence,
  onOpenNewImport,
  onOpenNewExport,
  onOpenUpload,
  dbStatus,
  overdueObligationsCount = 0,
  missingDocumentsCount = 0
}) => {
  const isFirestore = dbStatus?.connected_to_firestore ?? true;
  const tabInfo = TAB_TITLES[currentTab] || TAB_TITLES.dashboard;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs shrink-0">
      {/* Brand / Section Title */}
      <div className="flex items-center gap-3 min-w-0 mr-4">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-800 leading-tight truncate">
            {tabInfo.title}
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 truncate hidden sm:block">
            {tabInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Center Search Trigger */}
      <div className="flex-1 max-w-sm mx-4 hidden lg:block">
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-full text-left px-3.5 py-1.5 text-xs text-slate-400 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md flex items-center justify-between transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate">Search Licence, Invoice, BOE, Shipping Bill...</span>
          </span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-500">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Side: Alert chips & Quick Actions */}
      <div className="flex items-center space-x-3">
        {/* Mobile Search Button */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md"
          title="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Alert Chips from Theme */}
        {overdueObligationsCount > 0 && (
          <div className="hidden sm:inline-flex px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs font-bold whitespace-nowrap">
            {overdueObligationsCount} Overdue Obligations
          </div>
        )}

        {missingDocumentsCount > 0 && (
          <div className="hidden md:inline-flex px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded text-xs font-bold whitespace-nowrap">
            {missingDocumentsCount} Missing Documents
          </div>
        )}

        {/* Firebase Firestore Connection Pill */}
        <div 
          title="Active Firebase Firestore Database"
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border font-medium bg-emerald-50 text-emerald-800 border-emerald-200"
        >
          <Database className="w-3 h-3 text-emerald-600" />
          <span className="truncate max-w-[120px]">Firestore</span>
        </div>

        {/* Google Drive Storage Pill */}
        <div 
          title="Google Drive Document Storage"
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border font-medium bg-blue-50 text-blue-800 border-blue-200"
        >
          <HardDrive className="w-3 h-3 text-blue-600" />
          <span className="truncate max-w-[120px]">Google Drive</span>
        </div>

        {/* Quick Add Menu */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onOpenNewImport}
            className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewExport}
            className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewLicence}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Licence</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>
    </header>
  );
};
