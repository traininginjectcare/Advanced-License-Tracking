import React, { useState, useEffect } from 'react';
import { DocumentRecord, DocumentType } from '../types/index.ts';
import { api } from '../api/client.ts';
import { formatDateTime } from '../utils/format.ts';
import { 
  FileText, 
  Search, 
  Plus, 
  Download, 
  Trash2, 
  HardDrive, 
  Calendar, 
  User, 
  Folder,
  Eye,
  Filter
} from 'lucide-react';

interface DocumentsViewProps {
  onOpenUpload: () => void;
  onViewDocument: (doc: DocumentRecord) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  onOpenUpload,
  onViewDocument
}) => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getDocuments();
      setDocuments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete document "${name}"?`)) return;
    try {
      await api.deleteDocument(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filtered = documents.filter(d => {
    const q = search.toLowerCase();
    const matchesSearch = 
      d.file_name.toLowerCase().includes(q) ||
      d.document_type.toLowerCase().includes(q) ||
      d.uploaded_by.toLowerCase().includes(q);

    const matchesType = typeFilter === 'All' || d.document_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const docTypes = ['All', 'Licence', 'Bill of Entry', 'Shipping Bill', 'Export Invoice', 'BRC', 'NOC', 'Other'];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Compliance Document Repository</h2>
          <p className="text-xs text-slate-500">
            Secure digital vault for DGFT Licences, Customs Out-of-Charge BOEs, Shipping Bills, and e-BRCs.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenUpload}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents by file name, type, or uploader..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-md outline-none focus:border-blue-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1">
          <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
          {docTypes.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                typeFilter === t
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid / Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading document repository...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No documents found matching this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-white border-b border-slate-200 text-slate-400 uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3">Document Type</th>
                  <th className="px-4 py-3">File Name</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Uploaded Date</th>
                  <th className="px-4 py-3">Uploaded By</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      <span className="inline-flex items-center gap-2">
                        <span className="p-1.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          <FileText className="w-3.5 h-3.5" />
                        </span>
                        <span>{doc.document_type}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-800 truncate max-w-sm">
                      {doc.file_name}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-500">
                      {formatBytes(doc.file_size)}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {formatDateTime(doc.uploaded_at)}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-800">
                      {doc.uploaded_by}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewDocument(doc)}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Preview PDF</span>
                        </button>
                        <a
                          href={`/api/documents/view/${doc.id}`}
                          download={doc.file_name}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                          title="Download File"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDelete(doc.id, doc.file_name)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
