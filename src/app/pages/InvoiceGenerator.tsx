import { useState, useMemo } from 'react';
import { useData } from '../data/DataContext';
import { apiFetch } from '../lib/api';
import { FileText, Plus, Printer, CheckCircle, Trash } from 'lucide-react';
import { InvoiceTemplate, InvoiceDataProps, InvoiceItem } from '../components/InvoiceTemplate';

export function InvoiceGenerator() {
  const { addInvoice } = useData();
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

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-full print:m-0 print:p-0 print:w-full print:max-w-none">
      <div className="mb-8 print:hidden">
        <h1 className="text-3xl font-bold text-foreground font-display flex items-center gap-3">
          <FileText className="text-[#D4AF37] w-8 h-8" />
          Standalone Invoice Generator
        </h1>
        <p className="text-foreground/80 mt-2">Generate custom bills manually</p>
      </div>

      {!isGenerated ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:block">
           <div className="print:hidden space-y-6">
              <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
                 <h2 className="text-lg font-bold mb-4 border-b pb-2">Customer Details</h2>
                 <div className="space-y-4">
                    <div>
                       <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Customer Name</label>
                       <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full h-10 px-3 border border-border rounded-lg focus:border-[#7B1E22] focus:ring-1 focus:ring-[#7B1E22] outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Phone</label>
                         <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full h-10 px-3 border border-border rounded-lg focus:border-[#7B1E22] focus:ring-1 focus:ring-[#7B1E22] outline-none" />
                       </div>
                       <div>
                         <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Date</label>
                         <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full h-10 px-3 border border-border rounded-lg focus:border-[#7B1E22] focus:ring-1 focus:ring-[#7B1E22] outline-none" />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
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
                             <input type="text" placeholder="Description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} className="w-full h-9 px-3 text-sm border border-border rounded focus:border-[#7B1E22] outline-none" />
                             <div className="flex gap-2">
                                <input type="number" placeholder="Unit Price" value={item.unitPrice || ''} onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))} className="w-1/3 h-9 px-3 text-sm border border-border rounded focus:border-[#7B1E22] outline-none" />
                                <input type="number" placeholder="Qty" value={item.qty || ''} onChange={e => updateItem(i, 'qty', Number(e.target.value))} className="w-1/4 h-9 px-3 text-sm border border-border rounded focus:border-[#7B1E22] outline-none" />
                                <select value={item.gstPct} onChange={e => updateItem(i, 'gstPct', Number(e.target.value))} className="w-auto flex-1 h-9 px-2 text-sm border border-border rounded focus:border-[#7B1E22] outline-none">
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

              <button onClick={handleSave} className="w-full h-12 bg-primary text-white rounded-xl font-bold hover:opacity-90 flex gap-2 items-center justify-center">
                 <FileText className="w-5 h-5"/> Generate & Save Record
              </button>
           </div>
           
           <div className="print:w-full">
              <InvoiceTemplate data={invoiceData} />
           </div>
        </div>
      ) : (
         <div className="flex-1 flex flex-col">
          <div className="bg-green-100/50 p-6 rounded-2xl shadow-sm border border-green-200 mb-8 print:hidden flex items-center justify-between">
             <div className="flex items-center gap-3 text-green-800">
               <CheckCircle className="w-8 h-8" />
               <div>
                  <h3 className="font-bold text-lg">Invoice Saved Successfully</h3>
                  <p>Archived in local database. You can now print the bill.</p>
               </div>
             </div>
             <div className="flex gap-4">
                <button onClick={() => { setIsGenerated(false); setItems([{ description: '', unitPrice: 0, qty: 1, discount: 0, gstPct: 12 }]); setCustomerName(''); }} className="px-5 py-2.5 border border-border text-foreground font-bold rounded-xl hover:bg-muted/50 transition-colors">
                  New Invoice
                </button>
                <button onClick={printInvoice} className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:opacity-90 flex gap-2 items-center">
                  <Printer className="w-4 h-4" /> Print Invoice
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
