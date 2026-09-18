import React from 'react';
import { Search } from 'lucide-react';

interface HeaderProps {
  currentTab?: string;
  onOpenSearch: () => void;
  onOpenNewLicence?: () => void;
  onOpenNewImport?: () => void;
  onOpenNewExport?: () => void;
  onOpenUpload?: () => void;
  dbStatus?: any;
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
  onOpenSearch
}) => {
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

      {/* Clean Search Bar Only */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg transition-all cursor-pointer w-56 sm:w-72 md:w-88 lg:w-96 shadow-2xs"
          title="Search Licence, Invoice, BOE, Shipping Bill... (Ctrl+K)"
        >
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="flex-1 text-left truncate text-slate-500">
            Search Licence, Invoice, BOE, Shipping Bill...
          </span>
          <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-400 font-medium">
            Ctrl+K
          </kbd>
        </button>
      </div>
    </header>
  );
};
