import React from 'react';
import { 
  LayoutDashboard, 
  Award, 
  ArrowDownRight, 
  Target, 
  ArrowUpRight, 
  Users, 
  FileText, 
  BarChart3, 
  Settings,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { InjectCareLogo } from './InjectCareLogo.tsx';

export type NavTab = 
  | 'dashboard'
  | 'licences'
  | 'imports'
  | 'obligations'
  | 'exports'
  | 'parties'
  | 'documents'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  badgeCounts: {
    licencesCount: number;
    importsCount: number;
    overdueObligationsCount: number;
    pendingPartiesCount: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  badgeCounts
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Advance Licence Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'licences' as NavTab,
      label: 'Licences',
      icon: Award,
      badge: badgeCounts.licencesCount ? `${badgeCounts.licencesCount}` : null,
      badgeColor: 'bg-slate-100 text-slate-700'
    },
    {
      id: 'imports' as NavTab,
      label: 'Imports (BOE)',
      icon: ArrowDownRight,
      badge: badgeCounts.importsCount ? `${badgeCounts.importsCount}` : null,
      badgeColor: 'bg-sky-100 text-sky-800'
    },
    {
      id: 'obligations' as NavTab,
      label: 'Export Obligations',
      icon: Target,
      badge: badgeCounts.overdueObligationsCount > 0 ? `${badgeCounts.overdueObligationsCount} Overdue` : null,
      badgeColor: 'bg-rose-100 text-rose-800 font-bold'
    },
    {
      id: 'exports' as NavTab,
      label: 'Exports (SB)',
      icon: ArrowUpRight,
      badge: null
    },
    {
      id: 'parties' as NavTab,
      label: 'Party Follow-up',
      icon: Users,
      badge: badgeCounts.pendingPartiesCount > 0 ? `${badgeCounts.pendingPartiesCount} Pending` : null,
      badgeColor: 'bg-amber-100 text-amber-800 font-semibold'
    },
    {
      id: 'documents' as NavTab,
      label: 'Documents Archive',
      icon: FileText,
      badge: null
    },
    {
      id: 'reports' as NavTab,
      label: 'Audit & Reports',
      icon: BarChart3,
      badge: '7'
    },
    {
      id: 'settings' as NavTab,
      label: 'Database & Settings',
      icon: Settings,
      badge: null
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 h-screen sticky top-0 border-r border-slate-800 z-30 select-none">
      {/* Brand Header with Inject Care Logo */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-950/50 shrink-0">
        <InjectCareLogo variant="sidebar" className="w-full" />
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </span>

              {item.badge && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-blue-700 text-white' : (item.badgeColor || 'bg-slate-800 text-slate-400')
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User profile & accountant mode footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
            AD
          </div>
          <div>
            <p className="text-xs text-white font-medium">Admin User</p>
            <p className="text-[10px] text-slate-400 opacity-60">Accountant Mode</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
