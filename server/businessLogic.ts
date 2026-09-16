import { 
  Licence, 
  LicenceProduct, 
  ImportRecord, 
  ExportObligation, 
  ExportRecord, 
  DocumentRecord,
  LicenceCalculations, 
  DashboardKPIs, 
  DocumentFollowUpItem, 
  PartyFollowUpSummary, 
  TransactionDocumentChecklist,
  DocumentType
} from '../src/types/index.ts';

export function calculateLicenceMetrics(
  licence: Licence,
  products: LicenceProduct[],
  imports: ImportRecord[],
  obligations: ExportObligation[],
  exports: ExportRecord[],
  documents: DocumentRecord[]
): LicenceCalculations {
  const licenceProducts = products.filter(p => p.licence_id === licence.id);
  const licenceImports = imports.filter(i => i.licence_id === licence.id);
  const licenceObligations = obligations.filter(o => o.licence_id === licence.id);
  const licenceExports = exports.filter(e => e.licence_id === licence.id);
  const licenceDocs = documents.filter(d => d.licence_id === licence.id);

  const totalApproved = licenceProducts.reduce((sum, p) => sum + (Number(p.approved_quantity) || 0), 0);
  const totalImported = licenceImports.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  const remainingImport = Math.max(0, totalApproved - totalImported);

  const totalObligationCreated = licenceObligations.reduce((sum, o) => sum + (Number(o.required_quantity) || 0), 0);
  const totalObligationFulfilled = licenceObligations.reduce((sum, o) => sum + (Number(o.completed_quantity) || 0), 0);
  const pendingObligation = Math.max(0, totalObligationCreated - totalObligationFulfilled);

  const utilizationPercent = totalApproved > 0 ? (totalImported / totalApproved) * 100 : 0;
  const fulfillmentPercent = totalObligationCreated > 0 ? (totalObligationFulfilled / totalObligationCreated) * 100 : 0;

  const today = new Date();
  const importValidity = new Date(licence.import_validity_date);
  const exportValidity = new Date(licence.export_validity_date);

  const msInDay = 1000 * 60 * 60 * 24;
  const daysToImportExpiry = Math.ceil((importValidity.getTime() - today.getTime()) / msInDay);
  const daysToExportExpiry = Math.ceil((exportValidity.getTime() - today.getTime()) / msInDay);

  // Missing documents count calculation for this licence
  let missingDocsCount = 0;
  // Check licence document
  const hasLicenceDoc = licenceDocs.some(d => d.document_type === 'Licence');
  if (!hasLicenceDoc) missingDocsCount++;

  // Check imports documents
  licenceImports.forEach(imp => {
    const hasBoe = licenceDocs.some(d => d.import_id === imp.id && d.document_type === 'Bill of Entry');
    if (!hasBoe) missingDocsCount++;
  });

  // Check exports documents
  licenceExports.forEach(exp => {
    const expDocs = licenceDocs.filter(d => d.export_id === exp.id);
    const hasSb = expDocs.some(d => d.document_type === 'Shipping Bill');
    const hasInv = expDocs.some(d => d.document_type === 'Export Invoice');
    const hasBrc = expDocs.some(d => d.document_type === 'BRC');
    if (!hasSb) missingDocsCount++;
    if (!hasInv) missingDocsCount++;
    if (!hasBrc) missingDocsCount++;
    if (exp.export_type === 'Third-Party Export') {
      const hasNoc = expDocs.some(d => d.document_type === 'NOC');
      if (!hasNoc) missingDocsCount++;
    }
  });

  return {
    licence: {
      ...licence,
      products: licenceProducts
    },
    licence_id: licence.id,
    licence_number: licence.licence_number,
    status: licence.status,
    product_name: licenceProducts[0]?.product_name || 'Pharmaceutical Injectable',
    total_approved_quantity: Number(totalApproved.toFixed(2)),
    total_imported_quantity: Number(totalImported.toFixed(2)),
    remaining_import_quantity: Number(remainingImport.toFixed(2)),
    total_export_obligation_created: Number(totalObligationCreated.toFixed(2)),
    total_obligation_fulfilled: Number(totalObligationFulfilled.toFixed(2)),
    pending_obligation: Number(pendingObligation.toFixed(2)),
    overall_licence_utilization_percent: Number(utilizationPercent.toFixed(1)),
    obligation_fulfillment_percent: Number(fulfillmentPercent.toFixed(1)),
    is_import_expired: daysToImportExpiry < 0,
    is_export_expired: daysToExportExpiry < 0,
    days_to_import_expiry: daysToImportExpiry,
    days_to_export_expiry: daysToExportExpiry,
    imports_count: licenceImports.length,
    obligations_count: licenceObligations.length,
    exports_count: licenceExports.length,
    missing_documents_count: missingDocsCount
  };
}

