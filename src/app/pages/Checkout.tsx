import { useState, useMemo } from 'react';
import { useData } from '../data/DataContext';
import { apiFetch } from '../lib/api';
import { Receipt, Search, Printer, CheckCircle, Download } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { InvoiceTemplate, InvoiceDataProps } from '../components/InvoiceTemplate';
// @ts-ignore
export function Checkout() {
  const { rooms, bookings, guests, payments, updateBooking, updateRoomStatus, addStoredInvoice, isLoading } = useData();
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [isGenerated, setIsGenerated] = useState(false);
  const [finalInvoiceData, setFinalInvoiceData] = useState<InvoiceDataProps | null>(null);

  const activeRooms = useMemo(() => {
    return rooms.filter(r => r.status === 'Occupied');
  }, [rooms]);

  const activeBooking = useMemo(() => {
    if (!selectedRoomId) return null;
    return bookings.find(b => b.roomId === selectedRoomId && b.status === 'Checked-In');
  }, [bookings, selectedRoomId]);

  const guest = useMemo(() => {
    if (!activeBooking) return null;
    return guests.find(g => g.id === activeBooking.guestId);
  }, [activeBooking, guests]);

  const room = useMemo(() => {
    if (!activeBooking) return null;
    return rooms.find(r => r.id === activeBooking.roomId);
  }, [activeBooking, rooms]);

  const invoiceData = useMemo<InvoiceDataProps | null>(() => {
    if (!activeBooking || !guest || !room) return null;

    const nights = differenceInDays(parseISO(activeBooking.checkOut), parseISO(activeBooking.checkIn)) || 1;
    const roomAmount = room.tariff * nights;
    
    // Simplification: only room charges tracked natively in this demo
    const items = [
      {
        id: 1,
        description: `${room.category} - ${nights} nights`,
        unitPrice: room.tariff,
        qty: 1,
        discount: 0,
        gstPct: 12, // Standard hotel GST logic in this project
        amount: roomAmount
      }
    ];

    const subtotal = roomAmount;
    const gstTotal = subtotal * 0.12;
    const total = subtotal + gstTotal;

    const bookingPayments = payments.filter(p => p.bookingId === activeBooking.id && p.status === 'Completed');
    const paymentMode = bookingPayments.length > 0 ? bookingPayments[0].mode : 'Pending';

    return {
      invoiceId: `SP-CHK-${Math.floor(Math.random()*10000)}`,
      date: format(new Date(), 'MMM dd, yyyy'),
      billedTo: {
        name: guest.name,
        address: '', // Mock doesn't have detailed address
        cityState: `${guest.city}, ${guest.state}`,
        phone: guest.phone,
        idPrefix: guest.id
      },
      checkIn: format(parseISO(activeBooking.checkIn), 'MMM dd, yyyy | HH:mm'),
      checkOut: format(new Date(), 'MMM dd, yyyy | HH:mm'),
      roomPlan: `${room.number} / EP`,
      paymentStatus: activeBooking.balance <= 0 ? 'PAID' : 'DUE',
      items,
      subtotal,
      gstTotal,
      total,
      staySummary: {
        nights,
        adults: activeBooking.adults,
        children: activeBooking.children,
        room: room.number,
        paymentMode,
        amountReceived: activeBooking.paid,
        balance: activeBooking.balance
      }
    };
  }, [activeBooking, guest, room, payments]);

  const handleCheckout = async () => {
    if (!activeBooking || !room || !invoiceData) return;

    if (activeBooking.balance > 0) {
      const authorized = window.confirm(`This booking has an outstanding balance of ₹${activeBooking.balance}. Do you want to authorize checkout anyway?`);
      if (!authorized) return;
    }

    // 1. Update Booking
    updateBooking({ ...activeBooking, status: 'Checked-Out' });

    // 2. Update Room Status
    updateRoomStatus(room.id, 'Cleaning');

    // 3. Save to database via addStoredInvoice
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

    // 4. Optional: save HTML to archive via backend
    const htmlObj = document.getElementById('invoice-capture-area')?.outerHTML;
    if (htmlObj) {
        // Embed some generic styling to make printed version look ok on backend
        const fullHtml = `<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="p-4 bg-white text-black print:m-0 w-[800px]">${htmlObj}</body></html>`;

        // Let's use standard toast if available, or just console log
        apiFetch('/api/documents/save', {
          method: 'POST',
          body: JSON.stringify({
             html: fullHtml,
             filename: invoiceData.invoiceId,
             type: 'Invoice'
          })
        }).then(res => {
            console.log("Invoice archived to drive successfully!");
        }).catch(err => console.error("Could not save invoice file", err));
    }

    setIsGenerated(true);
    setFinalInvoiceData(invoiceData);
  };

  const printInvoice = () => {
    window.print();
  };

  const downloadPDF = () => {
    alert("Please select 'Save as PDF' from the destination dropdown natively for faster and better quality capture.");
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-full print:m-0 print:p-0 print:w-full print:max-w-none">
      <div className="mb-8 print:hidden">
        <h1 className="text-3xl font-bold text-foreground font-display flex items-center gap-3">
          <Receipt className="text-[#D4AF37] w-8 h-8" />
          Checkout & Bill Operations
        </h1>
        <p className="text-foreground/80 mt-2">Generate final invoices and checkout guests</p>
      </div>

      {!isGenerated ? (
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border mb-8 print:hidden">
          <h2 className="text-lg font-bold mb-4">Select Room to Checkout</h2>
          <div className="flex gap-4 max-w-xl">
             <div className="relative flex-1">
               <select
                 className="w-full h-12 pl-4 pr-10 rounded-lg border border-border focus:border-primary focus:ring-1 focus:ring-primary appearance-none"
                 value={selectedRoomId}
                 onChange={e => setSelectedRoomId(e.target.value)}
               >
                 <option value="">-- Choose occupied room --</option>
                 {activeRooms.map(r => (
                   <option key={r.id} value={r.id}>Room {r.number} - {r.category}</option>
                 ))}
                 {activeRooms.length === 0 && !isLoading && <option disabled>No occupied rooms</option>}
               </select>
             </div>
             <button disabled={!activeBooking} onClick={handleCheckout} className="h-12 px-6 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-[#60171a] disabled:opacity-50 disabled:cursor-not-allowed">
               Checkout & Save
             </button>
          </div>
        </div>
      ) : (
        <div className="bg-green-100/50 p-6 rounded-lg shadow-sm border border-green-200 mb-8 print:hidden flex flex-col sm:flex-row gap-4 items-center justify-between">
           <div className="flex items-center gap-3 text-green-800">
             <CheckCircle className="w-8 h-8" />
             <div>
                <h3 className="font-bold text-lg">Checkout Completed</h3>
                <p>Room is set to cleaning. You can now download or print the invoice.</p>
             </div>
           </div>
           <div className="flex gap-4 flex-wrap">
              <button onClick={() => { setIsGenerated(false); setSelectedRoomId(''); setFinalInvoiceData(null); }} className="px-5 py-2.5 border border-border text-foreground font-bold rounded-lg hover:bg-muted/50 transition-colors">
                New Checkout
              </button>
              <button onClick={downloadPDF} className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex gap-2 items-center">
                <Download className="w-4 h-4" /> Save as PDF
              </button>
              <button onClick={printInvoice} className="px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-[#60171a] flex gap-2 items-center">
                <Printer className="w-4 h-4" /> Print
              </button>
           </div>
        </div>
      )}

      {/* Invoice Preview */}
      {(isGenerated ? finalInvoiceData : invoiceData) && (
        <div className="print:block">
           <div className="print:hidden flex justify-between items-end mb-4">
              <h2 className="text-xl font-bold text-foreground">Invoice Preview</h2>
           </div>
           <InvoiceTemplate data={(isGenerated ? finalInvoiceData : invoiceData)!} />
        </div>
      )}
    </div>
  );
}
