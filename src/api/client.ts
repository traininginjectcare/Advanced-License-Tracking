import { 
  Licence, 
  LicenceProduct, 
  ImportRecord, 
  ExportObligation, 
  ExportRecord, 
  DocumentRecord, 
  DashboardKPIs,
  LicenceCalculations,
  DocumentFollowUpItem,
  PartyFollowUpSummary,
  TransactionDocumentChecklist
} from '../types/index.ts';
import { getCachedAccessToken } from '../lib/firebase.ts';

function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getCachedAccessToken();
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface DashboardResponse {
  kpis: DashboardKPIs;
  licence_summaries: LicenceCalculations[];
  obligations: ExportObligation[];
  document_follow_ups: DocumentFollowUpItem[];
}

export interface LicenceDetailResponse {
  licence: Licence;
  metrics: LicenceCalculations;
  products: LicenceProduct[];
  imports: (ImportRecord & { checklist: TransactionDocumentChecklist })[];
  obligations: ExportObligation[];
  exports: (ExportRecord & { checklist: TransactionDocumentChecklist })[];
  documents: DocumentRecord[];
  missing_documents: DocumentFollowUpItem[];
}

export const api = {
  // Status
  async getStatus() {
    const res = await fetch('/api/status');
    const json = await res.json();
    return json.status;
  },

  async seedData() {
    const res = await fetch('/api/seed', { method: 'POST' });
    return res.json();
  },

  // Dashboard
  async getDashboard(): Promise<DashboardResponse> {
    const res = await fetch('/api/dashboard');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch dashboard');
    return json.data;
  },

  // Licences
  async getLicences(): Promise<(Licence & { metrics: LicenceCalculations })[]> {
    const res = await fetch('/api/licences');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch licences');
    return json.licences;
  },

  async getLicenceDetail(id: string): Promise<LicenceDetailResponse> {
    const res = await fetch(`/api/licences/${id}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch licence details');
    return json.data;
  },

  async createLicence(data: {
    licence_number: string;
    issue_date: string;
    import_validity_date: string;
    export_validity_date: string;
    products: Array<{
      product_name: string;
      product_type: string;
      approved_quantity: number;
      unit: string;
      wastage_percentage: number;
      net_obligation_quantity: number;
      conversion_ratio: number;
      obligation_period_months: number;
    }>;
  }) {
    const res = await fetch('/api/licences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to create licence');
    return json.licence;
  },

  async updateLicence(id: string, updates: Partial<Licence>) {
    const res = await fetch(`/api/licences/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update licence');
    return json.licence;
  },

  async deleteLicence(id: string) {
    const res = await fetch(`/api/licences/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to delete licence');
    return json;
  },

  // Imports
  async getImports(licenceId?: string): Promise<(ImportRecord & { checklist: TransactionDocumentChecklist })[]> {
    const url = licenceId ? `/api/imports?licence_id=${licenceId}` : '/api/imports';
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch imports');
    return json.imports;
  },

  async createImport(data: {
    licence_id: string;
    licence_product_id: string;
    import_date: string;
    invoice_number: string;
    supplier: string;
    quantity: number;
    unit: string;
    bill_of_entry_number: string;
    remarks?: string;
    allow_overdraw?: boolean;
  }) {
    const res = await fetch('/api/imports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!json.success) {
      const err: any = new Error(json.error || 'Failed to create import');
      err.warning = json.warning;
      throw err;
    }
    return json;
  },

  async deleteImport(id: string) {
    const res = await fetch(`/api/imports/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to delete import');
    return json;
  },

  // Obligations
  async getObligations(licenceId?: string): Promise<ExportObligation[]> {
    const url = licenceId ? `/api/obligations?licence_id=${licenceId}` : '/api/obligations';
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch obligations');
    return json.obligations;
  },

  // Exports
  async getExports(licenceId?: string): Promise<(ExportRecord & { checklist: TransactionDocumentChecklist })[]> {
    const url = licenceId ? `/api/exports?licence_id=${licenceId}` : '/api/exports';
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch exports');
    return json.exports;
  },

  async createExport(data: {
    licence_id: string;
    obligation_id: string;
    export_date: string;
    invoice_number: string;
    export_type: 'Direct Export' | 'Third-Party Export';
    party_name: string;
    product: string;
    quantity: number;
    unit: string;
    shipping_bill_number: string;
    remarks?: string;
    allow_excess?: boolean;
  }) {
    const res = await fetch('/api/exports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!json.success) {
      const err: any = new Error(json.error || 'Failed to create export');
      err.warning = json.warning;
      throw err;
    }
    return json;
  },

  async deleteExport(id: string) {
    const res = await fetch(`/api/exports/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to delete export');
    return json;
  },

  // Party Follow-up
  async getParties(): Promise<PartyFollowUpSummary[]> {
    const res = await fetch('/api/parties');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch parties');
    return json.parties;
  },

  // Documents
  async getDocuments(filter?: { licence_id?: string; import_id?: string; export_id?: string }): Promise<DocumentRecord[]> {
    let q = '';
    if (filter?.licence_id) q += `licence_id=${filter.licence_id}&`;
    if (filter?.import_id) q += `import_id=${filter.import_id}&`;
    if (filter?.export_id) q += `export_id=${filter.export_id}&`;
    const res = await fetch(`/api/documents?${q}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch documents');
    return json.documents;
  },

  async uploadDocument(formData: FormData) {
    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to upload document');
    return json;
  },

  async deleteDocument(id: string) {
    const res = await fetch(`/api/documents/${id}`, { 
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to delete document');
    return json;
  },

  // Official Logo Management
  async getLogo(): Promise<{ hasCustomLogo: boolean; url: string }> {
    try {
      const res = await fetch('/api/logo');
      return await res.json();
    } catch {
      return { hasCustomLogo: false, url: '/injectcare-logo.svg' };
    }
  },

  async uploadLogo(file: File): Promise<{ success: boolean; url: string }> {
    const formData = new FormData();
    formData.append('logo', file);
    const res = await fetch('/api/upload-logo', {
      method: 'POST',
      body: formData,
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to upload logo');
    return json;
  },

  async resetLogo(): Promise<{ success: boolean }> {
    const res = await fetch('/api/logo', { method: 'DELETE' });
    return await res.json();
  }
};