export function computeObligationForImport(
  importQty: number,
  product: LicenceProduct,
  importDate: string
): { requiredQuantity: number; dueDate: string } {
  // Formula: obligation = importQty * conversion_ratio / (1 - wastage/100) or configured net obligation ratio
  const wastage = product.wastage_percentage || 0;
  const conversionRatio = product.conversion_ratio || 1;
  
  // In pharma advance authorisation, if 1 kg API makes 7,500 vials with 2% allowed wastage:
  // Required finished product export = importQty * conversionRatio (net of wastage)
  // If product specifies net_obligation_quantity per approved unit:
  let requiredQuantity = 0;
  if (product.approved_quantity > 0 && product.net_obligation_quantity > 0) {
    const ratio = product.net_obligation_quantity / product.approved_quantity;
    requiredQuantity = importQty * ratio;
  } else {
    requiredQuantity = importQty * conversionRatio;
  }

  // Calculate due date: default 18 months from import date or product.obligation_period_months
  const date = new Date(importDate);
  const monthsToAdd = product.obligation_period_months || 18;
  date.setMonth(date.getMonth() + monthsToAdd);

  return {
    requiredQuantity: Number(requiredQuantity.toFixed(2)),
    dueDate: date.toISOString().split('T')[0]
  };
}

export function evaluateObligationStatus(
  requiredQty: number,
  completedQty: number,
  dueDate: string
): 'Pending' | 'Partially Fulfilled' | 'Completed' | 'Overdue' {
  const isPastDue = new Date(dueDate).getTime() < new Date().getTime();
  
  if (completedQty >= requiredQty && requiredQty > 0) {
    return 'Completed';
  }
  if (isPastDue) {
    return 'Overdue';
  }
  if (completedQty > 0) {
    return 'Partially Fulfilled';
  }
  return 'Pending';
}

export function getTransactionChecklist(
  type: 'import' | 'export',
  recordId: string,
  referenceNumber: string,
  exportType?: 'Direct Export' | 'Third-Party Export',
  documents: DocumentRecord[] = []
): TransactionDocumentChecklist {
  let requiredDocs: DocumentType[] = [];
  if (type === 'import') {
    requiredDocs = ['Bill of Entry'];
  } else {
    requiredDocs = ['Shipping Bill', 'Export Invoice', 'BRC'];
    if (exportType === 'Third-Party Export') {
      requiredDocs.push('NOC');
    }
  }

  const uploadedDocs = documents.filter(d => 
    type === 'import' ? d.import_id === recordId : d.export_id === recordId
  );

  const uploadedTypes = new Set(uploadedDocs.map(d => d.document_type));
  const missingDocs = requiredDocs.filter(req => !uploadedTypes.has(req));

  const totalRequired = requiredDocs.length;
  const totalUploaded = totalRequired - missingDocs.length;
  const pct = totalRequired > 0 ? Math.round((totalUploaded / totalRequired) * 100) : 100;

  return {
    transaction_id: recordId,
    transaction_type: type,
    reference_number: referenceNumber,
    required_documents: requiredDocs,
    uploaded_documents: uploadedDocs,
    missing_documents: missingDocs,
    total_required: totalRequired,
    total_uploaded: totalUploaded,
    completion_percentage: pct,
    is_complete: missingDocs.length === 0
  };
}

