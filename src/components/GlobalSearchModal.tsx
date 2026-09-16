import React, { useState, useEffect } from 'react';
import { api } from '../api/client.ts';
import { Search, X, Award, ArrowDownRight, ArrowUpRight, FileText, Calendar, ChevronRight } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLicence: (id: string) => void;
  onSelectDocument: (doc: any) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectLicence,
  onSelectDocument
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    licences: any[];
    imports: any[];
    exports: any[];
    obligations: any[];
    documents: any[];
  }>({
    licences: [],
    imports: [],
    exports: [],
    obligations: [],
    documents: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults({ licences: [], imports: [], exports: [], obligations: [], documents: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ licences: [], imports: [], exports: [], obligations: [], documents: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [allLicences, allImports, allExports, allDocs] = await Promise.all([
          api.getLicences(),
          api.getImports(),
          api.getExports(),
          api.getDocuments()
        ]);

        const q = query.toLowerCase().trim();

        const filteredLicences = allLicences.filter(l => 
          l.licence_number.toLowerCase().includes(q) ||
          (l.products && l.products.some(p => p.product_name.toLowerCase().includes(q)))
        );

        const filteredImports = allImports.filter(i => 
          i.invoice_number.toLowerCase().includes(q) ||
          i.bill_of_entry_number.toLowerCase().includes(q) ||
          i.supplier.toLowerCase().includes(q)
        );

        const filteredExports = allExports.filter(e => 
          e.invoice_number.toLowerCase().includes(q) ||
          e.shipping_bill_number.toLowerCase().includes(q) ||
          e.party_name.toLowerCase().includes(q) ||
          e.product.toLowerCase().includes(q)
        );

        const filteredDocs = allDocs.filter(d =>
          d.file_name.toLowerCase().includes(q) ||
          d.document_type.toLowerCase().includes(q)
        );

        setResults({
          licences: filteredLicences,
          imports: filteredImports,
          exports: filteredExports,
          obligations: [],
          documents: filteredDocs
        });
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalResults = results.licences.length + results.imports.length + results.exports.length + results.documents.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Search input header */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-white">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Licence, Invoice #, BOE #, Shipping Bill #, Supplier, Party..."
            className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 outline-none bg-transparent"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded"
          >
            ESC
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="py-8 text-center text-xs text-slate-500">Searching records...</div>
          )}

          {!loading && query.length >= 2 && totalResults === 0 && (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching licences, invoices, shipping bills, or documents found for "{query}".
            </div>
          )}

          {/* Licences */}
          {results.licences.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Advance Authorisations ({results.licences.length})
              </h4>
              <div className="space-y-1">
                {results.licences.map(l => (
                  <div
                    key={l.id}
                    onClick={() => {
                      onSelectLicence(l.id);
                      onClose();
                    }}
                    className="p-2.5 rounded-lg hover:bg-slate-50 border border-slate-100 flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded bg-teal-50 text-teal-700 flex items-center justify-center">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 group-hover:text-teal-700 font-mono">
                          {l.licence_number}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Export Validity: {l.export_validity_date}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Imports */}
          {results.imports.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Imports / Bill of Entry ({results.imports.length})
              </h4>
              <div className="space-y-1">
                {results.imports.map(i => (
                  <div
                    key={i.id}
                    onClick={() => {
                      onSelectLicence(i.licence_id);
                      onClose();
                    }}
                    className="p-2.5 rounded-lg hover:bg-slate-50 border border-slate-100 flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded bg-sky-50 text-sky-700 flex items-center justify-center">
                        <ArrowDownRight className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 group-hover:text-sky-700 font-mono">
                          Invoice #{i.invoice_number} | BOE: {i.bill_of_entry_number}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Supplier: {i.supplier} ({i.quantity} {i.unit})
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 group-hover:text-slate-600">Open Licence</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exports */}
          {results.exports.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Exports / Shipping Bills ({results.exports.length})
              </h4>
              <div className="space-y-1">
                {results.exports.map(e => (
                  <div
                    key={e.id}
                    onClick={() => {
                      onSelectLicence(e.licence_id);
                      onClose();
                    }}
                    className="p-2.5 rounded-lg hover:bg-slate-50 border border-slate-100 flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700 font-mono">
                          Invoice #{e.invoice_number} | SB: {e.shipping_bill_number}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Party: {e.party_name} ({e.quantity} {e.unit}) - <span className="font-medium">{e.export_type}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 group-hover:text-slate-600">Open Licence</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {results.documents.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Compliance Documents ({results.documents.length})
              </h4>
              <div className="space-y-1">
                {results.documents.map(d => (
                  <div
                    key={d.id}
                    onClick={() => {
                      onSelectDocument(d);
                      onClose();
                    }}
                    className="p-2.5 rounded-lg hover:bg-slate-50 border border-slate-100 flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded bg-slate-100 text-slate-700 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 group-hover:text-teal-700 font-mono">
                          {d.document_type} - {d.file_name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Uploaded on {new Date(d.uploaded_at).toLocaleDateString()} by {d.uploaded_by}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-teal-600 group-hover:underline">Preview PDF</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-slate-400 text-[11px] flex justify-between">
          <span>Search across all database records & document archives</span>
          <span>Inject Care TCMS</span>
        </div>
      </div>
    </div>
  );
};
