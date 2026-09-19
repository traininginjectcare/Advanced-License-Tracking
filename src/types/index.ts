export type ProductType = 'Raw Material / API' | 'Finished Product' | 'Packaging Material' | 'Intermediate';

export type ExportType = 'Direct Export' | 'Third-Party Export';

export type ObligationStatus = 'Pending' | 'Partially Fulfilled' | 'Completed' | 'Overdue';

export type LicenceStatus = 'Active' | 'Expiring Soon' | 'Expired' | 'Surrendered' | 'Fulfilled';

export type DocumentType = 
  | 'Licence' 
  | 'Bill of Entry' 
  | 'Export Invoice' 
  | 'Shipping Bill' 
  | 'BRC' 
  | 'NOC' 
  | 'DEEC Declaration'
  | 'Other';

export interface LicenceProduct {
  id: string;
  licence_id: string;
  product_name: string;
  product_type: ProductType;
  approved_quantity: number;
  unit: string;
  wastage_percentage: number;
  gross_obligation_quantity?: number;
  net_obligation_quantity: number;
  conversion_ratio: number;
  obligation_period_months?: number;
  created_at: string;
}

export interface Licence {
  id: string;
  licence_number: string;
  issue_date: string;
  import_validity_date: string;
  export_validity_date: string;
  licence_document_path?: string;
  status: LicenceStatus;
  created_at: string;
  updated_at: string;
  products?: LicenceProduct[];
}

export interface ImportProductItem {
  licence_product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
}

export interface ImportRecord {
  id: string;
  licence_id: string;
  licence_product_id?: string;
  import_date: string;
  invoice_number: string;
  supplier: string;
  quantity: number;
  unit: string;
  bill_of_entry_number?: string;
  remarks?: string;
  items?: ImportProductItem[];
  created_at: string;
  // Joined fields
  licence_number?: string;
  product_name?: string;
  documents?: DocumentRecord[];
}

export interface ExportObligation {
  id: string;
  licence_id: string;
  import_id: string;
  required_quantity: number;
  completed_quantity: number;
  pending_quantity: number;
  due_date: string;
  status: ObligationStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  licence_number?: string;
  import_invoice_number?: string;
  import_date?: string;
  supplier?: string;
  imported_quantity?: number;
  product_name?: string;
  unit?: string;
  days_remaining?: number;
}

export interface ExportBatchItem {
  batch_number: string;
  quantity: number;
}

export interface ExportProductItem {
  product: string;
  quantity: number;
  unit: string;
  gross_quantity?: number;
  net_quantity?: number;
  batches?: ExportBatchItem[];
}

export interface ExportRecord {
  id: string;
  licence_id: string;
  obligation_id?: string;
  export_date: string;
  invoice_number: string;
  export_type: ExportType;
  party_name: string;
  product: string;
  quantity: number;
  unit: string;
  gross_quantity?: number;
  net_quantity?: number;
  shipping_bill_number?: string;
  remarks?: string;
  items?: ExportProductItem[];
  batches?: ExportBatchItem[];
  created_at: string;
  // Joined fields
  licence_number?: string;
  import_invoice_number?: string;
  documents?: DocumentRecord[];
}

export interface DocumentRecord {
  id: string;
  licence_id?: string;
  import_id?: string;
  export_id?: string;
  document_type: DocumentType;
  file_name: string;
  storage_path: string;
  drive_file_id?: string;
  drive_web_view_link?: string;
  mime_type: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by: string;
}

export interface TransactionDocumentChecklist {
  transaction_id: string;
  transaction_type: 'import' | 'export';
  reference_number: string;
  required_documents: DocumentType[];
  uploaded_documents: DocumentRecord[];
  missing_documents: DocumentType[];
  total_required: number;
  total_uploaded: number;
  completion_percentage: number;
  is_complete: boolean;
}

export interface PartyFollowUpSummary {
  party_name: string;
  total_export_transactions: number;
  pending_brc_count: number;
  pending_noc_count: number;
  other_pending_count: number;
  total_pending_documents: number;
  export_records: {
    export: ExportRecord;
    missing_docs: DocumentType[];
    uploaded_docs: DocumentRecord[];
    days_since_export: number;
  }[];
}

export interface LicenceCalculations {
  licence: Licence;
  licence_id?: string;
  licence_number?: string;
  status?: LicenceStatus;
  product_name?: string;
  total_approved_quantity: number;
  total_imported_quantity: number;
  remaining_import_quantity: number;
  total_export_obligation_created: number;
  total_obligation_fulfilled: number;
  pending_obligation: number;
  overall_licence_utilization_percent: number;
  obligation_fulfillment_percent: number;
  is_import_expired: boolean;
  is_export_expired: boolean;
  days_to_import_expiry: number;
  days_to_export_expiry: number;
  imports_count: number;
  obligations_count: number;
  exports_count: number;
  missing_documents_count: number;
}

export interface DashboardKPIs {
  active_licences_count: number;
  active_licences?: number;
  total_licences?: number;
  total_approved_import_quantity: number;
  total_imported_quantity: number;
  remaining_import_quantity: number;
  total_export_obligation: number;
  export_obligation_completed: number;
  total_obligation_fulfilled?: number;
  pending_export_obligation: number;
  total_pending_obligation?: number;
  overdue_obligations_count: number;
  total_overdue_obligations?: number;
  pending_documents_count: number;
  total_missing_documents?: number;
  overall_utilization_rate?: number;
}

export interface DocumentFollowUpItem {
  id: string;
  missing_document: DocumentType;
  licence_id: string;
  licence_number: string;
  transaction_type: 'licence' | 'import' | 'export';
  transaction_id: string;
  invoice_number: string;
  party_or_supplier: string;
  transaction_date: string;
  days_pending: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}