export function computePartyFollowUp(
  exports: ExportRecord[],
  documents: DocumentRecord[]
): PartyFollowUpSummary[] {
  const partyMap: Record<string, {
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
  }> = {};

  const today = new Date().getTime();
  const msInDay = 1000 * 60 * 60 * 24;

  for (const exp of exports) {
    const party = exp.party_name?.trim() || 'Unknown Party';
    if (!partyMap[party]) {
      partyMap[party] = {
        party_name: party,
        total_export_transactions: 0,
        pending_brc_count: 0,
        pending_noc_count: 0,
        other_pending_count: 0,
        total_pending_documents: 0,
        export_records: []
      };
    }

    const entry = partyMap[party];
    entry.total_export_transactions += 1;

    const checklist = getTransactionChecklist('export', exp.id, exp.invoice_number, exp.export_type, documents);
    const daysSince = Math.max(0, Math.floor((today - new Date(exp.export_date).getTime()) / msInDay));

    let brcPending = 0;
    let nocPending = 0;
    let otherPending = 0;

    checklist.missing_documents.forEach(doc => {
      if (doc === 'BRC') brcPending++;
      else if (doc === 'NOC') nocPending++;
      else otherPending++;
    });

    entry.pending_brc_count += brcPending;
    entry.pending_noc_count += nocPending;
    entry.other_pending_count += otherPending;
    entry.total_pending_documents += checklist.missing_documents.length;

    entry.export_records.push({
      export: exp,
      missing_docs: checklist.missing_documents,
      uploaded_docs: checklist.uploaded_documents,
      days_since_export: daysSince
    });
  }

  return Object.values(partyMap).sort((a, b) => b.total_pending_documents - a.total_pending_documents);
}

export function computeDashboardKPIs(
  licences: Licence[],
  products: LicenceProduct[],
  imports: ImportRecord[],
  obligations: ExportObligation[],
  documents: DocumentRecord[],
  exports: ExportRecord[]
): DashboardKPIs {
  const activeLicences = licences.filter(l => l.status === 'Active' || l.status === 'Expiring Soon');
  const totalApproved = products.reduce((sum, p) => sum + (Number(p.approved_quantity) || 0), 0);
  const totalImported = imports.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  const remainingImport = Math.max(0, totalApproved - totalImported);

  const totalObligation = obligations.reduce((sum, o) => sum + (Number(o.required_quantity) || 0), 0);
  const completedObligation = obligations.reduce((sum, o) => sum + (Number(o.completed_quantity) || 0), 0);
  const pendingObligation = Math.max(0, totalObligation - completedObligation);

  const today = new Date().getTime();
  const overdueObligations = obligations.filter(o => {
    return o.status === 'Overdue' || (new Date(o.due_date).getTime() < today && o.pending_quantity > 0);
  }).length;

  // Pending documents calculation
  let pendingDocs = 0;
  // Check licences missing PDF
  licences.forEach(l => {
    if (!documents.some(d => d.licence_id === l.id && d.document_type === 'Licence')) {
      pendingDocs++;
    }
  });
  // Check imports missing BOE
  imports.forEach(i => {
    if (!documents.some(d => d.import_id === i.id && d.document_type === 'Bill of Entry')) {
      pendingDocs++;
    }
  });
  // Check exports missing docs
  exports.forEach(e => {
    const docs = documents.filter(d => d.export_id === e.id);
    if (!docs.some(d => d.document_type === 'Shipping Bill')) pendingDocs++;
    if (!docs.some(d => d.document_type === 'Export Invoice')) pendingDocs++;
    if (!docs.some(d => d.document_type === 'BRC')) pendingDocs++;
    if (e.export_type === 'Third-Party Export' && !docs.some(d => d.document_type === 'NOC')) {
      pendingDocs++;
    }
  });

  const overallUtilization = totalApproved > 0 ? Number(((totalImported / totalApproved) * 100).toFixed(1)) : 0;

  return {
    active_licences_count: activeLicences.length,
    active_licences: activeLicences.length,
    total_licences: licences.length,
    total_approved_import_quantity: Number(totalApproved.toFixed(2)),
    total_imported_quantity: Number(totalImported.toFixed(2)),
    remaining_import_quantity: Number(remainingImport.toFixed(2)),
    total_export_obligation: Number(totalObligation.toFixed(2)),
    export_obligation_completed: Number(completedObligation.toFixed(2)),
    total_obligation_fulfilled: Number(completedObligation.toFixed(2)),
    pending_export_obligation: Number(pendingObligation.toFixed(2)),
    total_pending_obligation: Number(pendingObligation.toFixed(2)),
    overdue_obligations_count: overdueObligations,
    total_overdue_obligations: overdueObligations,
    pending_documents_count: pendingDocs,
    total_missing_documents: pendingDocs,
    overall_utilization_rate: overallUtilization
  };
}

