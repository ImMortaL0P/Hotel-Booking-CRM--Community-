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

export const InvoiceTemplate = ({ data }: { data: InvoiceDataProps }) => {
  return (
    <div className="bg-card p-8 max-w-4xl mx-auto border border-gray-200" id="invoice-capture-area">
      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b-2 border-gray-100 pb-4">
        <div className="flex flex-col items-center">
          <img src={logoUrl} alt="Sharda Palace" className="h-16 w-auto object-contain mb-2" />
          <h2 className="text-[#654321] font-bold tracking-widest text-lg font-serif">SHARDA PALACE</h2>
          <p className="text-[#a68a6d] text-xs uppercase tracking-wider mt-1">Comfort Near Faith</p>
        </div>
        <div className="text-right flex flex-col items-end">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">INVOICE</h1>
          <p className="font-bold text-sm text-gray-800 mt-2">Sharda Palace</p>
          <p className="text-sm text-gray-600 leading-tight">
            Shivganga Road, Near Tower Chowk<br />
            Deoghar, Jharkhand - 814112<br />
            India<br />
            Ph: +91 79707 35251<br />
            Email: mail@shardapalace.example<br />
          </p>
        </div>
      </div>

      {/* Info Section */}
      <div className="flex justify-between mb-8">
        <div>
          <h3 className="font-bold text-gray-800 mb-1">Billed to</h3>
          <p className="text-sm text-gray-700 leading-tight">
            <span className="font-semibold block">{data.billedTo.name}</span>
            {data.billedTo.address && <>{data.billedTo.address}<br /></>}
            {data.billedTo.cityState}<br />
            India<br />
            <span className="mt-1 block">Phone: {data.billedTo.phone}</span>
            {data.billedTo.idPrefix && <span className="mt-1 block">Guest ID: {data.billedTo.idPrefix}</span>}
          </p>
        </div>
        <div className="text-right">
          <table className="text-sm text-gray-700 ml-auto">
            <tbody>
              <tr><td className="font-semibold pr-4 py-0.5 text-right">Invoice number:</td><td className="text-right">{data.invoiceId}</td></tr>
              <tr><td className="font-semibold pr-4 py-0.5 text-right">Invoice date:</td><td className="text-right">{data.date}</td></tr>
              {data.checkIn && <tr><td className="font-semibold pr-4 py-0.5 text-right">Check-in:</td><td className="text-right">{data.checkIn}</td></tr>}
              {data.checkOut && <tr><td className="font-semibold pr-4 py-0.5 text-right">Check-out:</td><td className="text-right">{data.checkOut}</td></tr>}
              {data.roomPlan && <tr><td className="font-semibold pr-4 py-0.5 text-right">Room / plan:</td><td className="text-right">{data.roomPlan}</td></tr>}
              <tr><td className="font-semibold pr-4 py-0.5 text-right">Payment status:</td><td className="text-right font-bold">{data.paymentStatus}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Table */}
      <table className="w-full text-sm mb-6 border-collapse border border-gray-300">
        <thead className="bg-gray-50 border-b border-gray-300">
          <tr>
            <th className="py-2 px-3 text-left font-semibold text-gray-800 border-r border-gray-300 w-12">Item #</th>
            <th className="py-2 px-3 text-left font-semibold text-gray-800 border-r border-gray-300">Description</th>
            <th className="py-2 px-3 text-right font-semibold text-gray-800 border-r border-gray-300 w-24">Unit Price</th>
            <th className="py-2 px-3 text-right font-semibold text-gray-800 border-r border-gray-300 w-16">Qty</th>
            <th className="py-2 px-3 text-right font-semibold text-gray-800 border-r border-gray-300 w-20">GST (%)</th>
            <th className="py-2 px-3 text-right font-semibold text-gray-800 w-28">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, i) => (
            <tr key={i} className="border-b border-gray-200 text-gray-700">
              <td className="py-2 px-3 border-r border-gray-300">{item.id}</td>
              <td className="py-2 px-3 border-r border-gray-300">{item.description}</td>
              <td className="py-2 px-3 text-right border-r border-gray-300">{item.unitPrice.toFixed(2)}</td>
              <td className="py-2 px-3 text-right border-r border-gray-300">{item.qty}</td>
              <td className="py-2 px-3 text-right border-r border-gray-300">{item.gstPct}</td>
              <td className="py-2 px-3 text-right">{item.amount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <table className="text-sm text-gray-800 font-medium">
          <tbody>
            <tr><td className="pr-4 py-1 text-right">Subtotal:</td><td className="text-right w-28">{data.subtotal.toFixed(2)}</td></tr>
            <tr><td className="pr-4 py-1 text-right">GST:</td><td className="text-right w-28">{data.gstTotal.toFixed(2)}</td></tr>
            <tr><td className="pr-4 py-1 pb-2 border-b border-gray-300 text-right">Round off:</td><td className="text-right w-28 pb-2 border-b border-gray-300">0.00</td></tr>
            <tr className="font-bold text-base"><td className="pr-4 py-2 text-right">Total:</td><td className="text-right w-28">Rs. {data.total.toFixed(2)}</td></tr>
          </tbody>
        </table>
      </div>

      {/* Stay Summary */}
      {data.staySummary && (
        <div className="mb-6">
          <h3 className="font-bold text-gray-800 mb-2">Stay & payment summary</h3>
          <p className="text-sm text-gray-700">
            Room nights: {data.staySummary.nights} &nbsp;|&nbsp; Adults: {data.staySummary.adults} &nbsp;|&nbsp; Children: {data.staySummary.children} &nbsp;|&nbsp; Room: {data.staySummary.room}
          </p>
          <p className="text-sm text-gray-700 mt-1">
            Payment mode: {data.staySummary.paymentMode}
          </p>
          <p className="text-sm text-gray-700 mt-1">
            Amount received: Rs. {data.staySummary.amountReceived.toFixed(2)} &nbsp;|&nbsp; Balance due: Rs. {data.staySummary.balance.toFixed(2)}
          </p>
        </div>
      )}

      {/* Bank details & Terms */}
      <div className="text-sm text-gray-700 mb-4 block">
        <h3 className="font-bold text-gray-800 mb-2">Please make payment to</h3>
        <p>Sharda Palace - Hotel Operations Account</p>
        <p>Bank: STATE BANK OF INDIA &nbsp;|&nbsp; A/c: 30000000000 &nbsp;|&nbsp; IFSC: SBIN0000000</p>
        <p>UPI: shardapalace@upi</p>
      </div>

      <div className="text-xs text-gray-500 mt-8 border-t border-gray-200 pt-4 flex justify-between">
        <div>
          <p className="font-bold text-gray-600 mb-1">Terms and conditions</p>
          <p>All amounts are in Indian Rupees (INR). Guest folio closed with no outstanding balance.</p>
        </div>
        <div className="text-right">
          <p>Page 1 of 1</p>
          <p className="mt-1 text-[10px]">Sharda Palace, Deoghar</p>
        </div>
      </div>
    </div>
  );
};
