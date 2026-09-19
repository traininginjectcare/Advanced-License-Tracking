import React, { useState, useRef, useMemo } from 'react';
import { ExportRecord, Licence } from '../types/index.ts';
import { InjectCareLogo } from './InjectCareLogo.tsx';
import { 
  X, 
  Printer, 
  Copy, 
  Check, 
  Download, 
  FileText, 
  Plus, 
  Trash2, 
  Edit3, 
  Sparkles
} from 'lucide-react';

// Format with standard Indian numbering (e.g. 1,58,760.00) matching user's template
const formatQty = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined || val === '') return '0.00';
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

interface DeecDeclarationModalProps {
  exportRecord: ExportRecord;
  licence?: Licence | null;
  onClose: () => void;
}

interface DeecTableRow {
  id: string;
  invoice_no: string;
  product: string;
  qty: number;
  qty_imported_item1: number;
  qty_exported_item1: number;
  qty_imported_item2: number;
  qty_exported_item2: number;
}

export const DeecDeclarationModal: React.FC<DeecDeclarationModalProps> = ({
  exportRecord,
  licence,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // License and DGFT authority defaults from user's format or selected licence
  const defaultLicenceNo = licence?.licence_number || exportRecord.licence_number || '0311048691';
  const [advanceLicenceNo, setAdvanceLicenceNo] = useState(defaultLicenceNo);
  const [dgftAuthority, setDgftAuthority] = useState('DGFT DIRECTOR OF FOREIGN TRADE MUMBAI');

  // Exact statutory company details from user's template
  const [companyName] = useState('Inject Care Parenterals Pvt.Ltd.');
  const [factoryAddress] = useState('Plot No.130,Silvassa Road,G.I.D.C,Vapi-396195,Gujarat,India');
  const [phoneDetails] = useState('0260-2430434,98980 36614,63592 99966,85111 49413 fax : 0260-2400564');
  const [contactDetails] = useState('Email-Contact@injectcare.com, website-www.injectcare.com,CIN:U24231GJ2002PTC041048');

  // Editable Column headers for Item 1 and Item 2
  const [item1Header, setItem1Header] = useState('Item Serial No -1');
  const [item2Header, setItem2Header] = useState('Item Serial No -2');

  // Build initial rows: if exportRecord has items, map them; otherwise provide initial row based on shipment
  const initialRows: DeecTableRow[] = useMemo(() => {
    const mainQty = exportRecord.net_quantity || exportRecord.quantity || 21210;
    // Calculate approximate net content based on standard pharmaceutical injection dosage (e.g. 1.2g vial)
    const item1Net = parseFloat(((mainQty * 1.26) / 1000).toFixed(2)) || 26.72;
    const item1Exp = parseFloat(((mainQty * 1.20) / 1000).toFixed(2)) || 25.45;

    if (exportRecord.items && exportRecord.items.length > 0) {
      return exportRecord.items.map((it, idx) => {
        const q = it.net_quantity || it.quantity;
        return {
          id: `row-${idx}`,
          invoice_no: exportRecord.invoice_number || `R26005${idx + 9}`,
          product: it.product,
          qty: q,
          qty_imported_item1: parseFloat(((q * 1.26) / 1000).toFixed(2)),
          qty_exported_item1: parseFloat(((q * 1.20) / 1000).toFixed(2)),
          qty_imported_item2: q,
          qty_exported_item2: q
        };
      });
    }

    return [{
      id: 'row-1',
      invoice_no: exportRecord.invoice_number || 'R260059',
      product: exportRecord.product || 'Amoxicillin & Potassium Clavulanate for Injection 1.2g , Co-Amoxiclav for Injection Bp 1.2G (MAXICLAV 1.2G)',
      qty: mainQty,
      qty_imported_item1: item1Net,
      qty_exported_item1: item1Exp,
      qty_imported_item2: mainQty,
      qty_exported_item2: mainQty
    }];
  }, [exportRecord]);

  const [tableRows, setTableRows] = useState<DeecTableRow[]>(initialRows);

  // Load the exact sample data provided in the user's template
  const loadExactSampleData = () => {
    setAdvanceLicenceNo('0311048691');
    setDgftAuthority('DGFT DIRECTOR OF FOREIGN TRADE MUMBAI');
    setTableRows([
      {
        id: 's-1',
        invoice_no: 'R260059',
        product: 'Amoxicillin & Potassium Clavulanate for Injection 1.2g , Co-Amoxiclav for Injection Bp 1.2G (MAXICLAV 1.2G)',
        qty: 21210.00,
        qty_imported_item1: 26.72,
        qty_exported_item1: 25.45,
        qty_imported_item2: 21210.00,
        qty_exported_item2: 21210.00
      },
      {
        id: 's-2',
        invoice_no: 'R260060',
        product: '',
        qty: 35910.00,
        qty_imported_item1: 45.25,
        qty_exported_item1: 43.09,
        qty_imported_item2: 35910.00,
        qty_exported_item2: 35910.00
      },
      {
        id: 's-3',
        invoice_no: 'R260061',
        product: '',
        qty: 50820.00,
        qty_imported_item1: 64.03,
        qty_exported_item1: 60.98,
        qty_imported_item2: 50820.00,
        qty_exported_item2: 50820.00
      },
      {
        id: 's-4',
        invoice_no: 'R260062',
        product: '',
        qty: 50820.00,
        qty_imported_item1: 64.03,
        qty_exported_item1: 60.98,
        qty_imported_item2: 50820.00,
        qty_exported_item2: 50820.00
      }
    ]);
  };

  const handleRowChange = (id: string, field: keyof DeecTableRow, value: any) => {
    setTableRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleAddRow = () => {
    const nextIdx = tableRows.length + 1;
    setTableRows(prev => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        invoice_no: `R2600${60 + nextIdx}`,
        product: '',
        qty: 0,
        qty_imported_item1: 0,
        qty_exported_item1: 0,
        qty_imported_item2: 0,
        qty_exported_item2: 0
      }
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (tableRows.length <= 1) return;
    setTableRows(prev => prev.filter(r => r.id !== id));
  };

  // Calculations for Totals
  const totals = useMemo(() => {
    return tableRows.reduce(
      (acc, r) => ({
        qty: acc.qty + (Number(r.qty) || 0),
        qty_imported_item1: acc.qty_imported_item1 + (Number(r.qty_imported_item1) || 0),
        qty_exported_item1: acc.qty_exported_item1 + (Number(r.qty_exported_item1) || 0),
        qty_imported_item2: acc.qty_imported_item2 + (Number(r.qty_imported_item2) || 0),
        qty_exported_item2: acc.qty_exported_item2 + (Number(r.qty_exported_item2) || 0),
      }),
      { qty: 0, qty_imported_item1: 0, qty_exported_item1: 0, qty_imported_item2: 0, qty_exported_item2: 0 }
    );
  }, [tableRows]);

  const handlePrint = () => {
    window.print();
  };

  // Plain Text formatted according to user template
  const generatePlainText = () => {
    let out = `${companyName}\nDEEC DECLARATION\n`;
    out += `WE INJECT CARE PARENTERALS PVT LTD DO HEREBY DECLARES FOLLOWS: -\n`;
    out += `EXPORTED UNDER QUANTITY BASED ADVANCE LICENSE SCHEME AGAINST ADVANCE LICENSE No-${advanceLicenceNo} ISSUED BY ${dgftAuthority}\n`;
    out += `THE FOLLOWING MATERIALS HAVE BEEN USED FOR MANUFACTURING OF GOODS COVERED UNDER THIS SHIPMENTS,\n\n`;

    out += `Invoice no\tProduct\tQty\tQty -Imported Net Content ${item1Header}\tQty Exported  Net Content ${item1Header.replace('-', '')}\tQty -Imported Net Content ${item2Header}\tQty Exported  Net Content ${item2Header.replace('-', '')}\n`;

    tableRows.forEach(r => {
      out += `${r.invoice_no}\t${r.product}\t${formatQty(r.qty)}\t${formatQty(r.qty_imported_item1)}\t${formatQty(r.qty_exported_item1)}\t${formatQty(r.qty_imported_item2)}\t${formatQty(r.qty_exported_item2)}\n`;
    });

    out += `\nTotal\t\t${formatQty(totals.qty)}\t${formatQty(totals.qty_imported_item1)}\t${formatQty(totals.qty_exported_item1)}\t${formatQty(totals.qty_imported_item2)}\t${formatQty(totals.qty_exported_item2)}\n\n`;

    out += `This is to certify that the exempt material as listed below have been actually used in the manufacturing of the above products.\n`;
    out += `Certified that the particulars furnished above are correctly based on my verification of material used in resultant products. The process of manufacturer and records being maintained.\n`;
    out += `Thank You\n`;
    out += `For Inject Care Parenterals Pvt LTd\n`;
    out += `Authorised Signatory\n`;
    out += `${factoryAddress}\n`;
    out += `Phone: ${phoneDetails}\n`;
    out += `${contactDetails}\n`;

    return out;
  };

  const handleCopyText = () => {
    const text = generatePlainText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const text = generatePlainText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DEEC_Declaration_${advanceLicenceNo}_${exportRecord.invoice_number || 'Shipment'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden border border-slate-200 font-sans">
        
        {/* Modal Toolbar (hidden when printing) */}
        <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50 print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                  DEEC Declaration (Advance Authorisation Scheme)
                </h3>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded text-[10px] font-semibold">
                  Third-Party Export
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Official statutory manufacturer declaration for third-party merchant exports • Inject Care Parenterals Pvt. Ltd.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditMode(!isEditMode)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                isEditMode ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
              }`}
              title="Toggle editable fields in table and header"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditMode ? 'Done Editing' : 'Edit Values'}</span>
            </button>

            <button
              type="button"
              onClick={loadExactSampleData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
              title="Load R260059 - R260062 sample batch format"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Load Sample Multi-Invoice Batch</span>
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Copy text to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadTxt}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Download text file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .txt</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Print declaration or save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body Area (Optimized for print media with exact user layout & typography) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 print:bg-white print:p-0">
          <div 
            ref={printAreaRef}
            className="max-w-4xl mx-auto bg-white p-6 sm:p-10 rounded-xl shadow-xs border border-slate-300 print:border-none print:shadow-none print:p-2 text-slate-900 text-xs font-sans leading-normal selection:bg-blue-100"
          >
            {/* Header: Company Logo & Titles */}
            <div className="text-center mb-6">
              {/* Uploaded Inject Care Logo */}
              <div className="flex justify-center mb-2">
                <InjectCareLogo 
                  variant="inline" 
                  className="h-16 w-auto object-contain max-w-[280px]" 
                />
              </div>

              <h1 className="text-base sm:text-lg font-bold uppercase tracking-tight text-slate-950 font-sans">
                {companyName}
              </h1>
              
              <h2 className="text-sm sm:text-base font-bold uppercase underline tracking-wider mt-1 text-slate-950 font-sans">
                DEEC DECLARATION
              </h2>
            </div>

            {/* Introductory Declaration Sentences */}
            <div className="mb-4 space-y-2 text-xs text-slate-900 leading-relaxed font-sans font-medium">
              <p className="uppercase tracking-tight font-bold">
                WE INJECT CARE PARENTERALS PVT LTD DO HEREBY DECLARES FOLLOWS: -
              </p>
              
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className="font-semibold">EXPORTED UNDER QUANTITY BASED ADVANCE LICENSE SCHEME AGAINST ADVANCE LICENSE No-</span>
                {isEditMode ? (
                  <input
                    type="text"
                    value={advanceLicenceNo}
                    onChange={(e) => setAdvanceLicenceNo(e.target.value)}
                    className="border border-blue-400 bg-blue-50/50 px-2 py-0.5 rounded font-mono font-bold text-xs"
                  />
                ) : (
                  <strong className="font-mono font-bold text-slate-950">{advanceLicenceNo}</strong>
                )}
                <span>ISSUED BY</span>
                {isEditMode ? (
                  <input
                    type="text"
                    value={dgftAuthority}
                    onChange={(e) => setDgftAuthority(e.target.value)}
                    className="border border-blue-400 bg-blue-50/50 px-2 py-0.5 rounded text-xs w-72 font-semibold"
                  />
                ) : (
                  <strong className="font-bold text-slate-950">{dgftAuthority}</strong>
                )}
              </div>

              <p className="font-semibold uppercase tracking-tight pt-1">
                THE FOLLOWING MATERIALS HAVE BEEN USED FOR MANUFACTURING OF GOODS COVERED UNDER THIS SHIPMENTS,
              </p>
            </div>

            {/* Main DEEC Table (Exact 7 Columns specified by user) */}
            <div className="overflow-x-auto my-4 border border-slate-900">
              <table className="w-full border-collapse text-[11px] font-sans">
                <thead>
                  <tr className="bg-slate-100 text-slate-950 font-bold border-b border-slate-900">
                    <th className="border-r border-slate-900 p-2 text-left w-24">Invoice no</th>
                    <th className="border-r border-slate-900 p-2 text-left min-w-[200px]">Product</th>
                    <th className="border-r border-slate-900 p-2 text-right w-24">Qty</th>
                    <th className="border-r border-slate-900 p-2 text-right w-28">
                      Qty -Imported Net Content {item1Header}
                    </th>
                    <th className="border-r border-slate-900 p-2 text-right w-28">
                      Qty Exported Net Content {item1Header.replace('-', '')}
                    </th>
                    <th className="border-r border-slate-900 p-2 text-right w-28">
                      Qty -Imported Net Content {item2Header}
                    </th>
                    <th className="p-2 text-right w-28">
                      Qty Exported Net Content {item2Header.replace('-', '')}
                    </th>
                    {isEditMode && (
                      <th className="border-l border-slate-900 p-1 text-center w-10 print:hidden">Act</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-400">
                  {tableRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      {/* Invoice No */}
                      <td className="border-r border-slate-900 p-2 font-mono font-medium align-top">
                        {isEditMode ? (
                          <input
                            type="text"
                            value={row.invoice_no}
                            onChange={(e) => handleRowChange(row.id, 'invoice_no', e.target.value)}
                            className="w-full border border-slate-300 px-1 py-0.5 rounded font-mono text-xs"
                          />
                        ) : (
                          row.invoice_no
                        )}
                      </td>

                      {/* Product */}
                      <td className="border-r border-slate-900 p-2 align-top leading-tight">
                        {isEditMode ? (
                          <textarea
                            rows={2}
                            value={row.product}
                            onChange={(e) => handleRowChange(row.id, 'product', e.target.value)}
                            className="w-full border border-slate-300 px-1 py-0.5 rounded text-xs"
                            placeholder="Product name (leave blank if continuation invoice)"
                          />
                        ) : (
                          row.product || <span className="text-slate-400 italic">"</span>
                        )}
                      </td>

                      {/* Qty */}
                      <td className="border-r border-slate-900 p-2 text-right font-mono font-semibold align-top">
                        {isEditMode ? (
                          <input
                            type="number"
                            step="any"
                            value={row.qty}
                            onChange={(e) => handleRowChange(row.id, 'qty', parseFloat(e.target.value) || 0)}
                            className="w-full border border-slate-300 px-1 py-0.5 rounded font-mono text-right text-xs"
                          />
                        ) : (
                          formatQty(row.qty)
                        )}
                      </td>

                      {/* Qty - Imported Net Content Item 1 */}
                      <td className="border-r border-slate-900 p-2 text-right font-mono align-top">
                        {isEditMode ? (
                          <input
                            type="number"
                            step="any"
                            value={row.qty_imported_item1}
                            onChange={(e) => handleRowChange(row.id, 'qty_imported_item1', parseFloat(e.target.value) || 0)}
                            className="w-full border border-slate-300 px-1 py-0.5 rounded font-mono text-right text-xs"
                          />
                        ) : (
                          formatQty(row.qty_imported_item1)
                        )}
                      </td>

                      {/* Qty Exported Net Content Item 1 */}
                      <td className="border-r border-slate-900 p-2 text-right font-mono align-top">
                        {isEditMode ? (
                          <input
                            type="number"
                            step="any"
                            value={row.qty_exported_item1}
                            onChange={(e) => handleRowChange(row.id, 'qty_exported_item1', parseFloat(e.target.value) || 0)}
                            className="w-full border border-slate-300 px-1 py-0.5 rounded font-mono text-right text-xs"
                          />
                        ) : (
                          formatQty(row.qty_exported_item1)
                        )}
                      </td>

                      {/* Qty - Imported Net Content Item 2 */}
                      <td className="border-r border-slate-900 p-2 text-right font-mono align-top">
                        {isEditMode ? (
                          <input
                            type="number"
                            step="any"
                            value={row.qty_imported_item2}
                            onChange={(e) => handleRowChange(row.id, 'qty_imported_item2', parseFloat(e.target.value) || 0)}
                            className="w-full border border-slate-300 px-1 py-0.5 rounded font-mono text-right text-xs"
                          />
                        ) : (
                          formatQty(row.qty_imported_item2)
                        )}
                      </td>

                      {/* Qty Exported Net Content Item 2 */}
                      <td className="p-2 text-right font-mono align-top">
                        {isEditMode ? (
                          <input
                            type="number"
                            step="any"
                            value={row.qty_exported_item2}
                            onChange={(e) => handleRowChange(row.id, 'qty_exported_item2', parseFloat(e.target.value) || 0)}
                            className="w-full border border-slate-300 px-1 py-0.5 rounded font-mono text-right text-xs"
                          />
                        ) : (
                          formatQty(row.qty_exported_item2)
                        )}
                      </td>

                      {isEditMode && (
                        <td className="border-l border-slate-900 p-1 text-center align-top print:hidden">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="p-1 text-rose-600 hover:text-rose-800 cursor-pointer"
                            title="Remove row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>

                {/* Total Row */}
                <tfoot>
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-900 text-slate-950">
                    <td colSpan={2} className="border-r border-slate-900 p-2 font-bold uppercase text-left">
                      Total
                    </td>
                    <td className="border-r border-slate-900 p-2 text-right font-mono font-bold">
                      {formatQty(totals.qty)}
                    </td>
                    <td className="border-r border-slate-900 p-2 text-right font-mono font-bold">
                      {formatQty(totals.qty_imported_item1)}
                    </td>
                    <td className="border-r border-slate-900 p-2 text-right font-mono font-bold">
                      {formatQty(totals.qty_exported_item1)}
                    </td>
                    <td className="border-r border-slate-900 p-2 text-right font-mono font-bold">
                      {formatQty(totals.qty_imported_item2)}
                    </td>
                    <td className="p-2 text-right font-mono font-bold">
                      {formatQty(totals.qty_exported_item2)}
                    </td>
                    {isEditMode && <td className="border-l border-slate-900 print:hidden" />}
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Add Row Button in Edit Mode */}
            {isEditMode && (
              <div className="mb-4 flex items-center justify-between print:hidden bg-slate-50 p-2 rounded border border-dashed border-slate-300">
                <span className="text-xs text-slate-600">Need to include more invoice shipments in this declaration?</span>
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Invoice Row</span>
                </button>
              </div>
            )}

            {/* Certification Clauses (Exact text provided by user) */}
            <div className="my-5 space-y-2 text-xs leading-relaxed text-slate-900 font-sans">
              <p>
                This is to certify that the exempt material as listed below have been actually used in the manufacturing of the above products.
              </p>
              <p>
                Certified that the particulars furnished above are correctly based on my verification of material used in resultant products. The process of manufacturer and records being maintained.
              </p>
              <p className="font-semibold pt-1">
                Thank You
              </p>
            </div>

            {/* Signatory & Exact Company Footnote (As requested by user) */}
            <div className="pt-4 border-t border-slate-400 mt-6 space-y-2 text-xs font-sans">
              <div className="mb-6">
                <p className="font-bold text-slate-950 uppercase">
                  For Inject Care Parenterals Pvt LTd
                </p>
                <div className="h-12 flex items-end">
                  <div className="border-b border-dashed border-slate-400 w-44 pb-0.5 text-[10px] text-slate-400">
                    [Authorised Signatory Seal]
                  </div>
                </div>
                <p className="font-bold text-slate-900 mt-1">
                  Authorised Signatory
                </p>
              </div>

              {/* Exact Company Office Address & Contacts */}
              <div className="text-[11px] text-slate-700 leading-snug border-t border-slate-200 pt-3">
                <p className="font-medium text-slate-900">
                  {factoryAddress}
                </p>
                <p>
                  Phone: {phoneDetails}
                </p>
                <p>
                  {contactDetails}
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
