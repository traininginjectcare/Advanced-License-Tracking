import React from 'react';
import { DocumentRecord } from '../types/index.ts';
import { formatDateTime } from '../utils/format.ts';
import { X, Download, FileText, Trash2, Calendar, User, HardDrive, ExternalLink } from 'lucide-react';

interface DocumentPreviewModalProps {
  document: DocumentRecord | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  onClose,
  onDelete
}) => {
  if (!document) return null;

  const viewUrl = `/api/documents/view/${document.id}`;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 text-base">{document.document_type}</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-200 text-slate-700">
                  {document.mime_type}
                </span>
                {document.drive_file_id && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800 flex items-center gap-1">
                    <HardDrive className="w-3 h-3" />
                    <span>Google Drive</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate max-w-md font-mono">{document.file_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {document.drive_web_view_link && (
              <a
                href={document.drive_web_view_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Google Drive Preview</span>
              </a>
            )}

            <a
              href={`/api/documents/download/${document.id}`}
              download={document.file_name}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>

            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete "${document.file_name}"?`)) {
                    onDelete(document.id);
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metadata Banner */}
        <div className="px-6 py-2 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center gap-6 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
            <span>Size: <strong>{formatBytes(document.file_size)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Uploaded: <strong>{formatDateTime(document.uploaded_at)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>By: <strong>{document.uploaded_by}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto text-slate-500 font-mono text-[11px] truncate max-w-xs">
            <span>Drive Path: {document.storage_path}</span>
          </div>
        </div>

        {/* Document Viewer Frame */}
        <div className="flex-1 bg-slate-800 relative">
          <iframe
            src={viewUrl}
            title={document.file_name}
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
};

