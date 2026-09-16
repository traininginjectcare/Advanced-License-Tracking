import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { dbService } from './server/db.ts';
import { googleDriveService } from './server/googleDrive.ts';
import { 
  calculateLicenceMetrics, 
  computeObligationForImport, 
  evaluateObligationStatus, 
  computePartyFollowUp, 
  computeDashboardKPIs, 
  computeDocumentFollowUpList, 
  getTransactionChecklist 
} from './server/businessLogic.ts';

// Multer in-memory storage for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max file size
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Extract Google Drive OAuth token from Authorization Bearer header if provided
  app.use((req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token && token !== 'undefined' && token !== 'null') {
        googleDriveService.setActiveToken(token);
      }
    }
    next();
  });

  // --- 1. SYSTEM & STATUS ROUTES ---
  app.get('/api/status', async (req, res) => {
    try {
      const status = await dbService.getStatus();
      res.json({ success: true, status });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/seed', async (req, res) => {
    try {
      await dbService.seedPharmaData();
      res.json({ success: true, message: 'Seeded realistic pharmaceutical compliance data successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- 2. DASHBOARD METRICS ---
  app.get('/api/dashboard', async (req, res) => {
    try {
      const db = dbService.getAllData();
      const kpis = computeDashboardKPIs(
        db.licences,
        db.licence_products,
        db.imports,
        db.export_obligations,
        db.documents,
        db.exports
      );

      // Licence summaries
      const licenceSummaries = db.licences.map(l => 
        calculateLicenceMetrics(l, db.licence_products, db.imports, db.export_obligations, db.exports, db.documents)
      );

      // Detailed obligations
      const obligations = await dbService.getObligations();

      // Document follow-up items
      const documentFollowUps = computeDocumentFollowUpList(
        db.licences,
        db.imports,
        db.exports,
        db.documents
      );

      res.json({
        success: true,
        data: {
          kpis,
          licence_summaries: licenceSummaries,
          obligations,
          document_follow_ups: documentFollowUps
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- 3. LICENCES ROUTES ---
  app.get('/api/licences', async (req, res) => {
    try {
      const licences = await dbService.getLicences();
      const db = dbService.getAllData();
      
      const enriched = licences.map(l => {
        const metrics = calculateLicenceMetrics(
          l, 
          db.licence_products, 
          db.imports, 
          db.export_obligations, 
          db.exports, 
          db.documents
        );
        return {
          ...l,
          metrics
        };
      });

      res.json({ success: true, licences: enriched });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/licences/:id', async (req, res) => {
    try {
      const licence = await dbService.getLicenceById(req.params.id);
      if (!licence) {
        return res.status(404).json({ success: false, error: 'Licence not found' });
      }

      const db = dbService.getAllData();
      const metrics = calculateLicenceMetrics(
        licence,
        db.licence_products,
        db.imports,
        db.export_obligations,
        db.exports,
        db.documents
      );

      const licenceImports = await dbService.getImports(licence.id);
      const licenceObligations = await dbService.getObligations(licence.id);
      const licenceExports = await dbService.getExports(licence.id);
      const licenceDocs = await dbService.getDocuments({ licence_id: licence.id });

      // Enriched imports with checklist
      const enrichedImports = licenceImports.map(imp => ({
        ...imp,
        checklist: getTransactionChecklist('import', imp.id, imp.invoice_number, undefined, licenceDocs)
      }));

      // Enriched exports with checklist
      const enrichedExports = licenceExports.map(exp => ({
        ...exp,
        checklist: getTransactionChecklist('export', exp.id, exp.invoice_number, exp.export_type, licenceDocs)
      }));

      // Missing documents for this licence specifically
      const missingDocuments = computeDocumentFollowUpList([licence], licenceImports, licenceExports, licenceDocs);

      res.json({
        success: true,
        data: {
          licence,
          metrics,
          products: licence.products || [],
          imports: enrichedImports,
          obligations: licenceObligations,
          exports: enrichedExports,
          documents: licenceDocs,
          missing_documents: missingDocuments
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/licences', async (req, res) => {
    try {
      const { licence_number, issue_date, import_validity_date, export_validity_date, products } = req.body;
      
      if (!licence_number || !issue_date || !import_validity_date || !export_validity_date) {
        return res.status(400).json({ success: false, error: 'Licence Number, Issue Date, and Validity Dates are required.' });
      }

      const existing = (await dbService.getLicences()).find(
        l => l.licence_number.toLowerCase() === licence_number.trim().toLowerCase()
      );
      if (existing) {
        return res.status(400).json({ success: false, error: `Licence ${licence_number} already exists.` });
      }

      const created = await dbService.createLicence({
        licence_number,
        issue_date,
        import_validity_date,
        export_validity_date,
        status: 'Active',
        products: products || []
      });

      res.json({ success: true, licence: created });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/licences/:id', async (req, res) => {
    try {
      const updated = await dbService.updateLicence(req.params.id, req.body);
      if (!updated) return res.status(404).json({ success: false, error: 'Licence not found' });
      res.json({ success: true, licence: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/licences/:id', async (req, res) => {
    try {
      await dbService.deleteLicence(req.params.id);
      res.json({ success: true, message: 'Licence deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/licences/:id/products', async (req, res) => {
    try {
      const { product_name, product_type, approved_quantity, unit, wastage_percentage, net_obligation_quantity, conversion_ratio, obligation_period_months } = req.body;
      if (!product_name || !approved_quantity || !unit) {
        return res.status(400).json({ success: false, error: 'Product name, approved quantity and unit are required.' });
      }

      const product = await dbService.addProductToLicence({
        licence_id: req.params.id,
        product_name,
        product_type: product_type || 'Raw Material / API',
        approved_quantity: Number(approved_quantity),
        unit,
        wastage_percentage: Number(wastage_percentage) || 0,
        net_obligation_quantity: Number(net_obligation_quantity) || 0,
        conversion_ratio: Number(conversion_ratio) || 1,
        obligation_period_months: Number(obligation_period_months) || 18
      });

      res.json({ success: true, product });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- 4. IMPORTS ROUTES ---
  app.get('/api/imports', async (req, res) => {
    try {
      const licenceId = req.query.licence_id as string | undefined;
      const imports = await dbService.getImports(licenceId);
      const docs = await dbService.getDocuments();

      const enriched = imports.map(imp => ({
        ...imp,
        checklist: getTransactionChecklist('import', imp.id, imp.invoice_number, undefined, docs)
      }));

      res.json({ success: true, imports: enriched });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/imports', async (req, res) => {
    try {
      const { 
        licence_id, 
        licence_product_id, 
        import_date, 
        invoice_number, 
        supplier, 
        quantity, 
        unit, 
        bill_of_entry_number, 
        remarks,
        allow_overdraw 
      } = req.body;

      if (!licence_id || !licence_product_id || !import_date || !invoice_number || !supplier || !quantity || !bill_of_entry_number) {
        return res.status(400).json({ success: false, error: 'All mandatory import fields must be provided.' });
      }

      const products = await dbService.getLicenceProducts(licence_id);
      const targetProduct = products.find(p => p.id === licence_product_id);
      if (!targetProduct) {
        return res.status(400).json({ success: false, error: 'Target licence product line not found.' });
      }

      // Check current total imported for this product
      const existingImports = (await dbService.getImports(licence_id)).filter(i => i.licence_product_id === licence_product_id);
      const currentImported = existingImports.reduce((sum, i) => sum + Number(i.quantity), 0);
      const remainingAllowed = targetProduct.approved_quantity - currentImported;
      const requestedQty = Number(quantity);

      if (requestedQty > remainingAllowed && !allow_overdraw) {
        return res.status(400).json({ 
          success: false, 
          warning: true,
          error: `Import quantity (${requestedQty.toLocaleString()} ${unit}) exceeds remaining approved licence quantity (${remainingAllowed.toLocaleString()} ${unit}). Please confirm overdraw authorisation before proceeding.` 
        });
      }

      // Automatically compute export obligation and due date
      const { requiredQuantity, dueDate } = computeObligationForImport(requestedQty, targetProduct, import_date);

      const result = await dbService.createImport(
        {
          licence_id,
          licence_product_id,
          import_date,
          invoice_number,
          supplier,
          quantity: requestedQty,
          unit: unit || targetProduct.unit,
          bill_of_entry_number,
          remarks
        },
        dueDate,
        requiredQuantity
      );

      res.json({
        success: true,
        import: result.importRecord,
        obligation: result.obligation,
        message: `Import recorded successfully. Linked export obligation of ${requiredQuantity.toLocaleString()} ${targetProduct.product_type === 'Raw Material / API' ? 'finished units' : targetProduct.unit} generated automatically with due date ${dueDate}.`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/imports/:id', async (req, res) => {
    try {
      await dbService.deleteImport(req.params.id);
      res.json({ success: true, message: 'Import and linked obligation removed.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // --- 5. OBLIGATIONS ROUTES ---
  app.get('/api/obligations', async (req, res) => {
    try {
      const licenceId = req.query.licence_id as string | undefined;
      const obligations = await dbService.getObligations(licenceId);
      res.json({ success: true, obligations });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- 6. EXPORTS ROUTES ---
  app.get('/api/exports', async (req, res) => {
    try {
      const licenceId = req.query.licence_id as string | undefined;
      const exports = await dbService.getExports(licenceId);
      const docs = await dbService.getDocuments();

      const enriched = exports.map(exp => ({
        ...exp,
        checklist: getTransactionChecklist('export', exp.id, exp.invoice_number, exp.export_type, docs)
      }));

      res.json({ success: true, exports: enriched });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/exports', async (req, res) => {
    try {
      const {
        licence_id,
        obligation_id,
        export_date,
        invoice_number,
        export_type,
        party_name,
        product,
        quantity,
        unit,
        shipping_bill_number,
        remarks,
        allow_excess
      } = req.body;

      if (!licence_id || !obligation_id || !export_date || !invoice_number || !party_name || !product || !quantity || !shipping_bill_number) {
        return res.status(400).json({ success: false, error: 'All mandatory export fields must be provided.' });
      }

      const obligations = await dbService.getObligations(licence_id);
      const targetObligation = obligations.find(o => o.id === obligation_id);
      if (!targetObligation) {
        return res.status(400).json({ success: false, error: 'Selected export obligation record not found.' });
      }

      const exportQty = Number(quantity);
      if (exportQty > targetObligation.pending_quantity && !allow_excess) {
        return res.status(400).json({
          success: false,
          warning: true,
          error: `Export quantity (${exportQty.toLocaleString()} ${unit}) exceeds pending obligation balance (${targetObligation.pending_quantity.toLocaleString()} ${unit}). Please confirm excess allocation.`
        });
      }

      const createdExport = await dbService.createExport({
        licence_id,
        obligation_id,
        export_date,
        invoice_number,
        export_type: export_type || 'Direct Export',
        party_name,
        product,
        quantity: exportQty,
        unit,
        shipping_bill_number,
        remarks
      });

      res.json({
        success: true,
        export: createdExport,
        message: 'Export logged successfully. Obligation balance updated.'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/exports/:id', async (req, res) => {
    try {
      await dbService.deleteExport(req.params.id);
      res.json({ success: true, message: 'Export deleted and obligation balance restored.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // --- 7. PARTY FOLLOW-UP ROUTE ---
  app.get('/api/parties', async (req, res) => {
    try {
      const exports = await dbService.getExports();
      const docs = await dbService.getDocuments();
      const partySummary = computePartyFollowUp(exports, docs);
      res.json({ success: true, parties: partySummary });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- 8. DOCUMENTS ROUTES (Supabase Storage & Local Fallback) ---
  app.get('/api/documents', async (req, res) => {
    try {
      const filter: any = {};
      if (req.query.licence_id) filter.licence_id = req.query.licence_id;
      if (req.query.import_id) filter.import_id = req.query.import_id;
      if (req.query.export_id) filter.export_id = req.query.export_id;

      const documents = await dbService.getDocuments(filter);
      res.json({ success: true, documents });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
    try {
      const { licence_id, import_id, export_id, document_type, uploaded_by } = req.body;
      const file = req.file;

      if (!document_type) {
        return res.status(400).json({ success: false, error: 'Document type is required.' });
      }

      // Fetch licence number for path structure
      let licenceNumber = 'GENERAL';
      if (licence_id) {
        const lic = await dbService.getLicenceById(licence_id);
        if (lic) licenceNumber = lic.licence_number.replace(/[^a-zA-Z0-9_-]/g, '_');
      }

      const originalName = file ? file.originalname : `${document_type}.pdf`;
      const mimeType = file ? file.mimetype : 'application/pdf';
      const fileSize = file ? file.size : 1024;
      const fileBuffer = file ? file.buffer : Buffer.from('%PDF-1.4\nSample Compliance Document Content');

      // Generate structured predictable storage path
      let storagePath = '';
      const timestamp = Date.now();
      const sanitizedFileName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');

      let docTypeCategory: 'Licence' | 'Import' | 'Export' = 'Licence';
      let invoiceNumber: string | undefined = undefined;

      if (import_id) {
        docTypeCategory = 'Import';
        const imports = await dbService.getImports();
        const imp = imports.find(i => i.id === import_id);
        invoiceNumber = imp?.invoice_number || 'IMP';
        const inv = invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
        storagePath = `${licenceNumber}/Imports/${inv}/${timestamp}_${sanitizedFileName}`;
      } else if (export_id) {
        docTypeCategory = 'Export';
        const exports = await dbService.getExports();
        const exp = exports.find(e => e.id === export_id);
        invoiceNumber = exp?.invoice_number || 'EXP';
        const inv = invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
        storagePath = `${licenceNumber}/Exports/${inv}/${timestamp}_${sanitizedFileName}`;
      } else {
        docTypeCategory = 'Licence';
        storagePath = `${licenceNumber}/Licence/${timestamp}_${sanitizedFileName}`;
      }

      // Check for Google Drive token
      const authHeader = req.headers['authorization'];
      const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null) || googleDriveService.getActiveToken();

      let driveFileId: string | undefined;
      let driveWebViewLink: string | undefined;

      if (token) {
        try {
          const targetFolderId = await googleDriveService.getTargetFolder(token, {
            licenceNumber,
            docTypeCategory,
            invoiceNumber
          });

          const driveUpload = await googleDriveService.uploadFile(
            token,
            targetFolderId,
            originalName,
            mimeType,
            fileBuffer
          );

          driveFileId = driveUpload.id;
          driveWebViewLink = driveUpload.webViewLink;
          console.log(`[Google Drive] Uploaded ${originalName} to Drive (ID: ${driveFileId})`);
        } catch (driveErr: any) {
          console.warn('[Google Drive] Upload notice:', driveErr.message);
        }
      }

      const doc = await dbService.createDocumentRecord({
        licence_id: licence_id || undefined,
        import_id: import_id || undefined,
        export_id: export_id || undefined,
        document_type: document_type,
        file_name: originalName,
        storage_path: storagePath,
        drive_file_id: driveFileId,
        drive_web_view_link: driveWebViewLink,
        mime_type: mimeType,
        file_size: fileSize,
        uploaded_by: uploaded_by || 'Compliance Officer'
      }, fileBuffer);

      res.json({
        success: true,
        document: doc,
        message: driveFileId 
          ? `${document_type} uploaded to Google Drive & recorded in Firestore.` 
          : `${document_type} registered in compliance repository.`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/documents/view/:id', async (req, res) => {
    try {
      const docs = await dbService.getDocuments();
      const doc = docs.find(d => d.id === req.params.id);
      if (!doc) {
        return res.status(404).send('Document not found');
      }

      const authHeader = req.headers['authorization'];
      const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null) || googleDriveService.getActiveToken() || undefined;

      const fileData = await dbService.getDocumentFile(doc.storage_path, doc.drive_file_id, token);
      if (!fileData) {
        const placeholderPdf = Buffer.from(
          `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000060 00000 n\n0000000117 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n193\n%%EOF\n`
        );
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${doc.file_name}"`);
        return res.send(placeholderPdf);
      }

      res.setHeader('Content-Type', fileData.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${doc.file_name}"`);
      res.send(fileData.buffer);
    } catch (err: any) {
      res.status(500).send('Error retrieving document: ' + err.message);
    }
  });

  app.get('/api/documents/download/:id', async (req, res) => {
    try {
      const docs = await dbService.getDocuments();
      const doc = docs.find(d => d.id === req.params.id);
      if (!doc) {
        return res.status(404).send('Document not found');
      }

      const authHeader = req.headers['authorization'];
      const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null) || googleDriveService.getActiveToken() || undefined;

      const fileData = await dbService.getDocumentFile(doc.storage_path, doc.drive_file_id, token);
      if (!fileData) {
        return res.status(404).send('Document file content not found');
      }

      res.setHeader('Content-Type', fileData.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name}"`);
      res.send(fileData.buffer);
    } catch (err: any) {
      res.status(500).send('Error downloading document: ' + err.message);
    }
  });

  app.delete('/api/documents/:id', async (req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null) || googleDriveService.getActiveToken() || undefined;
      await dbService.deleteDocument(req.params.id, token);
      res.json({ success: true, message: 'Document removed from Firestore and Google Drive.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- 9. CSV / EXCEL REPORTS GENERATION ---
  app.get('/api/reports/export', async (req, res) => {
    try {
      const type = (req.query.type as string) || 'licence_utilization';
      const db = dbService.getAllData();

      let csv = '';
      let filename = `TCMS_Report_${type}_${new Date().toISOString().split('T')[0]}.csv`;

      if (type === 'licence_utilization') {
        const rows = db.licences.map(l => {
          const m = calculateLicenceMetrics(l, db.licence_products, db.imports, db.export_obligations, db.exports, db.documents);
          return [
            `"${l.licence_number}"`,
            `"${l.issue_date}"`,
            `"${l.import_validity_date}"`,
            `"${l.export_validity_date}"`,
            m.total_approved_quantity,
            m.total_imported_quantity,
            m.remaining_import_quantity,
            `${m.overall_licence_utilization_percent}%`,
            m.total_export_obligation_created,
            m.total_obligation_fulfilled,
            m.pending_obligation,
            `${m.obligation_fulfillment_percent}%`,
            `"${l.status}"`
          ].join(',');
        });
        csv = [
          'Licence Number,Issue Date,Import Validity,Export Validity,Approved Qty,Imported Qty,Balance Qty,Utilization %,Obligation Created,Obligation Fulfilled,Pending Obligation,Fulfillment %,Status',
          ...rows
        ].join('\n');
      } else if (type === 'import_summary') {
        const imports = await dbService.getImports();
        const rows = imports.map(i => [
          `"${i.licence_number}"`,
          `"${i.product_name}"`,
          `"${i.import_date}"`,
          `"${i.invoice_number}"`,
          `"${i.supplier.replace(/"/g, '""')}"`,
          i.quantity,
          `"${i.unit}"`,
          `"${i.bill_of_entry_number}"`,
          `"${(i.remarks || '').replace(/"/g, '""')}"`
        ].join(','));
        csv = [
          'Licence Number,Product,Import Date,Invoice Number,Supplier,Quantity,Unit,Bill of Entry,Remarks',
          ...rows
        ].join('\n');
      } else if (type === 'export_obligation_summary' || type === 'pending_obligations' || type === 'overdue_obligations') {
        let obs = await dbService.getObligations();
        if (type === 'pending_obligations') obs = obs.filter(o => o.status === 'Pending' || o.status === 'Partially Fulfilled');
        if (type === 'overdue_obligations') obs = obs.filter(o => o.status === 'Overdue');
        const rows = obs.map(o => [
          `"${o.licence_number}"`,
          `"${o.import_invoice_number}"`,
          `"${o.import_date || ''}"`,
          `"${(o.supplier || '').replace(/"/g, '""')}"`,
          o.required_quantity,
          o.completed_quantity,
          o.pending_quantity,
          `"${o.due_date}"`,
          o.days_remaining,
          `"${o.status}"`
        ].join(','));
        csv = [
          'Licence Number,Import Invoice,Import Date,Supplier,Required Export Qty,Completed Qty,Pending Qty,Due Date,Days Remaining,Status',
          ...rows
        ].join('\n');
      } else if (type === 'party_pending_docs') {
        const exports = await dbService.getExports();
        const docs = await dbService.getDocuments();
        const parties = computePartyFollowUp(exports, docs);
        const rows = parties.map(p => [
          `"${p.party_name.replace(/"/g, '""')}"`,
          p.total_export_transactions,
          p.pending_brc_count,
          p.pending_noc_count,
          p.other_pending_count,
          p.total_pending_documents
        ].join(','));
        csv = [
          'Party Name,Total Export Shipments,Pending BRC,Pending NOC,Other Pending Docs,Total Pending Documents',
          ...rows
        ].join('\n');
      } else if (type === 'document_completion') {
        const followUps = computeDocumentFollowUpList(db.licences, db.imports, db.exports, db.documents);
        const rows = followUps.map(f => [
          `"${f.missing_document}"`,
          `"${f.licence_number}"`,
          `"${f.transaction_type}"`,
          `"${f.invoice_number}"`,
          `"${f.party_or_supplier.replace(/"/g, '""')}"`,
          `"${f.transaction_date}"`,
          f.days_pending,
          `"${f.urgency}"`
        ].join(','));
        csv = [
          'Missing Document,Licence Number,Transaction Type,Reference/Invoice,Party/Supplier,Transaction Date,Days Pending,Urgency',
          ...rows
        ].join('\n');
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- OFFICIAL LOGO MANAGEMENT ---
  app.get('/api/logo', (req, res) => {
    try {
      const publicDir = path.join(process.cwd(), 'public');
      const files = [
        'injectcare-custom-logo.png',
        'injectcare-custom-logo.svg',
        'injectcare-custom-logo.jpg',
        'injectcare-custom-logo.jpeg',
        'injectcare-custom-logo.webp'
      ];
      for (const file of files) {
        if (fs.existsSync(path.join(publicDir, file))) {
          return res.json({ hasCustomLogo: true, url: `/${file}?t=${Date.now()}` });
        }
      }
      res.json({ hasCustomLogo: false, url: '/injectcare-logo.svg' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/upload-logo', upload.single('logo'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No logo file provided' });
      }
      const publicDir = path.join(process.cwd(), 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      let ext = 'png';
      if (req.file.mimetype.includes('svg')) ext = 'svg';
      else if (req.file.mimetype.includes('jpeg') || req.file.mimetype.includes('jpg')) ext = 'jpg';
      else if (req.file.mimetype.includes('webp')) ext = 'webp';
      else if (req.file.originalname && req.file.originalname.includes('.')) {
        ext = req.file.originalname.split('.').pop()?.toLowerCase() || 'png';
      }

      // Remove existing custom logos
      const exts = ['png', 'svg', 'jpg', 'jpeg', 'webp'];
      for (const e of exts) {
        const p = path.join(publicDir, `injectcare-custom-logo.${e}`);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }

      const filename = `injectcare-custom-logo.${ext}`;
      fs.writeFileSync(path.join(publicDir, filename), req.file.buffer);

      const logoUrl = `/${filename}?t=${Date.now()}`;
      res.json({ success: true, url: logoUrl });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/logo', (req, res) => {
    try {
      const publicDir = path.join(process.cwd(), 'public');
      const exts = ['png', 'svg', 'jpg', 'jpeg', 'webp'];
      for (const e of exts) {
        const p = path.join(publicDir, `injectcare-custom-logo.${e}`);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- VITE MIDDLEWARE / STATIC ASSET SERVING ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Inject Care TCMS] Server active at http://0.0.0.0:${PORT}`);
  });
}

startServer();
