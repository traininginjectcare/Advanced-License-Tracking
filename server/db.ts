import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc,
  Firestore 
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { 
  Licence, 
  LicenceProduct, 
  ImportRecord, 
  ExportObligation, 
  ExportRecord, 
  DocumentRecord 
} from '../src/types/index.ts';
import { googleDriveService } from './googleDrive.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const STORAGE_DIR = path.join(DATA_DIR, 'storage');

// Ensure data folders exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

interface LocalDatabase {
  licences: Licence[];
  licence_products: LicenceProduct[];
  imports: ImportRecord[];
  export_obligations: ExportObligation[];
  exports: ExportRecord[];
  documents: DocumentRecord[];
}

const initialDbState: LocalDatabase = {
  licences: [],
  licence_products: [],
  imports: [],
  export_obligations: [],
  exports: [],
  documents: []
};

class DatabaseService {
  private firestore: Firestore | null = null;
  private isFirestoreActive = false;
  private localDb: LocalDatabase = initialDbState;
  private firestoreDbId = 'ai-studio-injectcaretcms-d6121e57-3f26-417a-9630-6f9855aedc51';
  private firestoreProjectId = 'gen-lang-client-0809712068';

  constructor() {
    this.initLocalDb();
    this.initFirestore();
  }

  private initLocalDb() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.localDb = JSON.parse(raw);
      } else {
        this.localDb = initialDbState;
        this.saveLocalDb();
      }
    } catch (e) {
      console.error('Error reading local db file:', e);
      this.localDb = initialDbState;
    }
  }

  private saveLocalDb() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.localDb, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving local db:', e);
    }
  }

  public async initFirestore() {
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        this.firestoreProjectId = rawConfig.projectId || this.firestoreProjectId;
        const app = !getApps().length ? initializeApp(rawConfig) : getApp();
        this.firestore = getFirestore(app, this.firestoreDbId);
        this.isFirestoreActive = true;
        console.log(`[Inject Care TCMS] Connected to Firebase Firestore database: ${this.firestoreDbId} (Project: ${this.firestoreProjectId})`);

        // Check if database needs seeding or hydration
        await this.syncFromFirestore();
      } else {
        console.warn('[Inject Care TCMS] firebase-applet-config.json not found. Using local store.');
        if (this.localDb.licences.length === 0) {
          await this.seedPharmaData();
        }
      }
    } catch (err: any) {
      console.warn('[Inject Care TCMS] Firestore initialization notice:', err.message);
      if (this.localDb.licences.length === 0) {
        await this.seedPharmaData();
      }
    }
  }

  /**
   * Sync collections between Firestore and in-memory cache
   */
  public async syncFromFirestore() {
    if (!this.firestore) return;
    try {
      const licencesCol = collection(this.firestore, 'licences');
      const licencesSnap = await getDocs(licencesCol);

      if (licencesSnap.empty) {
        console.log('[Inject Care TCMS] Firestore is empty. Seeding initial pharmaceutical compliance records...');
        await this.seedPharmaData();
        return;
      }

      const productsCol = collection(this.firestore, 'licence_products');
      const productsSnap = await getDocs(productsCol);

      const importsCol = collection(this.firestore, 'imports');
      const importsSnap = await getDocs(importsCol);

      const obligationsCol = collection(this.firestore, 'export_obligations');
      const obligationsSnap = await getDocs(obligationsCol);

      const exportsCol = collection(this.firestore, 'exports');
      const exportsSnap = await getDocs(exportsCol);

      const docsCol = collection(this.firestore, 'documents');
      const docsSnap = await getDocs(docsCol);

      this.localDb = {
        licences: licencesSnap.docs.map(d => d.data() as Licence),
        licence_products: productsSnap.docs.map(d => d.data() as LicenceProduct),
        imports: importsSnap.docs.map(d => d.data() as ImportRecord),
        export_obligations: obligationsSnap.docs.map(d => d.data() as ExportObligation),
        exports: exportsSnap.docs.map(d => d.data() as ExportRecord),
        documents: docsSnap.docs.map(d => d.data() as DocumentRecord)
      };

      this.saveLocalDb();
      console.log(`[Inject Care TCMS] Successfully synced from Firestore: ${this.localDb.licences.length} licences, ${this.localDb.imports.length} imports, ${this.localDb.exports.length} exports, ${this.localDb.documents.length} documents.`);
    } catch (err: any) {
      console.warn('[Inject Care TCMS] Error during Firestore sync, using existing cache:', err.message);
      if (this.localDb.licences.length === 0) {
        await this.seedPharmaData();
      }
    }
  }

  public async getStatus() {
    let isConnected = false;
    let message = 'Connected to Firebase Firestore database.';

    if (this.firestore && this.isFirestoreActive) {
      try {
        isConnected = true;
        message = `Active Firebase Firestore (${this.firestoreDbId}). Google Drive folder: Inject Care Trade Compliance/Licences/...`;
      } catch (err: any) {
        message = `Firestore notice: ${err?.message || 'Ready'}`;
      }
    }

    return {
      backend: 'Firebase Firestore',
      connected_to_firestore: isConnected,
      firestore_database_id: this.firestoreDbId,
      firestore_project_id: this.firestoreProjectId,
      google_drive_enabled: true,
      google_drive_folder_structure: 'Inject Care Trade Compliance/Licences/[Licence Number]/[Licence | Imports/[Inv] | Exports/[Inv]]',
      message,
      record_counts: {
        licences: this.localDb.licences.length,
        products: this.localDb.licence_products.length,
        imports: this.localDb.imports.length,
        obligations: this.localDb.export_obligations.length,
        exports: this.localDb.exports.length,
        documents: this.localDb.documents.length,
      }
    };
  }

  // --- LICENCES ---
  public async getLicences(): Promise<Licence[]> {
    return this.localDb.licences.map(l => ({
      ...l,
      products: this.localDb.licence_products.filter(p => p.licence_id === l.id)
    }));
  }

  public async getLicenceById(id: string): Promise<Licence | null> {
    const lic = this.localDb.licences.find(l => l.id === id);
    if (!lic) return null;
    return {
      ...lic,
      products: this.localDb.licence_products.filter(p => p.licence_id === lic.id)
    };
  }

  public async createLicence(data: Omit<Licence, 'id' | 'created_at' | 'updated_at'> & { products?: Array<Omit<LicenceProduct, 'id' | 'licence_id' | 'created_at'>> }): Promise<Licence> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newLicence: Licence = {
      id,
      licence_number: data.licence_number.trim(),
      issue_date: data.issue_date,
      import_validity_date: data.import_validity_date,
      export_validity_date: data.export_validity_date,
      licence_document_path: data.licence_document_path || undefined,
      status: data.status || 'Active',
      created_at: now,
      updated_at: now,
    };

    const createdProducts: LicenceProduct[] = [];
    if (data.products && Array.isArray(data.products)) {
      data.products.forEach(p => {
        createdProducts.push({
          id: crypto.randomUUID(),
          licence_id: id,
          product_name: p.product_name,
          product_type: p.product_type,
          approved_quantity: Number(p.approved_quantity) || 0,
          unit: p.unit,
          wastage_percentage: Number(p.wastage_percentage) || 0,
          net_obligation_quantity: Number(p.net_obligation_quantity) || 0,
          conversion_ratio: Number(p.conversion_ratio) || 1,
          obligation_period_months: Number(p.obligation_period_months) || 18,
          created_at: now
        });
      });
    }

    // Persist to Firestore
    if (this.firestore) {
      try {
        await setDoc(doc(this.firestore, 'licences', id), newLicence);
        for (const prod of createdProducts) {
          await setDoc(doc(this.firestore, 'licence_products', prod.id), prod);
        }
      } catch (e: any) {
        console.warn('Firestore createLicence error:', e.message);
      }
    }

    this.localDb.licences.unshift(newLicence);
    this.localDb.licence_products.push(...createdProducts);
    this.saveLocalDb();

    return {
      ...newLicence,
      products: createdProducts
    };
  }

  public async updateLicence(id: string, updates: Partial<Licence>): Promise<Licence | null> {
    const now = new Date().toISOString();
    
    if (this.firestore) {
      try {
        await updateDoc(doc(this.firestore, 'licences', id), { ...updates, updated_at: now });
      } catch (e: any) {
        console.warn('Firestore updateLicence failed:', e.message);
      }
    }

    const idx = this.localDb.licences.findIndex(l => l.id === id);
    if (idx === -1) return null;
    this.localDb.licences[idx] = {
      ...this.localDb.licences[idx],
      ...updates,
      updated_at: now
    };
    this.saveLocalDb();
    return this.getLicenceById(id);
  }

  public async deleteLicence(id: string): Promise<boolean> {
    const hasImports = this.localDb.imports.some(i => i.licence_id === id);
    if (hasImports) {
      throw new Error('Cannot delete licence with associated import records. Delete imports first.');
    }

    if (this.firestore) {
      try {
        await deleteDoc(doc(this.firestore, 'licences', id));
        const prods = this.localDb.licence_products.filter(p => p.licence_id === id);
        for (const p of prods) {
          await deleteDoc(doc(this.firestore, 'licence_products', p.id));
        }
        const docs = this.localDb.documents.filter(d => d.licence_id === id);
        for (const d of docs) {
          await deleteDoc(doc(this.firestore, 'documents', d.id));
        }
      } catch (e: any) {
        console.warn('Firestore deleteLicence failed:', e.message);
      }
    }

    this.localDb.licences = this.localDb.licences.filter(l => l.id !== id);
    this.localDb.licence_products = this.localDb.licence_products.filter(p => p.licence_id !== id);
    this.localDb.documents = this.localDb.documents.filter(d => d.licence_id !== id);
    this.saveLocalDb();
    return true;
  }

  // --- PRODUCTS ---
  public async getLicenceProducts(licenceId?: string): Promise<LicenceProduct[]> {
    if (licenceId) {
      return this.localDb.licence_products.filter(p => p.licence_id === licenceId);
    }
    return this.localDb.licence_products;
  }

  public async addProductToLicence(data: Omit<LicenceProduct, 'id' | 'created_at'>): Promise<LicenceProduct> {
    const product: LicenceProduct = {
      id: crypto.randomUUID(),
      ...data,
      created_at: new Date().toISOString()
    };

    if (this.firestore) {
      try {
        await setDoc(doc(this.firestore, 'licence_products', product.id), product);
      } catch (e: any) {
        console.warn('Firestore addProduct error:', e.message);
      }
    }

    this.localDb.licence_products.push(product);
    this.saveLocalDb();
    return product;
  }

  // --- IMPORTS ---
  public async getImports(licenceId?: string): Promise<ImportRecord[]> {
    let imports = [...this.localDb.imports];
    if (licenceId) {
      imports = imports.filter(i => i.licence_id === licenceId);
    }

    return imports.map(imp => {
      const lic = this.localDb.licences.find(l => l.id === imp.licence_id);
      const prod = this.localDb.licence_products.find(p => p.id === imp.licence_product_id);
      const docs = this.localDb.documents.filter(d => d.import_id === imp.id);
      return {
        ...imp,
        licence_number: lic?.licence_number || 'Unknown',
        product_name: prod?.product_name || 'Unknown',
        documents: docs
      };
    }).sort((a, b) => new Date(b.import_date).getTime() - new Date(a.import_date).getTime());
  }

  public async createImport(
    data: Omit<ImportRecord, 'id' | 'created_at'>,
    obligationDueDate: string,
    obligationRequiredQty: number
  ): Promise<{ importRecord: ImportRecord; obligation: ExportObligation }> {
    const importId = crypto.randomUUID();
    const now = new Date().toISOString();

    const newImport: ImportRecord = {
      id: importId,
      licence_id: data.licence_id,
      licence_product_id: data.licence_product_id,
      import_date: data.import_date,
      invoice_number: data.invoice_number.trim(),
      supplier: data.supplier.trim(),
      quantity: Number(data.quantity),
      unit: data.unit,
      bill_of_entry_number: data.bill_of_entry_number.trim(),
      remarks: data.remarks || '',
      created_at: now
    };

    const obligationId = crypto.randomUUID();
    const newObligation: ExportObligation = {
      id: obligationId,
      licence_id: data.licence_id,
      import_id: importId,
      required_quantity: Number(obligationRequiredQty.toFixed(2)),
      completed_quantity: 0,
      pending_quantity: Number(obligationRequiredQty.toFixed(2)),
      due_date: obligationDueDate,
      status: 'Pending',
      created_at: now,
      updated_at: now
    };

    if (this.firestore) {
      try {
        await setDoc(doc(this.firestore, 'imports', importId), newImport);
        await setDoc(doc(this.firestore, 'export_obligations', obligationId), newObligation);
      } catch (e: any) {
        console.warn('Firestore createImport error:', e.message);
      }
    }

    this.localDb.imports.unshift(newImport);
    this.localDb.export_obligations.unshift(newObligation);
    this.saveLocalDb();

    return { importRecord: newImport, obligation: newObligation };
  }

  public async deleteImport(id: string): Promise<boolean> {
    const ob = this.localDb.export_obligations.find(o => o.import_id === id);
    if (ob) {
      const hasExports = this.localDb.exports.some(e => e.obligation_id === ob.id);
      if (hasExports) {
        throw new Error('Cannot delete import because export fulfillments have already been logged against its obligation.');
      }
    }

    if (this.firestore) {
      try {
        await deleteDoc(doc(this.firestore, 'imports', id));
        if (ob) {
          await deleteDoc(doc(this.firestore, 'export_obligations', ob.id));
        }
        const docs = this.localDb.documents.filter(d => d.import_id === id);
        for (const d of docs) {
          await deleteDoc(doc(this.firestore, 'documents', d.id));
        }
      } catch (e: any) {
        console.warn('Firestore deleteImport error:', e.message);
      }
    }

    this.localDb.imports = this.localDb.imports.filter(i => i.id !== id);
    this.localDb.export_obligations = this.localDb.export_obligations.filter(o => o.import_id !== id);
    this.localDb.documents = this.localDb.documents.filter(d => d.import_id !== id);
    this.saveLocalDb();
    return true;
  }

  // --- OBLIGATIONS ---
  public async getObligations(licenceId?: string): Promise<ExportObligation[]> {
    let obs = [...this.localDb.export_obligations];
    if (licenceId) {
      obs = obs.filter(o => o.licence_id === licenceId);
    }

    const today = new Date().getTime();
    const msInDay = 1000 * 60 * 60 * 24;

    return obs.map(o => {
      const lic = this.localDb.licences.find(l => l.id === o.licence_id);
      const imp = this.localDb.imports.find(i => i.id === o.import_id);
      const prod = imp ? this.localDb.licence_products.find(p => p.id === imp.licence_product_id) : undefined;
      const daysRemaining = Math.ceil((new Date(o.due_date).getTime() - today) / msInDay);

      // Status computation
      let status = o.status;
      if (status !== 'Completed') {
        if (daysRemaining < 0 && o.pending_quantity > 0) {
          status = 'Overdue';
        } else if (o.completed_quantity > 0) {
          status = 'Partially Fulfilled';
        } else {
          status = 'Pending';
        }
      }

      return {
        ...o,
        status,
        licence_number: lic?.licence_number || 'Unknown',
        import_invoice_number: imp?.invoice_number || 'Unknown',
        import_date: imp?.import_date,
        supplier: imp?.supplier,
        imported_quantity: imp?.quantity,
        product_name: prod?.product_name,
        unit: prod?.unit,
        days_remaining: daysRemaining
      };
    }).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }

  // --- EXPORTS ---
  public async getExports(licenceId?: string): Promise<ExportRecord[]> {
    let exports = [...this.localDb.exports];
    if (licenceId) {
      exports = exports.filter(e => e.licence_id === licenceId);
    }

    return exports.map(exp => {
      const lic = this.localDb.licences.find(l => l.id === exp.licence_id);
      const ob = this.localDb.export_obligations.find(o => o.id === exp.obligation_id);
      const imp = ob ? this.localDb.imports.find(i => i.id === ob.import_id) : undefined;
      const docs = this.localDb.documents.filter(d => d.export_id === exp.id);

      return {
        ...exp,
        licence_number: lic?.licence_number || 'Unknown',
        import_invoice_number: imp?.invoice_number || 'Unknown',
        documents: docs
      };
    }).sort((a, b) => new Date(b.export_date).getTime() - new Date(a.export_date).getTime());
  }

  public async createExport(data: Omit<ExportRecord, 'id' | 'created_at'>): Promise<ExportRecord> {
    const ob = this.localDb.export_obligations.find(o => o.id === data.obligation_id);
    if (!ob) {
      throw new Error('Associated export obligation not found.');
    }

    const exportQty = Number(data.quantity);
    const newCompleted = (Number(ob.completed_quantity) || 0) + exportQty;
    const newPending = Math.max(0, ob.required_quantity - newCompleted);

    let newStatus = ob.status;
    if (newCompleted >= ob.required_quantity) {
      newStatus = 'Completed';
    } else if (newCompleted > 0) {
      newStatus = new Date(ob.due_date).getTime() < Date.now() ? 'Overdue' : 'Partially Fulfilled';
    }

    const exportId = crypto.randomUUID();
    const now = new Date().toISOString();

    const newExport: ExportRecord = {
      id: exportId,
      licence_id: data.licence_id,
      obligation_id: data.obligation_id,
      export_date: data.export_date,
      invoice_number: data.invoice_number.trim(),
      export_type: data.export_type,
      party_name: data.party_name.trim(),
      product: data.product.trim(),
      quantity: exportQty,
      unit: data.unit,
      shipping_bill_number: data.shipping_bill_number.trim(),
      remarks: data.remarks || '',
      created_at: now
    };

    ob.completed_quantity = Number(newCompleted.toFixed(2));
    ob.pending_quantity = Number(newPending.toFixed(2));
    ob.status = newStatus;
    ob.updated_at = now;

    if (this.firestore) {
      try {
        await setDoc(doc(this.firestore, 'exports', exportId), newExport);
        await updateDoc(doc(this.firestore, 'export_obligations', ob.id), {
          completed_quantity: ob.completed_quantity,
          pending_quantity: ob.pending_quantity,
          status: ob.status,
          updated_at: now
        });
      } catch (e: any) {
        console.warn('Firestore createExport error:', e.message);
      }
    }

    this.localDb.exports.unshift(newExport);
    this.saveLocalDb();

    return newExport;
  }

  public async deleteExport(id: string): Promise<boolean> {
    const exp = this.localDb.exports.find(e => e.id === id);
    if (!exp) return false;

    const ob = this.localDb.export_obligations.find(o => o.id === exp.obligation_id);
    if (ob) {
      ob.completed_quantity = Math.max(0, ob.completed_quantity - exp.quantity);
      ob.pending_quantity = Math.max(0, ob.required_quantity - ob.completed_quantity);
      ob.status = ob.completed_quantity >= ob.required_quantity 
        ? 'Completed' 
        : ob.completed_quantity > 0 
          ? 'Partially Fulfilled' 
          : (new Date(ob.due_date).getTime() < Date.now() ? 'Overdue' : 'Pending');
      ob.updated_at = new Date().toISOString();

      if (this.firestore) {
        try {
          await updateDoc(doc(this.firestore, 'export_obligations', ob.id), {
            completed_quantity: ob.completed_quantity,
            pending_quantity: ob.pending_quantity,
            status: ob.status,
            updated_at: ob.updated_at
          });
        } catch (e: any) {
          console.warn('Firestore rollback obligation error:', e.message);
        }
      }
    }

    if (this.firestore) {
      try {
        await deleteDoc(doc(this.firestore, 'exports', id));
        const docs = this.localDb.documents.filter(d => d.export_id === id);
        for (const d of docs) {
          await deleteDoc(doc(this.firestore, 'documents', d.id));
        }
      } catch (e: any) {
        console.warn('Firestore deleteExport error:', e.message);
      }
    }

    this.localDb.exports = this.localDb.exports.filter(e => e.id !== id);
    this.localDb.documents = this.localDb.documents.filter(d => d.export_id !== id);
    this.saveLocalDb();
    return true;
  }

  // --- DOCUMENTS ---
  public async getDocuments(filter?: { licence_id?: string; import_id?: string; export_id?: string }): Promise<DocumentRecord[]> {
    let docs = [...this.localDb.documents];
    if (filter?.licence_id) docs = docs.filter(d => d.licence_id === filter.licence_id);
    if (filter?.import_id) docs = docs.filter(d => d.import_id === filter.import_id);
    if (filter?.export_id) docs = docs.filter(d => d.export_id === filter.export_id);
    return docs.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
  }

  public async createDocumentRecord(
    meta: Omit<DocumentRecord, 'id' | 'uploaded_at'>,
    fileBuffer?: Buffer
  ): Promise<DocumentRecord> {
    const docId = crypto.randomUUID();
    const now = new Date().toISOString();

    const newDoc: DocumentRecord = {
      id: docId,
      ...meta,
      uploaded_at: now
    };

    // Cache physical file locally
    if (fileBuffer) {
      const safePath = path.join(STORAGE_DIR, meta.storage_path.replace(/[\\/]/g, '_'));
      try {
        fs.writeFileSync(safePath, fileBuffer);
      } catch (e) {
        console.error('Error writing local file cache:', e);
      }
    }

    // Persist document record into Firestore
    if (this.firestore) {
      try {
        await setDoc(doc(this.firestore, 'documents', docId), newDoc);
      } catch (e: any) {
        console.warn('Firestore createDocument error:', e.message);
      }
    }

    this.localDb.documents.unshift(newDoc);
    this.saveLocalDb();

    return newDoc;
  }

  public async getDocumentFile(storagePath: string, driveFileId?: string, accessToken?: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    // 1. If we have a Google Drive file ID and a valid token, download directly from Google Drive API
    const token = accessToken || googleDriveService.getActiveToken();
    if (driveFileId && token) {
      try {
        const driveData = await googleDriveService.downloadFile(token, driveFileId);
        return driveData;
      } catch (e: any) {
        console.warn('Google Drive download error, falling back to local file vault:', e.message);
      }
    }

    // 2. Check local file vault
    const safePath = path.join(STORAGE_DIR, storagePath.replace(/[\\/]/g, '_'));
    if (fs.existsSync(safePath)) {
      const buffer = fs.readFileSync(safePath);
      return { buffer, mimeType: 'application/pdf' };
    }

    return null;
  }

  public async deleteDocument(id: string, accessToken?: string): Promise<boolean> {
    const docItem = this.localDb.documents.find(d => d.id === id);
    if (!docItem) return false;

    // Remove from Google Drive if drive_file_id is set
    const token = accessToken || googleDriveService.getActiveToken();
    if (docItem.drive_file_id && token) {
      try {
        await googleDriveService.deleteFile(token, docItem.drive_file_id);
      } catch (e: any) {
        console.warn('Google Drive delete file notice:', e.message);
      }
    }

    // Remove local file
    const safePath = path.join(STORAGE_DIR, docItem.storage_path.replace(/[\\/]/g, '_'));
    if (fs.existsSync(safePath)) {
      try { fs.unlinkSync(safePath); } catch (_) {}
    }

    if (this.firestore) {
      try {
        await deleteDoc(doc(this.firestore, 'documents', id));
      } catch (e: any) {
        console.warn('Firestore deleteDocument error:', e.message);
      }
    }

    this.localDb.documents = this.localDb.documents.filter(d => d.id !== id);
    this.saveLocalDb();
    return true;
  }

  public getAllData(): LocalDatabase {
    return this.localDb;
  }

  public async resetDatabase() {
    if (this.firestore) {
      try {
        for (const l of this.localDb.licences) await deleteDoc(doc(this.firestore, 'licences', l.id));
        for (const p of this.localDb.licence_products) await deleteDoc(doc(this.firestore, 'licence_products', p.id));
        for (const i of this.localDb.imports) await deleteDoc(doc(this.firestore, 'imports', i.id));
        for (const o of this.localDb.export_obligations) await deleteDoc(doc(this.firestore, 'export_obligations', o.id));
        for (const e of this.localDb.exports) await deleteDoc(doc(this.firestore, 'exports', e.id));
        for (const d of this.localDb.documents) await deleteDoc(doc(this.firestore, 'documents', d.id));
      } catch (e: any) {
        console.warn('Firestore clear error:', e.message);
      }
    }
    this.localDb = initialDbState;
    this.saveLocalDb();
    await this.seedPharmaData();
  }

  // --- SEEDING REALISTIC PHARMA COMPLIANCE DATA ---
  public async seedPharmaData(): Promise<void> {
    const now = new Date();
    const pastMonths = (m: number) => {
      const d = new Date();
      d.setMonth(d.getMonth() - m);
      return d.toISOString().split('T')[0];
    };
    const futureMonths = (m: number) => {
      const d = new Date();
      d.setMonth(d.getMonth() + m);
      return d.toISOString().split('T')[0];
    };

    const lic1Id = 'lic-0310894521';
    const prod1_1Id = 'prod-amox-api-01';
    const prod1_2Id = 'prod-amox-vials-02';

    const lic2Id = 'lic-0310896782';
    const prod2_1Id = 'prod-cef-api-01';

    const lic3Id = 'lic-0310891104';
    const prod3_1Id = 'prod-mero-api-01';

    const licences: Licence[] = [
      {
        id: lic1Id,
        licence_number: 'AA/0310894521/2025',
        issue_date: pastMonths(8),
        import_validity_date: futureMonths(4),
        export_validity_date: futureMonths(10),
        licence_document_path: 'AA_0310894521_2025/Licence/Licence.pdf',
        status: 'Active',
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      },
      {
        id: lic2Id,
        licence_number: 'AA/0310896782/2025',
        issue_date: pastMonths(4),
        import_validity_date: futureMonths(8),
        export_validity_date: futureMonths(14),
        licence_document_path: 'AA_0310896782_2025/Licence/Licence.pdf',
        status: 'Active',
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      },
      {
        id: lic3Id,
        licence_number: 'AA/0310891104/2024',
        issue_date: pastMonths(16),
        import_validity_date: pastMonths(1),
        export_validity_date: futureMonths(2),
        licence_document_path: 'AA_0310891104_2024/Licence/Licence.pdf',
        status: 'Expiring Soon',
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      }
    ];

    const products: LicenceProduct[] = [
      {
        id: prod1_1Id,
        licence_id: lic1Id,
        product_name: 'Amoxicillin Trihydrate IP/BP (API)',
        product_type: 'Raw Material / API',
        approved_quantity: 5000,
        unit: 'KG',
        wastage_percentage: 2.0,
        net_obligation_quantity: 4900,
        conversion_ratio: 1.0,
        obligation_period_months: 18,
        created_at: now.toISOString()
      },
      {
        id: prod1_2Id,
        licence_id: lic1Id,
        product_name: 'Sterile USP Type I Glass Vials 20ml',
        product_type: 'Packaging Material',
        approved_quantity: 150000,
        unit: 'PCS',
        wastage_percentage: 1.5,
        net_obligation_quantity: 147750,
        conversion_ratio: 1.0,
        obligation_period_months: 18,
        created_at: now.toISOString()
      },
      {
        id: prod2_1Id,
        licence_id: lic2Id,
        product_name: 'Ceftriaxone Sodium Sterile USP (API)',
        product_type: 'Raw Material / API',
        approved_quantity: 3500,
        unit: 'KG',
        wastage_percentage: 2.5,
        net_obligation_quantity: 3412.5,
        conversion_ratio: 1.0,
        obligation_period_months: 18,
        created_at: now.toISOString()
      },
      {
        id: prod3_1Id,
        licence_id: lic3Id,
        product_name: 'Meropenem Trihydrate with Sodium Carbonate (API)',
        product_type: 'Raw Material / API',
        approved_quantity: 1200,
        unit: 'KG',
        wastage_percentage: 1.0,
        net_obligation_quantity: 1188,
        conversion_ratio: 1.0,
        obligation_period_months: 18,
        created_at: now.toISOString()
      }
    ];

    const imp1Id = 'imp-amox-01';
    const imp2Id = 'imp-vials-02';
    const imp3Id = 'imp-cef-03';
    const imp4Id = 'imp-mero-04';

    const imports: ImportRecord[] = [
      {
        id: imp1Id,
        licence_id: lic1Id,
        licence_product_id: prod1_1Id,
        import_date: pastMonths(7),
        invoice_number: 'INV-DSM-9921',
        supplier: 'DSM Sinochem Pharmaceuticals Netherlands B.V.',
        quantity: 2500,
        unit: 'KG',
        bill_of_entry_number: 'BOE/JNPT/7788912/2025',
        remarks: 'First consignment cleared at Nhava Sheva Customs. Certificate of Analysis verified.',
        created_at: now.toISOString()
      },
      {
        id: imp2Id,
        licence_id: lic1Id,
        licence_product_id: prod1_2Id,
        import_date: pastMonths(6),
        invoice_number: 'INV-SCH-4412',
        supplier: 'Schott Glass Packaging Germany GmbH',
        quantity: 80000,
        unit: 'PCS',
        bill_of_entry_number: 'BOE/JNPT/8123456/2025',
        remarks: 'Direct sterile vial batch received into bonded quarantine.',
        created_at: now.toISOString()
      },
      {
        id: imp3Id,
        licence_id: lic2Id,
        licence_product_id: prod2_1Id,
        import_date: pastMonths(3),
        invoice_number: 'INV-ZHP-1033',
        supplier: 'Zhejiang Hisun Pharmaceutical Co. Ltd.',
        quantity: 1500,
        unit: 'KG',
        bill_of_entry_number: 'BOE/MUM-AIR/5512349/2025',
        remarks: 'Air cargo import cleared at Mumbai Air Cargo Complex.',
        created_at: now.toISOString()
      },
      {
        id: imp4Id,
        licence_id: lic3Id,
        licence_product_id: prod3_1Id,
        import_date: pastMonths(14),
        invoice_number: 'INV-ACS-8812',
        supplier: 'ACS Dobfar S.p.A. Italy',
        quantity: 1000,
        unit: 'KG',
        bill_of_entry_number: 'BOE/JNPT/4431980/2024',
        remarks: 'Import for high-potency sterile injectable manufacturing batch.',
        created_at: now.toISOString()
      }
    ];

    const ob1Id = 'ob-amox-01';
    const ob2Id = 'ob-vials-02';
    const ob3Id = 'ob-cef-03';
    const ob4Id = 'ob-mero-04';

    const obligations: ExportObligation[] = [
      {
        id: ob1Id,
        licence_id: lic1Id,
        import_id: imp1Id,
        required_quantity: 2450,
        completed_quantity: 1800,
        pending_quantity: 650,
        due_date: futureMonths(10),
        status: 'Partially Fulfilled',
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      },
      {
        id: ob2Id,
        licence_id: lic1Id,
        import_id: imp2Id,
        required_quantity: 78800,
        completed_quantity: 78800,
        pending_quantity: 0,
        due_date: futureMonths(12),
        status: 'Completed',
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      },
      {
        id: ob3Id,
        licence_id: lic2Id,
        import_id: imp3Id,
        required_quantity: 1462.5,
        completed_quantity: 500,
        pending_quantity: 962.5,
        due_date: futureMonths(14),
        status: 'Partially Fulfilled',
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      },
      {
        id: ob4Id,
        licence_id: lic3Id,
        import_id: imp4Id,
        required_quantity: 990,
        completed_quantity: 450,
        pending_quantity: 540,
        due_date: pastMonths(1), // Overdue!
        status: 'Overdue',
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      }
    ];

    const exp1Id = 'exp-amox-direct-01';
    const exp2Id = 'exp-amox-third-02';
    const exp3Id = 'exp-vials-03';
    const exp4Id = 'exp-cef-04';
    const exp5Id = 'exp-mero-05';

    const exports: ExportRecord[] = [
      {
        id: exp1Id,
        licence_id: lic1Id,
        obligation_id: ob1Id,
        export_date: pastMonths(5),
        invoice_number: 'EXP-IC-2025-0101',
        export_type: 'Direct Export',
        party_name: 'Sanofi Healthcare Middle East FZE (Dubai)',
        product: 'Amoxicillin Sodium for Injection 500mg',
        quantity: 1200,
        unit: 'KG',
        shipping_bill_number: 'SB/JNPT/991204/2025',
        remarks: 'Commercial sea cargo shipment to Jebel Ali Port.',
        created_at: now.toISOString()
      },
      {
        id: exp2Id,
        licence_id: lic1Id,
        obligation_id: ob1Id,
        export_date: pastMonths(3),
        invoice_number: 'EXP-IC-2025-0188',
        export_type: 'Third-Party Export',
        party_name: 'Aurobindo Global Exports Ltd.',
        product: 'Amoxicillin Capsules 250mg Formulation',
        quantity: 600,
        unit: 'KG',
        shipping_bill_number: 'SB/MUM-AIR/334102/2025',
        remarks: 'Third-party export fulfillment through Aurobindo trading channel.',
        created_at: now.toISOString()
      },
      {
        id: exp3Id,
        licence_id: lic1Id,
        obligation_id: ob2Id,
        export_date: pastMonths(4),
        invoice_number: 'EXP-IC-2025-0145',
        export_type: 'Direct Export',
        party_name: 'Aspen Pharmacare South Africa Ltd.',
        product: 'Filled Sterile Parenteral Vials 20ml',
        quantity: 78800,
        unit: 'PCS',
        shipping_bill_number: 'SB/JNPT/884411/2025',
        remarks: 'Full fulfillment of vial obligation.',
        created_at: now.toISOString()
      },
      {
        id: exp4Id,
        licence_id: lic2Id,
        obligation_id: ob3Id,
        export_date: pastMonths(2),
        invoice_number: 'EXP-IC-2025-0210',
        export_type: 'Third-Party Export',
        party_name: 'Glenmark Life Sciences International',
        product: 'Ceftriaxone Dry Powder for Injection 1g',
        quantity: 500,
        unit: 'KG',
        shipping_bill_number: 'SB/MUM-AIR/112290/2025',
        remarks: 'Shipment completed, NOC awaited from Glenmark commercial division.',
        created_at: now.toISOString()
      },
      {
        id: exp5Id,
        licence_id: lic3Id,
        obligation_id: ob4Id,
        export_date: pastMonths(8),
        invoice_number: 'EXP-IC-2024-0899',
        export_type: 'Direct Export',
        party_name: 'Hikma Pharmaceuticals Jordan PLC',
        product: 'Meropenem IV Infusion 1g',
        quantity: 450,
        unit: 'KG',
        shipping_bill_number: 'SB/JNPT/771120/2024',
        remarks: 'Pending bank realization certificate (BRC) verification.',
        created_at: now.toISOString()
      }
    ];

    const documents: DocumentRecord[] = [
      {
        id: 'doc-lic-01',
        licence_id: lic1Id,
        document_type: 'Licence',
        file_name: 'AA_0310894521_DGFT_Issued_Licence.pdf',
        storage_path: 'AA_0310894521_2025/Licence/AA_0310894521_DGFT_Issued_Licence.pdf',
        mime_type: 'application/pdf',
        file_size: 245760,
        uploaded_at: pastMonths(8),
        uploaded_by: 'DGFT Liaison Head'
      },
      {
        id: 'doc-imp-01-boe',
        licence_id: lic1Id,
        import_id: imp1Id,
        document_type: 'Bill of Entry',
        file_name: 'BOE_JNPT_7788912_Amoxicillin_Customs.pdf',
        storage_path: 'AA_0310894521_2025/Imports/INV-DSM-9921/BOE_JNPT_7788912_Amoxicillin_Customs.pdf',
        mime_type: 'application/pdf',
        file_size: 184320,
        uploaded_at: pastMonths(7),
        uploaded_by: 'Customs Clearing Agent'
      },
      {
        id: 'doc-exp1-sb',
        licence_id: lic1Id,
        export_id: exp1Id,
        document_type: 'Shipping Bill',
        file_name: 'SB_991204_Sanofi_Dubai.pdf',
        storage_path: 'AA_0310894521_2025/Exports/EXP-IC-2025-0101/SB_991204_Sanofi_Dubai.pdf',
        mime_type: 'application/pdf',
        file_size: 153600,
        uploaded_at: pastMonths(5),
        uploaded_by: 'Documentation Officer'
      },
      {
        id: 'doc-exp1-inv',
        licence_id: lic1Id,
        export_id: exp1Id,
        document_type: 'Export Invoice',
        file_name: 'Commercial_Invoice_EXP-IC-2025-0101.pdf',
        storage_path: 'AA_0310894521_2025/Exports/EXP-IC-2025-0101/Commercial_Invoice_EXP-IC-2025-0101.pdf',
        mime_type: 'application/pdf',
        file_size: 112640,
        uploaded_at: pastMonths(5),
        uploaded_by: 'Finance Executive'
      },
      {
        id: 'doc-exp1-brc',
        licence_id: lic1Id,
        export_id: exp1Id,
        document_type: 'BRC',
        file_name: 'eBRC_HDFC_Sanofi_FZE_Realization.pdf',
        storage_path: 'AA_0310894521_2025/Exports/EXP-IC-2025-0101/eBRC_HDFC_Sanofi_FZE_Realization.pdf',
        mime_type: 'application/pdf',
        file_size: 98304,
        uploaded_at: pastMonths(4),
        uploaded_by: 'Forex Treasury Desk'
      },
      {
        id: 'doc-exp2-sb',
        licence_id: lic1Id,
        export_id: exp2Id,
        document_type: 'Shipping Bill',
        file_name: 'SB_334102_Aurobindo_Channel.pdf',
        storage_path: 'AA_0310894521_2025/Exports/EXP-IC-2025-0188/SB_334102_Aurobindo_Channel.pdf',
        mime_type: 'application/pdf',
        file_size: 167936,
        uploaded_at: pastMonths(3),
        uploaded_by: 'Documentation Officer'
      },
      {
        id: 'doc-exp2-inv',
        licence_id: lic1Id,
        export_id: exp2Id,
        document_type: 'Export Invoice',
        file_name: 'Export_Invoice_Aurobindo_EXP-IC-2025-0188.pdf',
        storage_path: 'AA_0310894521_2025/Exports/EXP-IC-2025-0188/Export_Invoice_Aurobindo_EXP-IC-2025-0188.pdf',
        mime_type: 'application/pdf',
        file_size: 122880,
        uploaded_at: pastMonths(3),
        uploaded_by: 'Commercial Manager'
      }
    ];

    // Persist seeded dataset into Firestore
    if (this.firestore) {
      try {
        for (const l of licences) await setDoc(doc(this.firestore, 'licences', l.id), l);
        for (const p of products) await setDoc(doc(this.firestore, 'licence_products', p.id), p);
        for (const i of imports) await setDoc(doc(this.firestore, 'imports', i.id), i);
        for (const o of obligations) await setDoc(doc(this.firestore, 'export_obligations', o.id), o);
        for (const e of exports) await setDoc(doc(this.firestore, 'exports', e.id), e);
        for (const d of documents) await setDoc(doc(this.firestore, 'documents', d.id), d);
        console.log('[Inject Care TCMS] Successfully seeded Firestore database with pharma records.');
      } catch (err: any) {
        console.warn('[Inject Care TCMS] Firestore seeding error:', err.message);
      }
    }

    this.localDb = {
      licences,
      licence_products: products,
      imports,
      export_obligations: obligations,
      exports,
      documents
    };
    this.saveLocalDb();
  }
}

export const dbService = new DatabaseService();