export function computeDocumentFollowUpList(
  licences: Licence[],
  imports: ImportRecord[],
  exports: ExportRecord[],
  documents: DocumentRecord[]
): DocumentFollowUpItem[] {
  const items: DocumentFollowUpItem[] = [];
  const today = new Date().getTime();
  const msInDay = 1000 * 60 * 60 * 24;

  // 1. Licences
  licences.forEach(l => {
    const hasDoc = documents.some(d => d.licence_id === l.id && d.document_type === 'Licence');
    if (!hasDoc) {
      const days = Math.floor((today - new Date(l.issue_date).getTime()) / msInDay);
      items.push({
        id: `doc-lic-${l.id}`,
        missing_document: 'Licence',
        licence_id: l.id,
        licence_number: l.licence_number,
        transaction_type: 'licence',
        transaction_id: l.id,
        invoice_number: l.licence_number,
        party_or_supplier: 'DGFT / Customs',
        transaction_date: l.issue_date,
        days_pending: days,
        urgency: days > 60 ? 'critical' : days > 30 ? 'high' : days > 14 ? 'medium' : 'low'
      });
    }
  });

  // 2. Imports (Bill of Entry)
  imports.forEach(imp => {
    const hasBoe = documents.some(d => d.import_id === imp.id && d.document_type === 'Bill of Entry');
    const lic = licences.find(l => l.id === imp.licence_id);
    if (!hasBoe) {
      const days = Math.floor((today - new Date(imp.import_date).getTime()) / msInDay);
      items.push({
        id: `doc-imp-${imp.id}`,
        missing_document: 'Bill of Entry',
        licence_id: imp.licence_id,
        licence_number: lic?.licence_number || 'Unknown',
        transaction_type: 'import',
        transaction_id: imp.id,
        invoice_number: imp.invoice_number,
        party_or_supplier: imp.supplier,
        transaction_date: imp.import_date,
        days_pending: days,
        urgency: days > 30 ? 'critical' : days > 14 ? 'high' : 'medium'
      });
    }
  });

  // 3. Exports
  exports.forEach(exp => {
    const expDocs = documents.filter(d => d.export_id === exp.id);
    const lic = licences.find(l => l.id === exp.licence_id);
    const days = Math.floor((today - new Date(exp.export_date).getTime()) / msInDay);

    const checkAndPush = (docType: DocumentType, criticalDays: number) => {
      const exists = expDocs.some(d => d.document_type === docType);
      if (!exists) {
        items.push({
          id: `doc-exp-${exp.id}-${docType.replace(/\s+/g, '')}`,
          missing_document: docType,
          licence_id: exp.licence_id,
          licence_number: lic?.licence_number || 'Unknown',
          transaction_type: 'export',
          transaction_id: exp.id,
          invoice_number: exp.invoice_number,
          party_or_supplier: exp.party_name,
          transaction_date: exp.export_date,
          days_pending: days,
          urgency: days > criticalDays ? 'critical' : days > (criticalDays / 2) ? 'high' : 'medium'
        });
      }
    };

    checkAndPush('Shipping Bill', 15);
    checkAndPush('Export Invoice', 7);
    checkAndPush('BRC', 90); // BRC often takes up to 90 days
    if (exp.export_type === 'Third-Party Export') {
      checkAndPush('NOC', 30);
    }
  });

  return items.sort((a, b) => b.days_pending - a.days_pending);
}
