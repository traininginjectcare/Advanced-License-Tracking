import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
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

// Helper to remove any undefined properties from objects recursively before Firestore operations
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return null as any;
  if (Array.isArray(data)) {
    return data.map(item => cleanForFirestore(item)) as any;
  }
  if (typeof data === 'object') {
    const res: any = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        res[key] = cleanForFirestore(val);
      }
    }
    return res;
  }
  return data;
}

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
        this.normalizeObligationsToNetImport();
      } else {
        this.localDb = initialDbState;
        this.saveLocalDb();
      }
    } catch (e) {
      console.error('Error reading local db file:', e);
      this.localDb = initialDbState;
    }
  }

  private normalizeObligationsToNetImport() {
    if (!this.localDb || !this.localDb.export_obligations) return;
    let modified = false;
    this.localDb.export_obligations = this.localDb.export_obligations.map(ob => {
      const imp = this.localDb.imports.find(i => i.id === ob.import_id);
      if (imp && imp.quantity !== undefined && imp.quantity > 0) {
        const netQty = Number(imp.quantity);
        if (ob.required_quantity !== netQty) {
          modified = true;
          const completed = Number(ob.completed_quantity) || 0;
          return {
            ...ob,
            required_quantity: netQty,
            pending_quantity: Math.max(0, netQty - completed)
          };
        }
      }
      return ob;
    });
    if (modified) {
      this.saveLocalDb();
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
        try {
          this.firestore = initializeFirestore(app, {
            ignoreUndefinedProperties: true
          }, this.firestoreDbId);
        } catch (_) {
          this.firestore = getFirestore(app, this.firestoreDbId);
        }
        this.isFirestoreActive = true;
        console.log(`[Inject Care TCMS] Connected to Firebase Firestore database: ${this.firestoreDbId} (Project: ${this.firestoreProjectId})`);

        // Check if database needs seeding or hydration
        await this.syncFromFirestore();
        await this.healOrphanedLicences();
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

  /**
   * Recovers any orphaned records (e.g. imports or obligations referencing a licence
   * that was created earlier but failed Firestore schema due to undefined properties).
   */
  public async healOrphanedLicences(): Promise<void> {
    const existingLicenceIds = new Set(this.localDb.licences.map(l => l.id));
    const now = new Date().toISOString();

    const orphanIds = new Set<string>();
    for (const imp of this.localDb.imports) {
      if (imp.licence_id && !existingLicenceIds.has(imp.licence_id)) {
        orphanIds.add(imp.licence_id);
      }
    }

    if (orphanIds.size === 0) return;

    console.log(`[Inject Care TCMS] Detected ${orphanIds.size} orphaned licences referenced by active imports. Auto-restoring to database...`);
    let restoredCount = 0;

    for (const orphanId of orphanIds) {
      const relatedImports = this.localDb.imports.filter(i => i.licence_id === orphanId);
      const productLines: LicenceProduct[] = [];
      const seenProdNames = new Set<string>();

      for (const imp of relatedImports) {
        if (imp.items && Array.isArray(imp.items)) {
          for (const it of imp.items) {
            if (it.product_name && !seenProdNames.has(it.product_name)) {
              seenProdNames.add(it.product_name);
              const prodId = it.licence_product_id || crypto.randomUUID();
              productLines.push({
                id: prodId,
                licence_id: orphanId,
                product_name: it.product_name,
                product_type: it.product_name.toLowerCase().includes('vial') ? 'Packaging Material' : 'Raw Material / API',
                approved_quantity: Number(it.quantity) * 2,
                unit: it.unit || 'kg',
                wastage_percentage: 2.0,
                net_obligation_quantity: Number(it.quantity),
                conversion_ratio: 1.0,
                obligation_period_months: 18,
                created_at: imp.created_at || now
              });
            }
          }
        }
      }

      // Generate a clean licence number based on DGFT AA format
      const licNumSuffix = orphanId.substring(0, 8).toUpperCase();
      const restoredLicence: Licence = {
        id: orphanId,
        licence_number: `AA/0310${licNumSuffix}/2026`,
        issue_date: relatedImports[0]?.import_date ? new Date(new Date(relatedImports[0].import_date).getTime() - 25 * 24 * 3600 * 1000).toISOString().split('T')[0] : '2026-01-01',
        import_validity_date: '2027-02-28',
        export_validity_date: '2027-08-31',
        status: 'Active',
        created_at: relatedImports[0]?.created_at || now,
        updated_at: now
      };

      this.localDb.licences.unshift(restoredLicence);
      this.localDb.licence_products.push(...productLines);

      // Persist restored licence to Firestore
      if (this.firestore) {
        try {
          await setDoc(doc(this.firestore, 'licences', orphanId), cleanForFirestore(restoredLicence));
          for (const prod of productLines) {
            await setDoc(doc(this.firestore, 'licence_products', prod.id), cleanForFirestore(prod));
          }
        } catch (e: any) {
          console.error('[Auto-Restore Firestore Error]', e.message);
        }
      }
      restoredCount++;
    }

    this.saveLocalDb();
    console.log(`[Inject Care TCMS] Successfully auto-restored ${restoredCount} licences in database.`);
  }

  // --- LOGO PERSISTENCE ---
  public async getCustomLogo(): Promise<{ hasCustomLogo: boolean; url?: string; dataUrl?: string } | null> {
    if (this.firestore) {
      try {
        const snap = await getDoc(doc(this.firestore, 'settings', 'branding'));
        if (snap.exists()) {
          const data = snap.data();
          if (data && (data.logoDataUrl || data.logoUrl)) {
            return {
              hasCustomLogo: true,
              url: data.logoUrl,
              dataUrl: data.logoDataUrl
            };
          }
        }
      } catch (err: any) {
        console.warn('Firestore getCustomLogo warning:', err.message);
      }
    }
    return null;
  }

  public async setCustomLogo(data: { logoDataUrl?: string; logoUrl?: string }) {
    if (this.firestore) {
      try {
        await setDoc(doc(this.firestore, 'settings', 'branding'), cleanForFirestore({
          ...data,
          updated_at: new Date().toISOString()
        }), { merge: true });
        console.log('[Inject Care TCMS] Official logo persisted into Firestore branding collection.');
      } catch (err: any) {
        console.error('Firestore setCustomLogo error:', err.message);
      }
    }
  }

  public async removeCustomLogo() {
    if (this.firestore) {
      try {
        await deleteDoc(doc(this.firestore, 'settings', 'branding'));
        console.log('[Inject Care TCMS] Official logo removed from Firestore branding collection.');
      } catch (err: any) {
        console.warn('Firestore removeCustomLogo error:', err.message);
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
          approved_vials: p.approved_vials !== undefined && p.approved_vials !== null ? Number(p.approved_vials) : undefined,
          net_content_per_vial: p.net_content_per_vial !== undefined && p.net_content_per_vial !== null ? Number(p.net_content_per_vial) : undefined,
          gross_content_per_vial: p.gross_content_per_vial !== undefined && p.gross_content_per_vial !== null ? Number(p.gross_content_per_vial) : undefined,
          unit: p.unit,
          wastage_percentage: Number(p.wastage_percentage) || 0,
          wastage_quantity: p.wastage_quantity !== undefined && p.wastage_quantity !== null ? Number(p.wastage_quantity) : undefined,
          gross_obligation_quantity: p.gross_obligation_quantity !== undefined ? Number(p.gross_obligation_quantity) : undefined,
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
        await setDoc(doc(this.firestore, 'licences', id), cleanForFirestore(newLicence));
        for (const prod of createdProducts) {
          await setDoc(doc(this.firestore, 'licence_products', prod.id), cleanForFirestore(prod));
        }
      } catch (e: any) {
        console.error('Firestore createLicence error:', e.message);
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

  public async updateLicence(id: string, updates: Partial<Licence> & { products?: any[] }): Promise<Licence | null> {
    const now = new Date().toISOString();
    const idx = this.localDb.licences.findIndex(l => l.id === id);
    if (idx === -1) return null;

    const { products, ...licenceUpdates } = updates;

    if (this.firestore) {
      try {
        await updateDoc(doc(this.firestore, 'licences', id), cleanForFirestore({ ...licenceUpdates, updated_at: now }));
      } catch (e: any) {
        console.error('Firestore updateLicence failed:', e.message);
      }
    }

    this.localDb.licences[idx] = {
      ...this.localDb.licences[idx],
      ...licenceUpdates,
      updated_at: now
    };

    if (products && Array.isArray(products)) {
      // Remove old products for this licence
      const oldProducts = this.localDb.licence_products.filter(p => p.licence_id === id);
      if (this.firestore) {
        for (const op of oldProducts) {
          try {
            await deleteDoc(doc(this.firestore, 'licence_products', op.id));
          } catch (e) {}
        }
      }
      this.localDb.licence_products = this.localDb.licence_products.filter(p => p.licence_id !== id);

      // Add updated product lines
      for (const p of products) {
        const prodId = p.id || crypto.randomUUID();
        const newProd: LicenceProduct = {
          id: prodId,
          licence_id: id,
          product_name: p.product_name,
          product_type: p.product_type || 'Raw Material / API',
          approved_quantity: Number(p.approved_quantity) || 0,
          approved_vials: p.approved_vials !== undefined && p.approved_vials !== null ? Number(p.approved_vials) : undefined,
          net_content_per_vial: p.net_content_per_vial !== undefined && p.net_content_per_vial !== null ? Number(p.net_content_per_vial) : undefined,
          gross_content_per_vial: p.gross_content_per_vial !== undefined && p.gross_content_per_vial !== null ? Number(p.gross_content_per_vial) : undefined,
          unit: p.unit || 'kg',
          wastage_percentage: Number(p.wastage_percentage) || 0,
          wastage_quantity: p.wastage_quantity !== undefined && p.wastage_quantity !== null ? Number(p.wastage_quantity) : undefined,
          gross_obligation_quantity: p.gross_obligation_quantity !== undefined ? Number(p.gross_obligation_quantity) : undefined,
          net_obligation_quantity: Number(p.net_obligation_quantity) || 0,
          conversion_ratio: Number(p.conversion_ratio) || 1,
          obligation_period_months: Number(p.obligation_period_months) || 18,
          created_at: p.created_at || now
        };
        if (this.firestore) {
          try {
            await setDoc(doc(this.firestore, 'licence_products', prodId), cleanForFirestore(newProd));
          } catch (e: any) {
            console.error('Firestore setDoc licence_products error:', e.message);
          }
        }
        this.localDb.licence_products.push(newProd);
      }
    }

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
        await setDoc(doc(this.firestore, 'licence_products', product.id), cleanForFirestore(product));
      } catch (e: any) {
        console.error('Firestore addProduct error:', e.message);
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
      let prodName = 'Unknown';
      if (imp.items && imp.items.length > 0) {
        prodName = imp.items.map(it => `${it.product_name} (${it.quantity} ${it.unit})`).join(', ');
      } else {
        const prod = this.localDb.licence_products.find(p => p.id === imp.licence_product_id);
        prodName = prod?.product_name || 'Unknown';
      }
      const docs = this.localDb.documents.filter(d => d.import_id === imp.id);
      return {
        ...imp,
        licence_number: lic?.licence_number || 'Unknown',
        product_name: prodName,
        documents: docs
      };
    }).sort((a, b) => new Date(b.import_date).getTime() - new Date(a.import_date).getTime());
  }

  public async createImport(
    data: Omit<ImportRecord, 'id' | 'created_at'>,
    obligationDueDateOrList: string | Array<{ dueDate: string; requiredQuantity: number; productId?: string }>,
    legacyRequiredQty?: number
  ): Promise<{ importRecord: ImportRecord; obligation: ExportObligation }> {
    const importId = crypto.randomUUID();
    const now = new Date().toISOString();

    const newImport: ImportRecord = {
      id: importId,
      licence_id: data.licence_id,
      licence_product_id: data.licence_product_id || '',
      import_date: data.import_date,
      invoice_number: data.invoice_number.trim(),
      supplier: data.supplier.trim(),
      quantity: Number(data.quantity),
      unit: data.unit,
      value_usd: data.value_usd !== undefined && data.value_usd !== null ? Number(data.value_usd) : undefined,
      value_inr: data.value_inr !== undefined && data.value_inr !== null ? Number(data.value_inr) : undefined,
      bill_of_entry_number: data.bill_of_entry_number ? data.bill_of_entry_number.trim() : '',
      remarks: data.remarks || '',
      items: data.items,
      created_at: now
    };

    const createdObligations: ExportObligation[] = [];

    if (Array.isArray(obligationDueDateOrList)) {
      for (const obSpec of obligationDueDateOrList) {
        const obligationId = crypto.randomUUID();
        const newObligation: ExportObligation = {
          id: obligationId,
          licence_id: data.licence_id,
          import_id: importId,
          required_quantity: Number(obSpec.requiredQuantity.toFixed(2)),
          completed_quantity: 0,
          pending_quantity: Number(obSpec.requiredQuantity.toFixed(2)),
          due_date: obSpec.dueDate,
          status: 'Pending',
          created_at: now,
          updated_at: now
        };
        createdObligations.push(newObligation);
      }
    } else {
      const obligationId = crypto.randomUUID();
      const qty = legacyRequiredQty || 0;
      const newObligation: ExportObligation = {
        id: obligationId,
        licence_id: data.licence_id,
        import_id: importId,
        required_quantity: Number(qty.toFixed(2)),
        completed_quantity: 0,
        pending_quantity: Number(qty.toFixed(2)),
        due_date: obligationDueDateOrList,
        status: 'Pending',
        created_at: now,
        updated_at: now
      };
      createdObligations.push(newObligation);
    }

    if (this.firestore) {
      try {
        await setDoc(doc(this.firestore, 'imports', importId), cleanForFirestore(newImport));
        for (const ob of createdObligations) {
          await setDoc(doc(this.firestore, 'export_obligations', ob.id), cleanForFirestore(ob));
        }
      } catch (e: any) {
        console.error('Firestore createImport error:', e.message);
      }
    }

    this.localDb.imports.unshift(newImport);
    for (const ob of createdObligations) {
      this.localDb.export_obligations.unshift(ob);
    }
    this.saveLocalDb();

    return { importRecord: newImport, obligation: createdObligations[0] };
  }

  public async updateImport(id: string, updates: Partial<ImportRecord>): Promise<ImportRecord | null> {
    const now = new Date().toISOString();
    const idx = this.localDb.imports.findIndex(i => i.id === id);
    if (idx === -1) return null;

    const oldImport = this.localDb.imports[idx];
    const newQuantity = updates.quantity !== undefined ? Number(updates.quantity) : oldImport.quantity;

    const updatedImport: ImportRecord = {
      ...oldImport,
      ...updates,
      quantity: newQuantity,
      unit: updates.unit || oldImport.unit,
      invoice_number: updates.invoice_number ? updates.invoice_number.trim() : oldImport.invoice_number,
      supplier: updates.supplier ? updates.supplier.trim() : oldImport.supplier,
      bill_of_entry_number: updates.bill_of_entry_number !== undefined ? updates.bill_of_entry_number.trim() : oldImport.bill_of_entry_number,
      remarks: updates.remarks !== undefined ? updates.remarks : oldImport.remarks
    };

    if (this.firestore) {
      try {
        await updateDoc(doc(this.firestore, 'imports', id), cleanForFirestore(updatedImport) as any);
      } catch (e: any) {
        console.error('Firestore updateImport error:', e.message);
      }
    }

    this.localDb.imports[idx] = updatedImport;

    // Update linked obligations to match net imported quantity directly
    const linkedObs = this.localDb.export_obligations.filter(o => o.import_id === id);
    for (const ob of linkedObs) {
      ob.required_quantity = Number(newQuantity.toFixed(3));
      ob.pending_quantity = Number(Math.max(0, ob.required_quantity - ob.completed_quantity).toFixed(3));
      if (ob.completed_quantity >= ob.required_quantity && ob.required_quantity > 0) {
        ob.status = 'Completed';
      } else if (new Date(ob.due_date).getTime() < Date.now()) {
        ob.status = 'Overdue';
      } else if (ob.completed_quantity > 0) {
        ob.status = 'Partially Fulfilled';
      } else {
        ob.status = 'Pending';
      }
      ob.updated_at = now;

      if (this.firestore) {
        try {
          await updateDoc(doc(this.firestore, 'export_obligations', ob.id), cleanForFirestore({
            required_quantity: ob.required_quantity,
            pending_quantity: ob.pending_quantity,
            status: ob.status,
            updated_at: now
          }));
        } catch (e: any) {
          console.error('Firestore update obligation error:', e.message);
        }
      }
    }

    this.saveLocalDb();
    const all = await this.getImports();
    return all.find(i => i.id === id) || updatedImport;
  }

  public async deleteImport(id: string): Promise<boolean> {
    const linkedObs = this.localDb.export_obligations.filter(o => o.import_id === id);
    for (const ob of linkedObs) {
      const hasExports = this.localDb.exports.some(e => e.obligation_id === ob.id);
      if (hasExports) {
        throw new Error('Cannot delete import because export fulfillments have already been logged against its obligation.');
      }
    }

    if (this.firestore) {
      try {
        await deleteDoc(doc(this.firestore, 'imports', id));
        for (const ob of linkedObs) {
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

      // As per requirement 3: Required obligation matches imported net quantity directly without wastage deduction.
      // (e.g. imported quantity 500 -> required obligation 500)
      let requiredQty = o.required_quantity;
      if (imp && imp.quantity !== undefined && imp.quantity > 0) {
        requiredQty = Number(imp.quantity);
      }
      const completedQty = Number(o.completed_quantity) || 0;
      const pendingQty = Number(Math.max(0, requiredQty - completedQty).toFixed(3));

      let status = o.status;
      if (status !== 'Completed') {
        if (completedQty >= requiredQty && requiredQty > 0) {
          status = 'Completed';
        } else if (daysRemaining < 0 && pendingQty > 0) {
          status = 'Overdue';
        } else if (completedQty > 0) {
          status = 'Partially Fulfilled';
        } else {
          status = 'Pending';
        }
      }

      return {
        ...o,
        required_quantity: requiredQty,
        pending_quantity: pendingQty,
        completed_quantity: completedQty,
        status,
        licence_number: lic?.licence_number || 'Unknown',
        import_invoice_number: imp?.invoice_number || 'Unknown',
        import_date: imp?.import_date,
        supplier: imp?.supplier,
        imported_quantity: imp?.quantity,
        product_name: prod?.product_name,
        unit: prod?.unit || imp?.unit || 'kg',
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
      const ob = exp.obligation_id ? this.localDb.export_obligations.find(o => o.id === exp.obligation_id) : undefined;
      const imp = ob ? this.localDb.imports.find(i => i.id === ob.import_id) : undefined;
      const docs = this.localDb.documents.filter(d => d.export_id === exp.id);

      return {
        ...exp,
        licence_number: lic?.licence_number || 'Unknown',
        import_invoice_number: imp?.invoice_number || '-',
        documents: docs
      };
    }).sort((a, b) => new Date(b.export_date).getTime() - new Date(a.export_date).getTime());
  }

  public async createExport(data: Omit<ExportRecord, 'id' | 'created_at'>): Promise<ExportRecord> {
    const exportQty = Number(data.quantity);
    const exportId = crypto.randomUUID();
    const now = new Date().toISOString();

    const newExport: ExportRecord = {
      id: exportId,
      licence_id: data.licence_id,
      obligation_id: data.obligation_id || '',
      export_date: data.export_date,
      invoice_number: data.invoice_number.trim(),
      export_type: data.export_type,
      party_name: data.party_name.trim(),
      product: data.product.trim(),
      quantity: exportQty,
      unit: data.unit,
      quantity_vials: data.quantity_vials !== undefined && data.quantity_vials !== null ? Number(data.quantity_vials) : undefined,
      quantity_kg: data.quantity_kg !== undefined && data.quantity_kg !== null ? Number(data.quantity_kg) : undefined,
      total_value_inr: data.total_value_inr !== undefined && data.total_value_inr !== null ? Number(data.total_value_inr) : undefined,
      total_value_usd: data.total_value_usd !== undefined && data.total_value_usd !== null ? Number(data.total_value_usd) : undefined,
      gross_quantity: data.gross_quantity,
      net_quantity: data.net_quantity,
      shipping_bill_number: data.shipping_bill_number ? data.shipping_bill_number.trim() : '',
      remarks: data.remarks || '',
      items: data.items,
      batches: data.batches,
      created_at: now
    };

    const updatedObs: ExportObligation[] = [];

    if (data.obligation_id) {
      const ob = this.localDb.export_obligations.find(o => o.id === data.obligation_id);
      if (ob) {
        const newCompleted = (Number(ob.completed_quantity) || 0) + exportQty;
        const newPending = Math.max(0, ob.required_quantity - newCompleted);
        let newStatus = ob.status;
        if (newCompleted >= ob.required_quantity) {
          newStatus = 'Completed';
        } else if (newCompleted > 0) {
          newStatus = new Date(ob.due_date).getTime() < Date.now() ? 'Overdue' : 'Partially Fulfilled';
        }
        ob.completed_quantity = Number(newCompleted.toFixed(3));
        ob.pending_quantity = Number(newPending.toFixed(3));
        ob.status = newStatus;
        ob.updated_at = now;
        updatedObs.push(ob);
      }
    } else {
      // Unlinked export: fulfill licence's pending obligations
      // In pharma injectables, both medicine (kg) and vials are consumed in finished goods.
      const kgFulfill = data.quantity_kg !== undefined && data.quantity_kg > 0 ? Number(data.quantity_kg) : 0;
      const vialsFulfill = data.quantity_vials !== undefined && data.quantity_vials > 0 ? Number(data.quantity_vials) : 0;

      let remainingKg = kgFulfill;
      let remainingVials = vialsFulfill;
      let remainingGeneral = exportQty;

      const licenceObs = this.localDb.export_obligations
        .filter(o => o.licence_id === data.licence_id && o.pending_quantity > 0)
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

      for (const ob of licenceObs) {
        const imp = this.localDb.imports.find(i => i.id === ob.import_id);
        const prod = imp?.licence_product_id ? this.localDb.licence_products.find(p => p.id === imp.licence_product_id) : undefined;
        const unitLower = (prod?.unit || imp?.unit || ob.unit || '').toLowerCase();

        let fulfillAmt = 0;
        if (remainingKg > 0 && (unitLower.includes('kg') || unitLower.includes('gm'))) {
          fulfillAmt = Math.min(ob.pending_quantity, remainingKg);
          remainingKg -= fulfillAmt;
        } else if (remainingVials > 0 && (unitLower.includes('vial') || unitLower.includes('pc') || unitLower.includes('unit') || unitLower.includes('pack'))) {
          fulfillAmt = Math.min(ob.pending_quantity, remainingVials);
          remainingVials -= fulfillAmt;
        } else if (remainingGeneral > 0) {
          fulfillAmt = Math.min(ob.pending_quantity, remainingGeneral);
          remainingGeneral -= fulfillAmt;
        }

        if (fulfillAmt > 0) {
          ob.completed_quantity = Number(((ob.completed_quantity || 0) + fulfillAmt).toFixed(3));
          ob.pending_quantity = Number(Math.max(0, ob.required_quantity - ob.completed_quantity).toFixed(3));
          if (ob.completed_quantity >= ob.required_quantity) {
            ob.status = 'Completed';
          } else if (ob.completed_quantity > 0) {
            ob.status = new Date(ob.due_date).getTime() < Date.now() ? 'Overdue' : 'Partially Fulfilled';
          }
          ob.updated_at = now;
          updatedObs.push(ob);
        }
      }
    }

    if (this.firestore) {
      try {
        await setDoc(doc(this.firestore, 'exports', exportId), cleanForFirestore(newExport));
        for (const ob of updatedObs) {
          await updateDoc(doc(this.firestore, 'export_obligations', ob.id), cleanForFirestore({
            completed_quantity: ob.completed_quantity,
            pending_quantity: ob.pending_quantity,
            status: ob.status,
            updated_at: now
          }));
        }
      } catch (e: any) {
        console.error('Firestore createExport error:', e.message);
      }
    }

    this.localDb.exports.unshift(newExport);
    this.saveLocalDb();

    return newExport;
  }

  public async updateExport(id: string, updates: Partial<ExportRecord>): Promise<ExportRecord | null> {
    const now = new Date().toISOString();
    const idx = this.localDb.exports.findIndex(e => e.id === id);
    if (idx === -1) return null;

    const oldExport = this.localDb.exports[idx];
    const oldQty = oldExport.quantity;
    const newQty = updates.quantity !== undefined ? Number(updates.quantity) : oldQty;

    const updatedExport: ExportRecord = {
      ...oldExport,
      ...updates,
      quantity: newQty,
      invoice_number: updates.invoice_number ? updates.invoice_number.trim() : oldExport.invoice_number,
      shipping_bill_number: updates.shipping_bill_number !== undefined ? updates.shipping_bill_number.trim() : oldExport.shipping_bill_number,
      party_name: updates.party_name ? updates.party_name.trim() : oldExport.party_name,
      product: updates.product ? updates.product.trim() : oldExport.product
    };

    // Obligation adjustment if quantity changed or obligation changed
    if (oldExport.obligation_id) {
      const ob = this.localDb.export_obligations.find(o => o.id === oldExport.obligation_id);
      if (ob) {
        const diff = newQty - oldQty;
        ob.completed_quantity = Math.max(0, ob.completed_quantity + diff);
        ob.pending_quantity = Math.max(0, ob.required_quantity - ob.completed_quantity);
        ob.status = ob.completed_quantity >= ob.required_quantity ? 'Completed' : ob.completed_quantity > 0 ? 'Partially Fulfilled' : (new Date(ob.due_date).getTime() < Date.now() ? 'Overdue' : 'Pending');
        ob.updated_at = now;

        if (this.firestore) {
          try {
            await updateDoc(doc(this.firestore, 'export_obligations', ob.id), cleanForFirestore({
              completed_quantity: ob.completed_quantity,
              pending_quantity: ob.pending_quantity,
              status: ob.status,
              updated_at: now
            }));
          } catch (e: any) {
            console.error('Firestore update obligation on export edit error:', e.message);
          }
        }
      }
    }

    if (this.firestore) {
      try {
        await updateDoc(doc(this.firestore, 'exports', id), cleanForFirestore(updatedExport) as any);
      } catch (e: any) {
        console.error('Firestore updateExport error:', e.message);
      }
    }

    this.localDb.exports[idx] = updatedExport;
    this.saveLocalDb();
    const all = await this.getExports();
    return all.find(e => e.id === id) || updatedExport;
  }

  public async deleteExport(id: string): Promise<boolean> {
    const exp = this.localDb.exports.find(e => e.id === id);
    if (!exp) return false;

    if (exp.obligation_id) {
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
            await updateDoc(doc(this.firestore, 'export_obligations', ob.id), cleanForFirestore({
              completed_quantity: ob.completed_quantity,
              pending_quantity: ob.pending_quantity,
              status: ob.status,
              updated_at: ob.updated_at
            }));
          } catch (e: any) {
            console.error('Firestore rollback obligation error:', e.message);
          }
        }
      }
    } else {
      // Revert from licence obligations in LIFO order (latest completed first)
      let remainingToRevert = exp.quantity;
      const licenceObs = this.localDb.export_obligations
        .filter(o => o.licence_id === exp.licence_id && o.completed_quantity > 0)
        .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());

      for (const ob of licenceObs) {
        if (remainingToRevert <= 0) break;
        const revertAmt = Math.min(ob.completed_quantity, remainingToRevert);
        ob.completed_quantity = Number((ob.completed_quantity - revertAmt).toFixed(2));
        ob.pending_quantity = Number((ob.required_quantity - ob.completed_quantity).toFixed(2));
        ob.status = ob.completed_quantity >= ob.required_quantity 
          ? 'Completed' 
          : ob.completed_quantity > 0 
            ? 'Partially Fulfilled' 
            : (new Date(ob.due_date).getTime() < Date.now() ? 'Overdue' : 'Pending');
        ob.updated_at = new Date().toISOString();
        remainingToRevert -= revertAmt;

        if (this.firestore) {
          try {
            await updateDoc(doc(this.firestore, 'export_obligations', ob.id), cleanForFirestore({
              completed_quantity: ob.completed_quantity,
              pending_quantity: ob.pending_quantity,
              status: ob.status,
              updated_at: ob.updated_at
            }));
          } catch (e: any) {
            console.error('Firestore rollback obligation error:', e.message);
          }
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
        console.error('Firestore deleteExport error:', e.message);
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
        await setDoc(doc(this.firestore, 'documents', docId), cleanForFirestore(newDoc));
      } catch (e: any) {
        console.error('Firestore createDocument error:', e.message);
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
