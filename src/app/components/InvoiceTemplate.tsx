import React from 'react';
import { format } from 'date-fns';
import logoUrl from '../../assets/logo.png';

export interface InvoiceItem {
  id: number;
  description: string;
  unitPrice: number;
  qty: number;
  discount: number;
  gstPct: number;
  amount: number;
}

export interface InvoiceDataProps {
  invoiceId: string;
  date: string;
  billedTo: {
    name: string;
    address: string;
    cityState: string;
    phone: string;
    idPrefix?: string;
  };
  checkIn?: string;
  checkOut?: string;
  roomPlan?: string;
  paymentStatus: string;
  items: InvoiceItem[];
  subtotal: number;
  gstTotal: number;
  total: number;
  staySummary?: {
    nights: number;
    adults: number;
    children: number;
    room: string;
    paymentMode: string;
    amountReceived: number;
    balance: number;
  };
}

export const InvoiceTemplate = ({ data, elementId = "invoice-capture-area" }: { data: InvoiceDataProps, elementId?: string }) => {
  return (
    <div className="bg-card text-foreground p-4 sm:p-8 max-w-4xl mx-auto border border-border rounded-xl font-sans" id={elementId}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 sm:mb-8 border-b border-border pb-6">
        <div className="flex flex-col items-start">
          <img src={logoUrl} alt="Sharda Palace" className="h-12 w-auto object-contain mb-2" />
          <h2 className="text-foreground font-serif text-2xl font-normal tracking-tight">SHARDA PALACE</h2>
          <p className="text-muted-foreground text-[10px] uppercase tracking-widest font-mono mt-0.5">Comfort Near Faith · Deoghar</p>
        </div>
        <div className="text-left sm:text-right flex flex-col items-start sm:items-end">
          <h1 className="text-3xl font-serif font-light text-primary tracking-tight mb-2">INVOICE</h1>
          <p className="font-semibold text-xs text-foreground">Hotel Sharda Palace</p>
          <p className="text-xs text-muted-foreground font-mono leading-relaxed mt-1">
            Shivganga Road, Near Tower Chowk<br />
            Deoghar, Jharkhand - 814112<br />
            Ph: +91 79707 35251<br />
            Email: mail@shardapalace.example<br />
          </p>
        </div>
      </div>

      {/* Info Section */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Billed To</h3>
          <p className="text-sm text-foreground leading-relaxed">
            <span className="font-semibold block text-base">{data.billedTo.name}</span>
            {data.billedTo.address && <>{data.billedTo.address}<br /></>}
            <span className="text-muted-foreground">{data.billedTo.cityState}</span><br />
            <span className="font-mono text-xs text-muted-foreground mt-1 block">Ph: {data.billedTo.phone}</span>
            {data.billedTo.idPrefix && <span className="font-mono text-xs text-muted-foreground block">Guest ID: {data.billedTo.idPrefix}</span>}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <table className="text-xs text-foreground sm:ml-auto font-mono">
            <tbody>
              <tr><td className="text-muted-foreground pr-4 py-0.5 text-left sm:text-right">Invoice ID:</td><td className="text-left sm:text-right font-semibold text-primary">{data.invoiceId}</td></tr>
              <tr><td className="text-muted-foreground pr-4 py-0.5 text-left sm:text-right">Date:</td><td className="text-left sm:text-right">{data.date}</td></tr>
              {data.checkIn && <tr><td className="text-muted-foreground pr-4 py-0.5 text-left sm:text-right">Check-in:</td><td className="text-left sm:text-right">{data.checkIn}</td></tr>}
              {data.checkOut && <tr><td className="text-muted-foreground pr-4 py-0.5 text-left sm:text-right">Check-out:</td><td className="text-left sm:text-right">{data.checkOut}</td></tr>}
              {data.roomPlan && <tr><td className="text-muted-foreground pr-4 py-0.5 text-left sm:text-right">Room / Plan:</td><td className="text-left sm:text-right">{data.roomPlan}</td></tr>}
              <tr><td className="text-muted-foreground pr-4 py-0.5 text-left sm:text-right">Status:</td><td className="text-left sm:text-right font-bold text-primary">{data.paymentStatus}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto mb-6 -mx-4 sm:mx-0 px-4 sm:px-0">
        <table className="w-full text-xs border-collapse border border-border min-w-[520px]">
          <thead className="bg-secondary/60 border-b border-border">
            <tr className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="py-2 px-3 text-left border-r border-border w-12">#</th>
              <th className="py-2 px-3 text-left border-r border-border">Description</th>
              <th className="py-2 px-3 text-right border-r border-border w-24">Unit Price</th>
              <th className="py-2 px-3 text-right border-r border-border w-16">Qty</th>
              <th className="py-2 px-3 text-right border-r border-border w-20">GST</th>
              <th className="py-2 px-3 text-right w-28">Amount</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {data.items.map((item, i) => (
              <tr key={i} className="border-b border-border text-foreground hover:bg-muted/30">
                <td className="py-2 px-3 border-r border-border text-muted-foreground">{item.id}</td>
                <td className="py-2 px-3 border-r border-border font-sans font-medium">{item.description}</td>
                <td className="py-2 px-3 text-right border-r border-border">₹{item.unitPrice.toFixed(2)}</td>
                <td className="py-2 px-3 text-right border-r border-border">{item.qty}</td>
                <td className="py-2 px-3 text-right border-r border-border">{item.gstPct}%</td>
                <td className="py-2 px-3 text-right font-medium">₹{item.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <table className="text-xs text-foreground font-mono">
          <tbody>
            <tr><td className="pr-4 py-1 text-right text-muted-foreground">Subtotal:</td><td className="text-right w-28">₹{data.subtotal.toFixed(2)}</td></tr>
            <tr><td className="pr-4 py-1 text-right text-muted-foreground">GST Total:</td><td className="text-right w-28">₹{data.gstTotal.toFixed(2)}</td></tr>
            <tr><td className="pr-4 py-1 pb-2 border-b border-border text-right text-muted-foreground">Round Off:</td><td className="text-right w-28 pb-2 border-b border-border">₹0.00</td></tr>
            <tr className="font-bold text-sm"><td className="pr-4 py-2 text-right text-primary">Grand Total:</td><td className="text-right w-28 text-primary font-bold">₹{data.total.toFixed(2)}</td></tr>
          </tbody>
        </table>
      </div>

      {/* Stay Summary */}
      {data.staySummary && (
        <div className="mb-6 p-4 rounded-lg bg-secondary/40 border border-border text-xs">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Stay & Payment Summary</h3>
          <p className="text-foreground">
            Room Nights: <span className="font-mono font-medium">{data.staySummary.nights}</span> &nbsp;|&nbsp; Adults: <span className="font-mono font-medium">{data.staySummary.adults}</span> &nbsp;|&nbsp; Children: <span className="font-mono font-medium">{data.staySummary.children}</span> &nbsp;|&nbsp; Room: <span className="font-mono font-medium">{data.staySummary.room}</span>
          </p>
          <p className="text-foreground mt-1">
            Payment Mode: <span className="font-mono font-medium">{data.staySummary.paymentMode}</span>
          </p>
          <p className="text-foreground mt-1 font-mono">
            Amount Received: ₹{data.staySummary.amountReceived.toFixed(2)} &nbsp;|&nbsp; Balance Due: <span className={data.staySummary.balance > 0 ? 'text-primary font-bold' : ''}>₹{data.staySummary.balance.toFixed(2)}</span>
          </p>
        </div>
      )}

      {/* Bank details & Terms */}
      <div className="text-xs text-muted-foreground mb-4 font-mono space-y-1">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-foreground font-bold mb-1">Bank & UPI Settlement</h3>
        <p>Sharda Palace - Hotel Operations</p>
        <p>State Bank of India &nbsp;|&nbsp; A/c: 30000000000 &nbsp;|&nbsp; IFSC: SBIN0000000</p>
        <p>UPI ID: shardapalace@upi</p>
      </div>

      <div className="text-[10px] font-mono text-muted-foreground mt-8 border-t border-border pt-4 flex flex-col sm:flex-row justify-between gap-2">
        <div>
          <p className="font-semibold text-foreground uppercase tracking-wider mb-0.5">Terms & Conditions</p>
          <p>All amounts are in Indian Rupees (INR). Computer generated folio, signature not required.</p>
        </div>
        <div className="text-left sm:text-right">
          <p>Page 1 of 1</p>
          <p className="mt-0.5 text-primary">Hotel Sharda Palace, Deoghar</p>
        </div>
      </div>
    </div>
  );
};
