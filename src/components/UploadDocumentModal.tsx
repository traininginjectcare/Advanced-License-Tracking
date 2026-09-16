import React, { useState, useEffect, useRef } from 'react';
import { DocumentType, Licence } from '../types/index.ts';
import { api } from '../api/client.ts';
import { X, Upload, FileUp, CheckCircle, AlertCircle } from 'lucide-react';

interface UploadDocumentModalProps {
  initialLicenceId?: string;
  initialImportId?: string;
  initialExportId?: string;
  initialDocType?: DocumentType;
  onClose: () => void;
  onSuccess: () => void;
}

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  initialLicenceId,
  initialImportId,
  initialExportId,
  initialDocType,
  onClose,
  onSuccess
}) => {
  const [docType, setDocType] = useState<DocumentType>(initialDocType || 'Licence');
  const [licences, setLicences] = useState<Licence[]>([]);
  const [selectedLicenceId, setSelectedLicenceId] = useState(initialLicenceId || '');
  const [imports, setImports] = useState<any[]>([]);
  const [selectedImportId, setSelectedImportId] = useState(initialImportId || '');
  const [exports, setExports] = useState<any[]>([]);
  const [selectedExportId, setSelectedExportId] = useState(initialExportId || '');
  const [uploadedBy, setUploadedBy] = useState('Compliance Officer');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadLicences();
  }, []);

  useEffect(() => {
    if (selectedLicenceId) {
      api.getImports(selectedLicenceId).then(setImports).catch(console.error);
      api.getExports(selectedLicenceId).then(setExports).catch(console.error);
    }
  }, [selectedLicenceId]);

  const loadLicences = async () => {
    try {
      const data = await api.getLicences();
      setLicences(data);
      if (!selectedLicenceId && data.length > 0) {
        setSelectedLicenceId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', docType);
      if (selectedLicenceId) formData.append('licence_id', selectedLicenceId);
      if (selectedImportId) formData.append('import_id', selectedImportId);
      if (selectedExportId) formData.append('export_id', selectedExportId);
      formData.append('uploaded_by', uploadedBy);

      const res = await api.uploadDocument(formData);
      setSuccessMsg(res.message || 'Document uploaded successfully!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Failed to upload document.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <FileUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Upload Compliance Document</h3>
              <p className="text-xs text-slate-500">Inject Care TCMS Document Repository</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Document Type */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Document Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentType)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 focus:border-teal-600 outline-none"
            >
              <option value="Licence">Advance Authorisation Licence (DGFT Copy)</option>
              <option value="Bill of Entry">Bill of Entry (Import Customs)</option>
              <option value="Shipping Bill">Shipping Bill (Export Customs)</option>
              <option value="Export Invoice">Export Commercial Invoice</option>
              <option value="BRC">BRC / Bank Realisation Certificate (e-BRC / e-FIRC)</option>
              <option value="NOC">NOC / No Objection Certificate (Third-Party Exporter)</option>
              <option value="Other">Other Regulatory / CA Certificate</option>
            </select>
          </div>

          {/* Target Licence */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Advance Authorisation Licence <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedLicenceId}
              onChange={(e) => setSelectedLicenceId(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 focus:border-teal-600 outline-none"
              required
            >
              <option value="">Select Licence</option>
              {licences.map(l => (
                <option key={l.id} value={l.id}>
                  {l.licence_number} (Exp: {l.export_validity_date})
                </option>
              ))}
            </select>
          </div>

          {/* If BOE -> select Import */}
          {docType === 'Bill of Entry' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Linked Import Transaction / BOE
              </label>
              <select
                value={selectedImportId}
                onChange={(e) => setSelectedImportId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 focus:border-teal-600 outline-none"
              >
                <option value="">Select Import Transaction</option>
                {imports.map(i => (
                  <option key={i.id} value={i.id}>
                    Invoice #{i.invoice_number} - BOE #{i.bill_of_entry_number} ({i.supplier})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* If Export doc -> select Export */}
          {['Shipping Bill', 'Export Invoice', 'BRC', 'NOC'].includes(docType) && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Linked Export Transaction
              </label>
              <select
                value={selectedExportId}
                onChange={(e) => setSelectedExportId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 focus:border-teal-600 outline-none"
              >
                <option value="">Select Export Transaction</option>
                {exports.map(e => (
                  <option key={e.id} value={e.id}>
                    Invoice #{e.invoice_number} - SB #{e.shipping_bill_number} ({e.party_name}) [{e.export_type}]
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* File Upload Zone */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Select Document File (PDF, Images) <span className="text-rose-500">*</span>
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-teal-500 bg-teal-50/50'
                  : file
                  ? 'border-emerald-300 bg-emerald-50/30'
                  : 'border-slate-300 bg-slate-50 hover:bg-slate-100/70'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className={`w-8 h-8 mx-auto mb-2 ${file ? 'text-emerald-600' : 'text-slate-400'}`} />
              {file ? (
                <div>
                  <p className="text-xs font-semibold text-slate-800">{file.name}</p>
                  <p className="text-[11px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                  <span className="inline-block mt-1 text-[10px] text-teal-600 underline">Click to replace</span>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-medium text-slate-700">Drag and drop file here, or click to browse</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Supports PDF, PNG, JPG (up to 25MB)</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Uploaded By
            </label>
            <input
              type="text"
              value={uploadedBy}
              onChange={(e) => setUploadedBy(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 focus:border-teal-600 outline-none"
              placeholder="Your name or designation"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Uploading to Google Drive...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Document</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
