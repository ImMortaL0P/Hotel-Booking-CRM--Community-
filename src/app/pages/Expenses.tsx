import { useState, useMemo } from 'react';
import { useData } from '../data/DataContext';
import { apiFetch } from '../lib/api';
import { ExpenseCategory, Expense, PaymentTransaction } from '../data/types';
import { formatCurrency, generateId, formatDate } from '../lib/utils';
import { WalletCards, Plus, Filter, Download, ArrowUpRight, ArrowDownRight, IndianRupee, FileText } from 'lucide-react';
import { toast } from 'sonner';
// @ts-ignore
export function Expenses() {
  const { user, rooms, expenses, addExpense, deleteExpense, payments, bookings } = useData();

  const [isAddMode, setIsAddMode] = useState(false);
  const [isExportMode, setIsExportMode] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [exportFrom, setExportFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [exportTo, setExportTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number>('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<ExpenseCategory>('Staff Payment');
  const [description, setDescription] = useState('');
  const [roomId, setRoomId] = useState(''); // Empty = Property Wide

  // Filters
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterRoom, setFilterRoom] = useState('');

  // Consolidated Ledger data
  const ledgerEntries = useMemo(() => {
    const roomMap = new Map();
    rooms.forEach(r => roomMap.set(r.id, r.number));

    const bookingMap = new Map();
    bookings.forEach(b => bookingMap.set(b.id, b));

    const entries = [];

    const lenP = payments.length;
    for (let i = 0; i < lenP; i++) {
      const p = payments[i];
      if (p.status !== 'Completed') continue;
      const d = p.date.split('T')[0];
      if (d >= fromDate && d <= toDate) {
        const b = bookingMap.get(p.bookingId);
        if (!filterRoom || b?.roomId === filterRoom) {
          entries.push({
            type: 'INCOME',
            date: d,
            amount: p.amount,
            source: 'Room Booking',
            roomId: b?.roomId,
            roomNum: b?.roomId ? roomMap.get(b.roomId) : null,
            description: `Payment for booking ${p.bookingId} via ${p.mode}`,
            id: p.id
          });
        }
      }
    }

    const lenE = expenses.length;
    for (let i = 0; i < lenE; i++) {
        const e = expenses[i];
        if (e.date >= fromDate && e.date <= toDate) {
            if (!filterRoom || e.roomId === filterRoom) {
               entries.push({
                   type: 'EXPENSE',
                   date: e.date,
                   amount: e.amount,
                   source: e.category,
                   roomId: e.roomId,
                   roomNum: e.roomId ? roomMap.get(e.roomId) : null,
                   description: e.description,
                   category: e.category,
                   id: e.id
               });
            }
        }
    }

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, expenses, bookings, rooms, fromDate, toDate, filterRoom]);

  const totalIncome = ledgerEntries.filter(e => e.type === 'INCOME').reduce((sum, e) => sum + e.amount, 0);
  const totalExpense = ledgerEntries.filter(e => e.type === 'EXPENSE').reduce((sum, e) => sum + e.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return toast.error("Enter a valid amount");

    const expense: Expense = {
      id: generateId('EXP'),
      date,
      amount: Number(amount),
      category,
      description,
      roomId: roomId || undefined,
      recordedBy: user?.name || 'System'
    };

    addExpense(expense);
    toast.success("Expense recorded successfully");
    setIsAddMode(false);
    setAmount('');
    setDescription('');
    setRoomId('');
  };

  const handleExportCSV = () => {
    const eTotalIncome = exportEntries.filter(e => e.type === 'INCOME').reduce((sum, e) => sum + e.amount, 0);
    const eTotalExpense = exportEntries.filter(e => e.type === 'EXPENSE').reduce((sum, e) => sum + e.amount, 0);
    const eNetBalance = eTotalIncome - eTotalExpense;

    // Generate CSV string
    const headers = ['Date', 'Type', 'Category / Source', 'Room No', 'Description', 'Income (Rs)', 'Expense (Rs)'];
    const rows = exportEntries.map(e => [
      e.date,
      e.type,
      e.source,
      e.roomId ? rooms.find(r => r.id === e.roomId)?.number || 'Unknown' : 'Property Wide',
      `"${e.description.replace(/"/g, '""')}"`,
      e.type === 'INCOME' ? e.amount : 0,
      e.type === 'EXPENSE' ? e.amount : 0
    ]);

    // Add Summary Row
    rows.push(['', '', '', '', 'TOTAL', eTotalIncome, eTotalExpense]);
    rows.push(['', '', '', '', 'NET BALANCE', eNetBalance, '']);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    // Download logic
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Balance_Sheet_${exportFrom}_to_${exportTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMode(false);
  };

  const handleExportPDF = () => {
    setIsGeneratingPDF(true);
    setTimeout(() => {
      const area = document.getElementById('export-pdf-area');
      if (area) {
         const html = `<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="p-4 bg-white text-black print:m-0 w-[800px] mx-auto">${area.outerHTML}</body></html>`;
         const expenseId = `EXP-RPT-${Math.floor(Math.random()*100000)}`;
         apiFetch('/api/documents/save', {
           method: 'POST',
           body: JSON.stringify({
              html,
              filename: expenseId,
              type: 'Expense'
           })
         }).then(() => console.log('Expense saved to drive')).catch(console.error);
      }
      window.print();
      setTimeout(() => {
        setIsGeneratingPDF(false);
        setIsExportMode(false);
      }, 1000);
    }, 500); // give react time to render the hidden block
  };

  const exportEntries = useMemo(() => {
    // 1. Build O(1) lookups
    const roomMap = new Map();
    rooms.forEach(r => roomMap.set(r.id, r.number));
    
    const bookingMap = new Map();
    bookings.forEach(b => bookingMap.set(b.id, b));
    
    const entries = [];
    
    const lenP = payments.length;
    for(let i=0; i<lenP; i++) {
        const p = payments[i];
        if (p.status !== 'Completed') continue;
        const d = p.date.split('T')[0];
        if (d >= exportFrom && d <= exportTo) {
           const b = bookingMap.get(p.bookingId);
           const rNum = b?.roomId ? roomMap.get(b.roomId) : null;
           entries.push({
               type: 'INCOME',
               date: d,
               amount: p.amount,
               source: 'Room Booking',
               roomId: b?.roomId,
               roomNum: rNum,
               description: `Payment for booking ${p.bookingId} via ${p.mode}`,
               id: p.id
           });
        }
    }
    
    const lenE = expenses.length;
    for(let i=0; i<lenE; i++) {
        const e = expenses[i];
        if (e.date >= exportFrom && e.date <= exportTo) {
           const rNum = e.roomId ? roomMap.get(e.roomId) : null;
           entries.push({
               type: 'EXPENSE',
               date: e.date,
               amount: e.amount,
               source: e.category,
               roomId: e.roomId,
               roomNum: rNum,
               description: e.description,
               category: e.category,
               id: e.id
           });
        }
    }
    
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, expenses, bookings, rooms, exportFrom, exportTo]);

  return (
    <div className="h-full print:m-0 print:p-0 w-full">
    <div className="flex flex-col h-full space-y-6 print:hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <WalletCards className="w-6 h-6 text-primary" />
            Expenses & Ledger
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage incomes, track expenses, and view balance sheets.</p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => setIsExportMode(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg border border-border hover:bg-secondary/80 font-medium text-sm transition-colors"
          >
            <Download className="w-4 h-4" /> Export Report
          </button>
          <button
            onClick={() => setIsAddMode(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium text-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-5 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <ArrowUpRight className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">Total Income</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{formatCurrency(totalIncome)}</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <ArrowDownRight className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium">Total Expenses</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{formatCurrency(totalExpense)}</div>
        </div>

        <div className={`bg-card border rounded-lg p-5 flex flex-col justify-center ${netBalance >= 0 ? 'border-green-200 bg-green-50/10' : 'border-red-200 bg-red-50/10'}`}>
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <IndianRupee className={`w-4 h-4 ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            <span className="text-sm font-medium">Net Profit / Loss</span>
          </div>
          <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(netBalance)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
           <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">From Date</label>
           <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full text-sm px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div className="flex-1 min-w-[200px]">
           <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">To Date</label>
           <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full text-sm px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div className="flex-1 min-w-[200px]">
           <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Room Segregation</label>
           <div className="relative">
             <Filter className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
             <select value={filterRoom} onChange={e => setFilterRoom(e.target.value)} className="w-full text-sm pl-9 pr-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary">
               <option value="">All (Include Property Wide)</option>
               {rooms.map(r => (
                 <option key={r.id} value={r.id}>Room {r.number}</option>
               ))}
             </select>
           </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-card border border-border rounded-lg flex-1 min-h-[300px] overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 sticky top-0 z-10 font-semibold border-b border-border shadow-sm">
              <tr>
                <th className="px-6 py-3 shrink-0 w-32 whitespace-nowrap">Date</th>
                <th className="px-6 py-3 truncate max-w-[200px]">Type / Category</th>
                <th className="px-6 py-3 whitespace-nowrap">Room</th>
                <th className="px-6 py-3 min-w-[200px]">Description</th>
                <th className="px-6 py-3 text-right">Income</th>
                <th className="px-6 py-3 text-right">Expense</th>
                <th className="px-6 py-3 text-center w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    <WalletCards className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No transactions found for the selected period.</p>
                  </td>
                </tr>
              ) : (
                ledgerEntries.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-foreground font-medium">{formatDate(entry.date)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${entry.type === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {entry.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {entry.roomNum ? `Room ${entry.roomNum}` : 'Property Wide'}
                    </td>
                    <td className="px-6 py-4 text-foreground/80 max-w-sm truncate" title={entry.description}>{entry.description}</td>
                    <td className="px-6 py-4 text-right font-semibold text-green-600">
                      {entry.type === 'INCOME' ? formatCurrency(entry.amount) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-red-600">
                      {entry.type === 'EXPENSE' ? formatCurrency(entry.amount) : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {entry.type === 'EXPENSE' && (
                        <button onClick={() => {
                          if (confirm('Are you sure you want to delete this expense record?')) {
                            deleteExpense(entry.id);
                          }
                        }} className="text-red-500 hover:text-red-700 text-xs underline">
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isAddMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-md border border-border">
            <div className="p-4 border-b border-border">
               <h3 className="text-lg font-bold">Add Expense</h3>
            </div>
            <form onSubmit={handleAddExpense} className="p-4 space-y-4">
               <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Date *</label>
                  <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full text-sm px-3 py-2 border border-border rounded-md focus:ring-1 focus:ring-primary" />
               </div>
               <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Amount (₹) *</label>
                  <input type="number" min="1" required value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full text-sm px-3 py-2 border border-border rounded-md focus:ring-1 focus:ring-primary" placeholder="Enter amount" />
               </div>
               <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Category *</label>
                  <select required value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)} className="w-full text-sm px-3 py-2 border border-border rounded-md focus:ring-1 focus:ring-primary">
                    <option value="Staff Payment">Staff Payment</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Utility">Utility / Bills</option>
                    <option value="Inventory">Inventory / Supplies</option>
                    <option value="Other">Other</option>
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Room Assignment (Optional)</label>
                  <select value={roomId} onChange={e => setRoomId(e.target.value)} className="w-full text-sm px-3 py-2 border border-border rounded-md focus:ring-1 focus:ring-primary">
                    <option value="">-- Property Wide (Not tied to a room) --</option>
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>Room {r.number}</option>
                    ))}
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Description *</label>
                  <textarea required value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full text-sm px-3 py-2 border border-border rounded-md focus:ring-1 focus:ring-primary" placeholder="Expense description..."></textarea>
               </div>

               <div className="pt-2 flex justify-end gap-2">
                 <button type="button" onClick={() => setIsAddMode(false)} className="px-4 py-2 text-sm border border-border rounded-md font-medium">Cancel</button>
                 <button type="submit" className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md font-medium">Save Expense</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Report Modal */}
      {isExportMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-md border border-border">
            <div className="p-4 border-b border-border">
               <h3 className="text-lg font-bold">Export Balance Sheet</h3>
            </div>
            <div className="p-4 space-y-4">
               <div className="flex gap-4">
                 <div className="flex-1">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">From Date</label>
                    <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)} className="w-full text-sm px-3 py-2 border border-border rounded-md focus:ring-1 focus:ring-primary" />
                 </div>
                 <div className="flex-1">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">To Date</label>
                    <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)} className="w-full text-sm px-3 py-2 border border-border rounded-md focus:ring-1 focus:ring-primary" />
                 </div>
               </div>

               <div className="pt-4 flex flex-col gap-2">
                 <button onClick={handleExportPDF} disabled={isGeneratingPDF} className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md font-bold">
                   <Download className="w-4 h-4" /> {isGeneratingPDF ? 'Generating...' : 'Download PDF (Balance Sheet)'}
                 </button>
                 <button onClick={handleExportCSV} className="flex items-center justify-center gap-2 px-4 py-2 text-sm border border-border bg-card text-foreground rounded-md font-bold">
                   <FileText className="w-4 h-4" /> Download CSV
                 </button>
               </div>
               <div className="pt-2 flex justify-center">
                 <button onClick={() => setIsExportMode(false)} className="text-sm text-muted-foreground underline">Cancel</button>
               </div>
            </div>
          </div>
        </div>
      )}

      </div>

      {/* Hidden Export Area for PDF */}
      <div className="hidden print:block print:w-full print:m-0 print:p-0">
        {isGeneratingPDF && (
        <div id="export-pdf-area" className="p-8 bg-white text-black w-[800px]">
           <div className="text-center mb-8">
              <h1 className="text-2xl font-bold uppercase tracking-wider">Sharda Palace</h1>
            <p className="text-sm">Balance Sheet: <strong>{exportFrom}</strong> to <strong>{exportTo}</strong></p>
         </div>

         <div className="flex flex-col gap-8">
            <div>
               <h3 className="text-lg font-bold border-b border-black pb-2 mb-4">INCOME</h3>
               <table className="w-full text-sm text-left">
                  <thead>
                     <tr className="border-b border-gray-300">
                        <th className="py-2">Date</th>
                        <th className="py-2">Description</th>
                        <th className="text-right py-2">Amount</th>
                     </tr>
                  </thead>
                  <tbody>
                     {exportEntries.filter((e: any) => e.type === 'INCOME').map((item: any, i: number) => (
                        <tr key={i} className="border-b border-gray-100">
                           <td className="py-2">{formatDate(item.date)}</td>
                           <td className="py-2 pr-2">{item.source} {item.roomNum ? `(Rm ${item.roomNum})` : ''}</td>
                           <td className="text-right py-2 font-medium">{formatCurrency(item.amount)}</td>
                        </tr>
                     ))}
                  </tbody>
                  <tfoot>
                     <tr className="border-t-2 border-black font-bold">
                        <td colSpan={2} className="py-3">TOTAL INCOME</td>
                        <td className="text-right py-3 text-green-700">
                           {formatCurrency(exportEntries.filter((e: any) => e.type === 'INCOME').reduce((s: number, e: any) => s + e.amount, 0))}
                        </td>
                     </tr>
                  </tfoot>
               </table>
            </div>

            <div>
               <h3 className="text-lg font-bold border-b border-black pb-2 mb-4">EXPENSES</h3>
               <table className="w-full text-sm text-left">
                  <thead>
                     <tr className="border-b border-gray-300">
                        <th className="py-2">Date</th>
                        <th className="py-2">Description</th>
                        <th className="text-right py-2">Amount</th>
                     </tr>
                  </thead>
                  <tbody>
                     {exportEntries.filter((e: any) => e.type === 'EXPENSE').map((item: any, i: number) => (
                        <tr key={i} className="border-b border-gray-100">
                           <td className="py-2">{formatDate(item.date)}</td>
                           <td className="py-2 pr-2">{item.source}</td>
                           <td className="text-right py-2 font-medium">{formatCurrency(item.amount)}</td>
                        </tr>
                     ))}
                  </tbody>
                  <tfoot>
                     <tr className="border-t-2 border-black font-bold">
                        <td colSpan={2} className="py-3">TOTAL EXPENSE</td>
                        <td className="text-right py-3 text-red-700">
                           {formatCurrency(exportEntries.filter((e: any) => e.type === 'EXPENSE').reduce((s: number, e: any) => s + e.amount, 0))}
                        </td>
                     </tr>
                  </tfoot>
               </table>
            </div>
         </div>

         {(() => {
            const inc = exportEntries.filter((e: any) => e.type === 'INCOME').reduce((s: number, e: any) => s + e.amount, 0);
            const exp = exportEntries.filter((e: any) => e.type === 'EXPENSE').reduce((s: number, e: any) => s + e.amount, 0);
            const net = inc - exp;
            return (
               <div className="mt-8 pt-4 border-t-2 border-black font-bold text-xl flex justify-between">
                  <span>NET BALANCE (PROFIT/LOSS)</span>
                  <span className={net >= 0 ? "text-green-700" : "text-red-700"}>{formatCurrency(net)}</span>
               </div>
            );
         })()}
         <div className="mt-16 text-center text-xs text-gray-500">System Generated Balance Sheet • Sharda Palace</div>
        </div>
        )}
      </div>
    </div>
  );
}
