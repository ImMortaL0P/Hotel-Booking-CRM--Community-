import { useState } from 'react';
import { useData } from '../data/DataContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { CreditCard, IndianRupee, FileText, Download, Wallet, AlertCircle, ArrowUpRight, Search, Printer, X } from 'lucide-react';
import { PaymentTransaction } from '../data/types';

export function Payments() {
  const { payments, bookings, guests } = useData();
  const [search, setSearch] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentTransaction | null>(null);

  // Stats
  const todayStr = new Date().toDateString();
  const todaysCollections = payments.filter(p => new Date(p.date).toDateString() === todayStr && p.status === 'Success').reduce((sum, p) => sum + p.amount, 0);
  const thisMonthCollections = payments.filter(p => p.status === 'Success').reduce((sum, p) => sum + p.amount, 0); // Mock all for now as this month
  
  const pendingCollections = bookings.reduce((sum, b) => {
    const paid = payments.filter(p => p.bookingId === b.id && p.status === 'Success').reduce((s, p) => s + p.amount, 0);
    const balance = b.total - paid;
    return balance > 0 ? sum + balance : sum;
  }, 0);

  const filteredPayments = payments.filter(p => {
    if (search) {
      const q = search.toLowerCase();
      return p.id.toLowerCase().includes(q) || p.bookingId.toLowerCase().includes(q);
    }
    return true;
  }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getModeColor = (mode: string) => {
    switch(mode) {
      case 'UPI': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Cash': return 'bg-green-100 text-green-700 border-green-200';
      case 'Card': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Bank Transfer': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Success': return 'text-green-600 bg-green-50';
      case 'Failed': return 'text-red-600 bg-red-50';
      case 'Refunded': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2d1b1c]">Payments Ledger</h1>
          <p className="text-sm text-gray-500">Track collections, outstanding balances, and generate receipts.</p>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white p-5 rounded-xl border border-[#e6dfd8] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Collected This Month</span>
            <div className="w-8 h-8 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{formatCurrency(thisMonthCollections)}</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-red-200 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-full -z-10"></div>
          <div className="flex justify-between items-start mb-2 relative z-0">
            <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">Pending Collections</span>
            <div className="w-8 h-8 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-red-700 relative z-0">{formatCurrency(pendingCollections)}</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#e6dfd8] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Collections</span>
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{formatCurrency(todaysCollections)}</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#e6dfd8] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Refunds Issued</span>
            <div className="w-8 h-8 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{formatCurrency(0)}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-t-xl border border-[#e6dfd8] border-b-0 shrink-0 mt-4">
        <h2 className="font-bold text-[#7B1E22] flex items-center gap-2">
          <FileText className="w-5 h-5"/> Transaction History
        </h2>
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search Receipt or Booking ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 border border-[#e6dfd8] rounded focus:outline-none focus:border-[#7B1E22] text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border text-sm border-[#e6dfd8] rounded-b-xl overflow-x-auto flex-1 h-0">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-[#FAF6F0] sticky top-0 z-10 shadow-sm">
            <tr className="border-b border-[#e6dfd8] text-xs font-semibold text-gray-600 uppercase">
              <th className="px-4 py-3">Receipt No.</th>
              <th className="px-4 py-3">Booking ID</th>
              <th className="px-4 py-3">Guest</th>
              <th className="px-4 py-3">Date & Time</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredPayments.map(p => {
              const booking = bookings.find(b => b.id === p.bookingId);
              const guest = guests.find(g => g.id === booking?.guestId);
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.id}</td>
                  <td className="px-4 py-3 font-semibold text-[#7B1E22] hover:underline cursor-pointer">{p.bookingId}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{guest?.name || p.bookingId}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(p.date)} {new Date(p.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getModeColor(p.mode)}`}>
                      {p.mode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">
                    {formatCurrency(p.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${getStatusColor(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={() => setSelectedReceipt(p)}
                      className="p-1.5 text-[#7B1E22] hover:bg-red-50 rounded" title="View Full Receipt"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
            {filteredPayments.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500 italic">No transactions found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Printable Receipt Modal Overlay */}
      {selectedReceipt && (() => {
        const _booking = bookings.find(b => b.id === selectedReceipt.bookingId);
        const _guest = guests.find(g => g.id === _booking?.guestId);
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-full overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Actions Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                  <FileText className="w-5 h-5"/> Payment Receipt
                </h3>
                <div className="flex gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
                    <Printer className="w-4 h-4"/> Print
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-[#7B1E22] bg-white border border-[#7B1E22] rounded hover:bg-red-50">
                    <Download className="w-4 h-4"/> PDF
                  </button>
                  <button onClick={() => setSelectedReceipt(null)} className="p-1.5 hover:bg-gray-200 rounded-full ml-4">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Area */}
              <div className="p-8 overflow-y-auto bg-white" id="printable-receipt">
                <div className="text-center mb-6">
                  <h1 className="text-3xl font-bold text-[#7B1E22] uppercase tracking-wider font-serif">Sharda Palace</h1>
                  <p className="text-sm text-gray-600 mt-1">Main Shivganga Road, Bam Bam Baba Path, near Matri Mandir<br/>Deoghar, Jharkhand 814112</p>
                  <p className="text-sm text-gray-600 font-medium mt-1">Ph: +91 79707 35251 | GSTIN: 20XXXXX1234X1ZX</p>
                </div>

                <div className="flex justify-between items-end border-b-2 border-[#7B1E22] pb-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-wide uppercase">Payment Receipt</h2>
                    <p className="text-gray-500 font-medium mt-1 text-sm">Receipt No: <strong>{selectedReceipt.id}</strong></p>
                    <p className="text-gray-500 font-medium text-sm">Date: {formatDate(selectedReceipt.date)} {new Date(selectedReceipt.date).toLocaleTimeString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Billed To</h4>
                    <p className="font-bold text-gray-900 text-lg">{_guest?.name || 'Walk-in Guest'}</p>
                    {_guest && (
                      <p className="text-gray-600 text-sm mt-1">
                        Phone: {_guest.phone}<br/>
                        ID: {_guest.idProofType} ({_guest.idProofNumber})
                      </p>
                    )}
                  </div>
                  <div className="text-right flex flex-col justify-end">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Booking Reference</h4>
                    <p className="font-bold text-[#7B1E22] text-lg">{selectedReceipt.bookingId}</p>
                    <p className="text-gray-600 text-sm mt-1 border inline-block ml-auto px-2 py-0.5 rounded bg-gray-50 mt-2 font-medium">
                      Status: {selectedReceipt.status}
                    </p>
                  </div>
                </div>

                <table className="w-full mb-8">
                  <thead className="bg-[#FAF6F0] border-y border-[#e6dfd8]">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm text-gray-700">Description</th>
                      <th className="px-4 py-2 text-center text-sm text-gray-700">Payment Mode</th>
                      <th className="px-4 py-2 text-right text-sm text-gray-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-4 text-sm font-medium border-b border-gray-100">
                        Accommodation / Services Advance
                      </td>
                      <td className="px-4 py-4 text-sm text-center border-b border-gray-100">
                         <span className="font-mono text-xs font-bold">{selectedReceipt.mode}</span>
                      </td>
                      <td className="px-4 py-4 text-sm text-right font-bold text-gray-900 border-b border-gray-100">
                        {formatCurrency(selectedReceipt.amount)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-right font-bold text-gray-700">Total Paid</td>
                      <td className="px-4 py-3 text-right font-bold text-xl text-[#7B1E22]">{formatCurrency(selectedReceipt.amount)}</td>
                    </tr>
                  </tfoot>
                </table>

                <div className="pt-8 mt-12 mb-4 border-t border-gray-200 flex justify-between items-end">
                  <div className="text-sm text-gray-500 flex flex-col gap-1 italic">
                    <span>Includes 12% GST as applicable.</span>
                    <span>This is a computer generated receipt.</span>
                    <span className="font-bold text-[#7B1E22] not-italic mt-2">जय बाबा बैद्यनाथ · Jai Baba Baidyanath</span>
                  </div>
                  <div className="text-center">
                    <div className="w-40 border-b border-gray-400 mb-2 mt-8"></div>
                    <span className="text-xs text-gray-500 font-bold uppercase">Authorized Signatory</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
