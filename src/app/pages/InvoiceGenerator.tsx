import { useState, useMemo } from 'react';
import { useData } from '../data/DataContext';
import { apiFetch } from '../lib/api';
import { FileText, Plus, Printer, CheckCircle, Trash, Download, Archive, ArrowLeft, Eye } from 'lucide-react';
import { InvoiceTemplate, InvoiceDataProps, InvoiceItem } from '../components/InvoiceTemplate';
// @ts-ignore
export function InvoiceGenerator() {
  const { storedInvoices, addInvoice, addStoredInvoice } = useData();
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
      invoiceId: `SP-CUST-${Math.floor(Math.random()*10000)}`,
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
        const fullHtml = `<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="p-4">${htmlObj}</body></html>`;
        apiFetch('/api/save-invoice-file', {
          method: 'POST',
          body: JSON.stringify({ html: fullHtml, filename: invoiceData.invoiceId })
        }).catch(err => console.error("Could not save invoice file", err));
    }

    setIsGenerated(true);
  };

  const printInvoice = () => window.print();

  const downloadPDF = () => {
    alert("Please select 'Save as PDF' from the destination in the print dialog.");
    window.print();
  };

  const downloadPDFArchive = () => {
    alert("Please select 'Save as PDF' from the destination in the print dialog.");
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-full print:m-0 print:p-0 print:w-full print:max-w-none">
      <div className="mb-8 print:hidden flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-display flex items-center gap-3">
            <FileText className="text-[#D4AF37] w-8 h-8" />
            Standalone Invoice Generator
          </h1>
          <p className="text-foreground/80 mt-2">Generate custom bills manually or browse the archive</p>
        </div>
        <div className="flex bg-secondary p-1 rounded-lg border border-border">
          <button
            onClick={() => { setViewMode('generate'); setSelectedArchiveData(null); }}
            className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${viewMode === 'generate' ? 'bg-background shadow-sm text-primary border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Generate New
          </button>
          <button
            onClick={() => setViewMode('archive')}
            className={`px-4 py-2 flex items-center gap-2 text-sm font-bold rounded-md transition-colors ${viewMode === 'archive' ? 'bg-background shadow-sm text-primary border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Archive className="w-4 h-4" /> Invoice Archive
          </button>
        </div>
      </div>

      {viewMode === 'archive' ? (
        <div className="print:block">
          {!selectedArchiveData ? (
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border print:hidden">
              <h2 className="text-lg font-bold mb-4">Past Invoices & Checkouts</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs font-semibold text-muted-foreground uppercase">
                      <th className="pb-3">Invoice ID</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Billed To</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {storedInvoices.length === 0 && (
                      <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No invoices stored yet.</td></tr>
                    )}
                    {storedInvoices.map((inv, idx) => (
                      <tr key={inv.invoiceId || idx} className="hover:bg-muted/50">
                        <td className="py-3 font-medium text-primary">{inv.invoiceId}</td>
                        <td className="py-3 text-foreground">{inv.date}</td>
                        <td className="py-3">
                          <p className="font-medium text-card-foreground">{inv.billedTo?.name}</p>
                        </td>
                        <td className="py-3 font-semibold text-card-foreground">₹{inv.total?.toFixed(2)}</td>
                        <td className="py-3">
                          <button
                            onClick={() => setSelectedArchiveData(inv as InvoiceDataProps)}
                            className="bg-secondary text-primary px-3 py-1.5 rounded-md text-xs font-bold hover:bg-secondary/80 flex items-center gap-1 border border-border"
                          >
                            <Eye className="w-3 h-3" /> View / Download
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
              <div className="bg-card p-6 rounded-lg shadow-sm border border-border mb-8 print:hidden flex items-center justify-between">
                 <button onClick={() => setSelectedArchiveData(null)} className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground">
                   <ArrowLeft className="w-4 h-4" /> Back to Archive
                 </button>
                 <div className="flex gap-4">
                    <button onClick={downloadPDFArchive} className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex gap-2 items-center">
                      <Download className="w-4 h-4" /> Save as PDF
                    </button>
                    <button onClick={printInvoice} className="px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 flex gap-2 items-center">
                      <Printer className="w-4 h-4" /> Print
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:block">
           <div className="print:hidden space-y-6">
              <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
                 <h2 className="text-lg font-bold mb-4 border-b pb-2">Customer Details</h2>
                 <div className="space-y-4">
                    <div>
                       <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Customer Name</label>
                       <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full h-10 px-3 border border-border rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Phone</label>
                         <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full h-10 px-3 border border-border rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                       </div>
                       <div>
                         <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Date</label>
                         <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full h-10 px-3 border border-border rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
                 <div className="flex justify-between items-center border-b pb-2 mb-4">
                    <h2 className="text-lg font-bold">Billing Items</h2>
                    <button onClick={addItem} className="text-primary hover:bg-secondary p-1.5 rounded-md flex items-center gap-1 text-sm font-bold">
                       <Plus className="w-4 h-4"/> Add Item
                    </button>
                 </div>
                 
                 <div className="space-y-4">
                    {items.map((item, i) => (
                       <div key={i} className="flex gap-2 items-start relative pb-4 border-b border-border/50 last:border-0 last:pb-0">
                          <div className="flex-1 space-y-3">
                             <input type="text" placeholder="Description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} className="w-full h-9 px-3 text-sm border border-border rounded focus:border-primary outline-none" />
                             <div className="flex gap-2">
                                <input type="number" placeholder="Unit Price" value={item.unitPrice || ''} onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))} className="w-1/3 h-9 px-3 text-sm border border-border rounded focus:border-primary outline-none" />
                                <input type="number" placeholder="Qty" value={item.qty || ''} onChange={e => updateItem(i, 'qty', Number(e.target.value))} className="w-1/4 h-9 px-3 text-sm border border-border rounded focus:border-primary outline-none" />
                                <select value={item.gstPct} onChange={e => updateItem(i, 'gstPct', Number(e.target.value))} className="w-auto flex-1 h-9 px-2 text-sm border border-border rounded focus:border-primary outline-none">
                                   <option value={0}>0% GST</option>
                                   <option value={5}>5% GST</option>
                                   <option value={12}>12% GST</option>
                                   <option value={18}>18% GST</option>
                                </select>
                             </div>
                          </div>
                          <button onClick={() => removeItem(i)} className="p-2 text-muted-foreground hover:text-red-500 rounded"><Trash className="w-4 h-4"/></button>
                       </div>
                    ))}
                 </div>
              </div>

              <button onClick={handleSave} className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-bold hover:opacity-90 flex gap-2 items-center justify-center">
                 <FileText className="w-5 h-5"/> Generate & Save Record
              </button>
           </div>
           
           <div className="print:w-full">
              <InvoiceTemplate data={invoiceData} />
           </div>
        </div>
      ) : (
         <div className="flex-1 flex flex-col">
          <div className="bg-green-100/50 p-6 rounded-lg shadow-sm border border-green-200 mb-8 print:hidden flex flex-col sm:flex-row gap-4 items-center justify-between">
             <div className="flex items-center gap-3 text-green-800">
               <CheckCircle className="w-8 h-8" />
               <div>
                  <h3 className="font-bold text-lg">Invoice Saved Successfully</h3>
                  <p>Archived in local database. You can now download or print the bill.</p>
               </div>
             </div>
             <div className="flex gap-4 flex-wrap">
                <button onClick={() => { setIsGenerated(false); setItems([{ description: '', unitPrice: 0, qty: 1, discount: 0, gstPct: 12 }]); setCustomerName(''); setPhone(''); }} className="px-5 py-2.5 border border-border text-foreground font-bold rounded-lg hover:bg-muted/50 transition-colors">
                  New Invoice
                </button>
                <button onClick={downloadPDF} className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex gap-2 items-center">
                  <Download className="w-4 h-4" /> Save as PDF
                </button>
                <button onClick={printInvoice} className="px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 flex gap-2 items-center">
                  <Printer className="w-4 h-4" /> Print
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
