import { useState, useMemo } from 'react';
import { useData } from '../data/DataContext';
import { apiFetch } from '../lib/api';
import { FileText, Plus, Printer, CheckCircle, Trash, Download, Archive, ArrowLeft, Eye, RefreshCw } from 'lucide-react';
import { InvoiceTemplate, InvoiceDataProps, InvoiceItem } from '../components/InvoiceTemplate';
import { buildPrintableHtml } from '../lib/printableHtml';
import { generateId } from '../lib/utils';
// @ts-ignore
export function InvoiceGenerator() {
  const { storedInvoices, addInvoice, addStoredInvoice, addLog, isSecondaryLoading, isSyncing } = useData();
  const [viewMode, setViewMode] = useState<'generate' | 'archive'>('generate');
  const [selectedArchiveData, setSelectedArchiveData] = useState<InvoiceDataProps | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<Omit<InvoiceItem, 'id' | 'amount'>[]>([
     { description: '', unitPrice: 0, qty: 1, discount: 0, gstPct: 12 }
  ]);
  const [isGenerated, setIsGenerated] = useState(false);

  // Derived properties
  const processedItems = useMemo(() => {
    return items.map((it, idx) => ({
      ...it,
      id: idx + 1,
      amount: it.unitPrice * it.qty * (1 - it.discount / 100)
    }));
  }, [items]);

  const subtotal = useMemo(() => processedItems.reduce((acc, curr) => acc + curr.amount, 0), [processedItems]);
  const gstTotal = useMemo(() => processedItems.reduce((acc, curr) => acc + (curr.amount * curr.gstPct / 100), 0), [processedItems]);
  const total = subtotal + gstTotal;

  const invoiceData = useMemo<InvoiceDataProps>(() => {
    return {
      invoiceId: generateId('SP-CUST'),
      date,
      billedTo: {
        name: customerName || 'Walk-In Customer',
        address: '',
        cityState: 'Deoghar, Jharkhand',
        phone: phone || ''
      },
      paymentStatus: 'PAID',
      items: processedItems,
      subtotal,
      gstTotal,
      total
    };
  }, [customerName, phone, date, processedItems, subtotal, gstTotal, total]);

  const addItem = () => setItems([...items, { description: '', unitPrice: 0, qty: 1, discount: 0, gstPct: 12 }]);
  
  const updateItem = (index: number, field: string, value: string | number) => {
    const fresh = [...items];
    fresh[index] = { ...fresh[index], [field]: value };
    setItems(fresh);
  };
  
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const handleSave = () => {
    addInvoice({
      id: invoiceData.invoiceId,
      customerName: invoiceData.billedTo.name,
      phone: invoiceData.billedTo.phone,
      date: invoiceData.date,
      time: new Date().toLocaleTimeString(),
      items: invoiceData.items.map(i => ({ description: i.description, amount: i.amount })),
      subtotal: invoiceData.subtotal,
      gst: invoiceData.gstTotal,
      total: invoiceData.total
    });

    addStoredInvoice({
      invoiceId: invoiceData.invoiceId,
      date: invoiceData.date,
      billedTo: invoiceData.billedTo,
      checkIn: invoiceData.checkIn,
      checkOut: invoiceData.checkOut,
      roomPlan: invoiceData.roomPlan,
      paymentStatus: invoiceData.paymentStatus,
      items: invoiceData.items,
      subtotal: invoiceData.subtotal,
      gstTotal: invoiceData.gstTotal,
      total: invoiceData.total,
      staySummary: invoiceData.staySummary
    });

    // Optional: save HTML to archive via backend
    const htmlObj = document.getElementById('invoice-capture-area')?.outerHTML;
    if (htmlObj) {
        const fullHtml = buildPrintableHtml(htmlObj);
        apiFetch('/api/documents/save', {
          method: 'POST',
          body: JSON.stringify({
             html: fullHtml,
             filename: invoiceData.invoiceId,
             type: 'Invoice'
          })
        }).then(() => console.log("Standalone Invoice Archived"))
          .catch(err => console.error("Could not save invoice file", err));
    }

    setIsGenerated(true);
  };

  const printInvoice = () => window.print();

  const downloadPDF = () => {
    import('sonner').then(({ toast }) => toast.info("Please select 'Save as PDF' from the destination in the print dialog."));
    window.print();
    addLog('File Download', `Downloaded PDF invoice for ${customerName || 'customer'}`);
  };

  const downloadPDFArchive = () => {
    import('sonner').then(({ toast }) => toast.info("Please select 'Save as PDF' from the destination in the print dialog."));
    window.print();
    if (selectedArchiveData) {
      addLog('File Download', `Downloaded PDF archive invoice for ${selectedArchiveData.billedTo?.name || 'customer'}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-full print:m-0 print:p-0 print:w-full print:max-w-none">
      <div className="mb-6 sm:mb-8 print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-sans tracking-tight flex items-center gap-3">
              <FileText className="text-primary w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
              Standalone Invoice Generator
            </h1>
            {(isSecondaryLoading || isSyncing) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
                Syncing archives...
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">Generate custom folios and invoices manually or browse the archive</p>
        </div>
        <div className="flex bg-secondary p-1 rounded-full border border-border shrink-0 self-start sm:self-auto">
          <button
            onClick={() => { setViewMode('generate'); setSelectedArchiveData(null); }}
            className={`px-3.5 sm:px-4 py-1.5 text-xs font-mono font-medium rounded-full transition-all ${viewMode === 'generate' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Generate New
          </button>
          <button
            onClick={() => setViewMode('archive')}
            className={`px-3.5 sm:px-4 py-1.5 flex items-center gap-1.5 text-xs font-mono font-medium rounded-full transition-all ${viewMode === 'archive' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Archive className="w-3.5 h-3.5" /> Archive
          </button>
        </div>
      </div>

      {viewMode === 'archive' ? (
        <div className="print:block">
          {!selectedArchiveData ? (
            <div className="bg-card p-4 sm:p-6 rounded-xl shadow-sm border border-border print:hidden">
              <h2 className="text-base font-bold mb-4 font-mono uppercase tracking-wider text-muted-foreground text-xs">Past Invoices & Checkouts</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap min-w-[550px]">
                  <thead>
                    <tr className="border-b border-border font-mono text-[11px] text-muted-foreground uppercase tracking-wider">
                      <th className="pb-3 pr-4">Invoice ID</th>
                      <th className="pb-3 pr-4">Date</th>
                      <th className="pb-3 pr-4">Billed To</th>
                      <th className="pb-3 pr-4">Amount</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 font-mono">
                    {storedInvoices.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          {isSecondaryLoading ? (
                            <div className="flex flex-col items-center justify-center gap-2">
                              <RefreshCw className="w-6 h-6 animate-spin text-primary opacity-60" />
                              <span className="text-xs font-sans font-medium text-foreground">Loading invoice archives...</span>
                            </div>
                          ) : (
                            "No invoices stored yet."
                          )}
                        </td>
                      </tr>
                    )}
                    {storedInvoices.map((inv, idx) => (
                      <tr key={inv.invoiceId || idx} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 pr-4 font-semibold text-primary">{inv.invoiceId}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{inv.date}</td>
                        <td className="py-3 pr-4 font-sans font-medium text-foreground">
                          {inv.billedTo?.name}
                        </td>
                        <td className="py-3 pr-4 font-semibold text-foreground">₹{inv.total?.toFixed(2)}</td>
                        <td className="py-3 font-sans">
                          <button
                            onClick={() => setSelectedArchiveData(inv as InvoiceDataProps)}
                            className="chip hover:border-foreground transition-all cursor-pointer"
                          >
                            <Eye className="w-3 h-3 mr-1" /> View / Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="bg-card p-4 rounded-xl shadow-sm border border-border mb-6 print:hidden flex items-center justify-between">
                 <button onClick={() => setSelectedArchiveData(null)} className="chip hover:border-foreground cursor-pointer">
                   <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Archive
                 </button>
                 <div className="flex gap-2">
                    <button onClick={downloadPDFArchive} className="pill-solid text-xs">
                      <Download className="w-3.5 h-3.5" /> Save as PDF
                    </button>
                    <button onClick={printInvoice} className="pill-vermilion text-xs">
                      <Printer className="w-3.5 h-3.5" /> Print
                    </button>
                 </div>
              </div>
              <div className="print:block" id="archive-invoice-container">
                <InvoiceTemplate data={selectedArchiveData} elementId="archive-invoice-capture-area" />
              </div>
            </div>
          )}
        </div>
      ) : !isGenerated ? (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 print:block">
           <div className="print:hidden space-y-6">
              <div className="bg-card p-4 sm:p-6 rounded-xl shadow-sm border border-border">
                 <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4 border-b border-border pb-2">Customer Details</h2>
                 <div className="space-y-4">
                    <div>
                       <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Customer Name</label>
                       <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full h-10 px-3 bg-background border border-border rounded-lg focus:border-primary focus:outline-none text-sm text-foreground" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                       <div>
                         <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Phone</label>
                         <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full h-10 px-3 bg-background border border-border rounded-lg focus:border-primary focus:outline-none text-sm font-mono text-foreground" />
                       </div>
                       <div>
                         <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Date</label>
                         <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full h-10 px-3 bg-background border border-border rounded-lg focus:border-primary focus:outline-none text-sm font-mono text-foreground" />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="bg-card p-4 sm:p-6 rounded-xl shadow-sm border border-border">
                 <div className="flex justify-between items-center border-b border-border pb-2 mb-4">
                    <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Billing Items</h2>
                    <button onClick={addItem} className="chip hover:border-foreground cursor-pointer">
                       <Plus className="w-3 h-3 mr-1"/> Add Item
                    </button>
                 </div>
                 
                 <div className="space-y-4">
                    {items.map((item, i) => (
                       <div key={i} className="flex gap-2 items-start relative pb-4 border-b border-border/50 last:border-0 last:pb-0">
                          <div className="flex-1 space-y-2">
                             <input type="text" placeholder="Description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md focus:border-primary outline-none" />
                             <div className="grid grid-cols-3 sm:flex gap-2">
                                <input type="number" placeholder="Unit Price" value={item.unitPrice || ''} onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))} className="w-full sm:w-1/3 h-9 px-2 sm:px-3 text-xs sm:text-sm font-mono bg-background border border-border rounded-md focus:border-primary outline-none" />
                                <input type="number" placeholder="Qty" value={item.qty || ''} onChange={e => updateItem(i, 'qty', Number(e.target.value))} className="w-full sm:w-1/4 h-9 px-2 sm:px-3 text-xs sm:text-sm font-mono bg-background border border-border rounded-md focus:border-primary outline-none" />
                                <select value={item.gstPct} onChange={e => updateItem(i, 'gstPct', Number(e.target.value))} className="w-full sm:w-auto sm:flex-1 h-9 px-2 text-xs font-mono bg-background border border-border rounded-md focus:border-primary outline-none">
                                   <option value={0}>0% GST</option>
                                   <option value={5}>5% GST</option>
                                   <option value={12}>12% GST</option>
                                   <option value={18}>18% GST</option>
                                </select>
                             </div>
                          </div>
                          <button onClick={() => removeItem(i)} className="p-2 text-muted-foreground hover:text-primary transition-colors shrink-0"><Trash className="w-4 h-4"/></button>
                       </div>
                    ))}
                 </div>
              </div>

              <button onClick={handleSave} className="pill-vermilion w-full justify-center h-11 text-sm cursor-pointer">
                 <FileText className="w-4 h-4 mr-1"/> Generate & Save Record
              </button>
           </div>
           
           <div className="print:w-full">
              <InvoiceTemplate data={invoiceData} />
           </div>
        </div>
      ) : (
         <div className="flex-1 flex flex-col">
          <div className="bg-card p-4 sm:p-6 rounded-xl shadow-sm border border-border mb-6 sm:mb-8 print:hidden flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                 <CheckCircle className="w-5 h-5" />
               </div>
               <div>
                  <h3 className="font-bold text-base text-foreground">Invoice Saved Successfully</h3>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">Archived to system records. Folio ready for print or PDF export.</p>
               </div>
             </div>
             <div className="flex gap-2 flex-wrap w-full sm:w-auto">
                <button onClick={() => { setIsGenerated(false); setItems([{ description: '', unitPrice: 0, qty: 1, discount: 0, gstPct: 12 }]); setCustomerName(''); setPhone(''); }} className="chip hover:border-foreground cursor-pointer flex-1 sm:flex-none justify-center">
                  New Invoice
                </button>
                <button onClick={downloadPDF} className="pill-solid text-xs flex-1 sm:flex-none justify-center">
                  <Download className="w-3.5 h-3.5" /> Save as PDF
                </button>
                <button onClick={printInvoice} className="pill-vermilion text-xs flex-1 sm:flex-none justify-center">
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
             </div>
          </div>
          <div className="print:block">
            <InvoiceTemplate data={invoiceData} />
          </div>
         </div>
      )}
    </div>
  );
}
