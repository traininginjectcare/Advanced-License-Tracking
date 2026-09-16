import React, { useState } from 'react';
import { TransactionDocumentChecklist } from '../types/index.ts';
import { FileCheck, AlertCircle, FileText } from 'lucide-react';

interface DocumentChecklistBadgeProps {
  checklist?: TransactionDocumentChecklist;
  onOpenUpload?: () => void;
  onViewDocuments?: () => void;
}

export const DocumentChecklistBadge: React.FC<DocumentChecklistBadgeProps> = ({
  checklist,
  onOpenUpload,
  onViewDocuments
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!checklist) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
        <FileText className="w-3.5 h-3.5" />
        <span>No docs</span>
      </span>
    );
  }

  const { total_required, total_uploaded, completion_percentage, missing_documents, is_complete } = checklist;

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div 
        onClick={(e) => {
          e.stopPropagation();
          if (onViewDocuments) onViewDocuments();
        }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium cursor-pointer transition-colors ${
          is_complete 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
            : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
        }`}
      >
        {is_complete ? (
          <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
        ) : (
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
        )}
        <span>{total_uploaded} / {total_required} docs</span>
        <span className={`text-[10px] font-semibold px-1 py-0.2 rounded ${is_complete ? 'bg-emerald-200/60' : 'bg-amber-200/60'}`}>
          {completion_percentage}%
        </span>
      </div>

      {showTooltip && (
        <div className="absolute z-30 bottom-full left-0 mb-2 w-64 p-3 bg-slate-900 text-white rounded-lg shadow-xl text-xs space-y-2 pointer-events-auto">
          <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 font-semibold text-slate-200">
            <span>Compliance Checklist</span>
            <span className={is_complete ? 'text-emerald-400' : 'text-amber-400'}>
              {completion_percentage}% Complete
            </span>
          </div>

          <div className="space-y-1">
            {checklist.required_documents.map((docType) => {
              const isUploaded = checklist.uploaded_documents.some(d => d.document_type === docType);
              return (
                <div key={docType} className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isUploaded ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    <span className={isUploaded ? 'text-slate-300' : 'text-rose-300 font-medium'}>
                      {docType}
                    </span>
                  </span>
                  <span className={isUploaded ? 'text-emerald-400' : 'text-rose-400'}>
                    {isUploaded ? '✓ Uploaded' : '✗ Missing'}
                  </span>
                </div>
              );
            })}
          </div>

          {missing_documents.length > 0 && onOpenUpload && (
            <div className="pt-1.5 border-t border-slate-800">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTooltip(false);
                  onOpenUpload();
                }}
                className="w-full text-center py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-medium transition-colors"
              >
                Upload Missing Document
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
