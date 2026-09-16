import React, { useState, useEffect } from 'react';
import { api, DashboardResponse } from './api/client.ts';
import { Header } from './components/Header.tsx';
import { Sidebar, NavTab } from './components/Sidebar.tsx';
import { DashboardView } from './views/DashboardView.tsx';
import { LicencesView } from './views/LicencesView.tsx';
import { ImportsView } from './views/ImportsView.tsx';
import { ObligationsView } from './views/ObligationsView.tsx';
import { ExportsView } from './views/ExportsView.tsx';
import { PartyFollowUpView } from './views/PartyFollowUpView.tsx';
import { DocumentsView } from './views/DocumentsView.tsx';
import { ReportsView } from './views/ReportsView.tsx';
import { SettingsView } from './views/SettingsView.tsx';

import { LicenceDetailModal } from './components/LicenceDetailModal.tsx';
import { NewLicenceModal } from './components/NewLicenceModal.tsx';
import { NewImportModal } from './components/NewImportModal.tsx';
import { NewExportModal } from './components/NewExportModal.tsx';
import { UploadDocumentModal } from './components/UploadDocumentModal.tsx';
import { DocumentPreviewModal } from './components/DocumentPreviewModal.tsx';
import { GlobalSearchModal } from './components/GlobalSearchModal.tsx';
import { InjectCareLogo } from './components/InjectCareLogo.tsx';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [selectedLicenceId, setSelectedLicenceId] = useState<string | null>(null);
  const [showNewLicence, setShowNewLicence] = useState(false);
  
  const [showNewImport, setShowNewImport] = useState(false);
  const [importInitialLicenceId, setImportInitialLicenceId] = useState<string | undefined>();

  const [showNewExport, setShowNewExport] = useState(false);
  const [exportInitialLicenceId, setExportInitialLicenceId] = useState<string | undefined>();
  const [exportInitialObligationId, setExportInitialObligationId] = useState<string | undefined>();

  const [showUploadDoc, setShowUploadDoc] = useState(false);
  const [uploadLicenceId, setUploadLicenceId] = useState<string | undefined>();
  const [uploadImportId, setUploadImportId] = useState<string | undefined>();
  const [uploadExportId, setUploadExportId] = useState<string | undefined>();
  const [uploadDocType, setUploadDocType] = useState<any>();

  const [previewDocument, setPreviewDocument] = useState<any>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);

  useEffect(() => {
    loadGlobalData();

    // Global keyboard listener for Ctrl+K / Cmd+K search
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearchModal(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadGlobalData = async () => {
    try {
      const [dash, st] = await Promise.all([
        api.getDashboard(),
        api.getStatus()
      ]);
      setDashboardData(dash);
      setDbStatus(st);
    } catch (err) {
      console.error('Error loading global data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNewImport = (licenceId?: string) => {
    setImportInitialLicenceId(licenceId);
    setShowNewImport(true);
  };

  const handleOpenNewExport = (licenceId?: string, obligationId?: string) => {
    setExportInitialLicenceId(licenceId);
    setExportInitialObligationId(obligationId);
    setShowNewExport(true);
  };

  const handleOpenUpload = (licenceId?: string, importId?: string, exportId?: string, docType?: any) => {
    setUploadLicenceId(licenceId);
    setUploadImportId(importId);
    setUploadExportId(exportId);
    setUploadDocType(docType);
    setShowUploadDoc(true);
  };

  const badgeCounts = {
    licencesCount: dashboardData?.licence_summaries?.length || 0,
    importsCount: dashboardData?.kpis?.total_imports || 0,
    overdueObligationsCount: dashboardData?.kpis?.total_overdue_obligations || 0,
    pendingPartiesCount: dashboardData?.kpis?.total_missing_documents || 0
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-row font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white overflow-hidden">
      {/* Navigation Sidebar on the Left */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        badgeCounts={badgeCounts}
      />

      {/* Right Content Area: Header on top, main content below */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          onOpenSearch={() => setShowSearchModal(true)}
          onOpenNewLicence={() => setShowNewLicence(true)}
          onOpenNewImport={() => handleOpenNewImport()}
          onOpenNewExport={() => handleOpenNewExport()}
          onOpenUpload={() => handleOpenUpload()}
          dbStatus={dbStatus}
          overdueObligationsCount={dashboardData?.kpis?.total_overdue_obligations || 0}
          missingDocumentsCount={dashboardData?.kpis?.total_missing_documents || 0}
        />

        {/* View Content Body */}
        <main className="flex-1 overflow-y-auto">
          {loading && !dashboardData ? (
            <div className="flex items-center justify-center h-full p-12">
              <div className="text-center space-y-4 max-w-xs">
                <InjectCareLogo variant="card" className="mx-auto" />
                <div className="flex items-center justify-center space-x-2 text-xs font-semibold text-slate-600 font-mono">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Loading Advance Licence Dashboard...</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && dashboardData && (
                <DashboardView
                  data={dashboardData}
                  onOpenLicence={(id) => setSelectedLicenceId(id)}
                  onOpenNewLicence={() => setShowNewLicence(true)}
                  onOpenNewImport={handleOpenNewImport}
                  onOpenNewExport={handleOpenNewExport}
                  onOpenUpload={handleOpenUpload}
                  onRefresh={loadGlobalData}
                />
              )}

              {currentTab === 'licences' && (
                <LicencesView
                  onOpenLicence={(id) => setSelectedLicenceId(id)}
                  onOpenNewLicence={() => setShowNewLicence(true)}
                  onOpenNewImport={handleOpenNewImport}
                  onOpenNewExport={handleOpenNewExport}
                />
              )}

              {currentTab === 'imports' && (
                <ImportsView
                  onOpenNewImport={() => handleOpenNewImport()}
                  onOpenLicence={(id) => setSelectedLicenceId(id)}
                  onOpenUpload={handleOpenUpload}
                  onViewDocument={(doc) => setPreviewDocument(doc)}
                />
              )}

              {currentTab === 'obligations' && (
                <ObligationsView
                  onOpenNewExport={handleOpenNewExport}
                  onOpenLicence={(id) => setSelectedLicenceId(id)}
                />
              )}

              {currentTab === 'exports' && (
                <ExportsView
                  onOpenNewExport={() => handleOpenNewExport()}
                  onOpenLicence={(id) => setSelectedLicenceId(id)}
                  onOpenUpload={handleOpenUpload}
                  onViewDocument={(doc) => setPreviewDocument(doc)}
                />
              )}

              {currentTab === 'parties' && (
                <PartyFollowUpView
                  onOpenUpload={handleOpenUpload}
                  onOpenLicence={(id) => setSelectedLicenceId(id)}
                />
              )}

              {currentTab === 'documents' && (
                <DocumentsView
                  onOpenUpload={() => handleOpenUpload()}
                  onViewDocument={(doc) => setPreviewDocument(doc)}
                />
              )}

              {currentTab === 'reports' && (
                <ReportsView />
              )}

              {currentTab === 'settings' && (
                <SettingsView />
              )}
            </>
          )}
        </main>
      </div>

      {/* Central Module 9: Licence Master Detail View Modal */}
      {selectedLicenceId && (
        <LicenceDetailModal
          licenceId={selectedLicenceId}
          onClose={() => setSelectedLicenceId(null)}
          onOpenNewImport={handleOpenNewImport}
          onOpenNewExport={handleOpenNewExport}
          onOpenUpload={(lId) => handleOpenUpload(lId)}
          onViewDocument={(doc) => setPreviewDocument(doc)}
          onRefreshParent={loadGlobalData}
        />
      )}

      {/* New Licence Modal */}
      {showNewLicence && (
        <NewLicenceModal
          onClose={() => setShowNewLicence(false)}
          onSuccess={() => {
            loadGlobalData();
            setCurrentTab('licences');
          }}
        />
      )}

      {/* New Import Modal */}
      {showNewImport && (
        <NewImportModal
          initialLicenceId={importInitialLicenceId}
          onClose={() => {
            setShowNewImport(false);
            setImportInitialLicenceId(undefined);
          }}
          onSuccess={() => {
            loadGlobalData();
            if (currentTab === 'licences') {
              // keep
            } else {
              setCurrentTab('imports');
            }
          }}
        />
      )}

      {/* New Export Modal */}
      {showNewExport && (
        <NewExportModal
          initialLicenceId={exportInitialLicenceId}
          initialObligationId={exportInitialObligationId}
          onClose={() => {
            setShowNewExport(false);
            setExportInitialLicenceId(undefined);
            setExportInitialObligationId(undefined);
          }}
          onSuccess={() => {
            loadGlobalData();
            if (currentTab === 'licences' || currentTab === 'obligations') {
              // keep
            } else {
              setCurrentTab('exports');
            }
          }}
        />
      )}

      {/* Upload Document Modal */}
      {showUploadDoc && (
        <UploadDocumentModal
          initialLicenceId={uploadLicenceId}
          initialImportId={uploadImportId}
          initialExportId={uploadExportId}
          initialDocType={uploadDocType}
          onClose={() => {
            setShowUploadDoc(false);
            setUploadLicenceId(undefined);
            setUploadImportId(undefined);
            setUploadExportId(undefined);
            setUploadDocType(undefined);
          }}
          onSuccess={() => {
            loadGlobalData();
          }}
        />
      )}

      {/* Document PDF Preview Modal */}
      {previewDocument && (
        <DocumentPreviewModal
          document={previewDocument}
          onClose={() => setPreviewDocument(null)}
          onDelete={async (id) => {
            try {
              await api.deleteDocument(id);
              loadGlobalData();
            } catch (err: any) {
              alert(err.message);
            }
          }}
        />
      )}

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectLicence={(id) => setSelectedLicenceId(id)}
        onSelectDocument={(doc) => setPreviewDocument(doc)}
      />
    </div>
  );
}
