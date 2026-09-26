import { randomUUID } from 'crypto';
import { InboxMessage, InboxProvider } from './types.js';

/**
 * Stand-in inbox used until a real mailbox is configured (see imapInbox.ts).
 *
 * It holds realistic OTA / website emails in the shapes the parser has to
 * cope with (plain text, HTML tables, "label on one line, value on the next",
 * modifications, cancellations, duplicates, promos and an incomplete email).
 * Stay dates are relative to today so imported bookings land on the calendar.
 */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const addDays = (n: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
};

// Different OTAs format dates differently; the parser must handle all of these.
const fmtLong = (d: Date) => `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; // Friday, 3 October 2026
const fmtDashed = (d: Date) => `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()].slice(0, 3)}-${d.getFullYear()}`; // 03-Oct-2026
const fmtShort = (d: Date) => `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`; // 03 Oct 2026
const fmtUs = (d: Date) => `${DAYS[d.getDay()].slice(0, 3)}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`; // Fri, Oct 3, 2026
const fmtSlash = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; // 03/10/2026

const receivedHoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

type Template = (p: {
  bookingId: string; name: string; phone: string; email: string;
  inDay: number; nights: number; adults: number; children: number;
  total: number; family: boolean;
}) => Omit<InboxMessage, 'messageId' | 'receivedAt'>;

const bookingComNew: Template = p => ({
  from: 'Booking.com <noreply@booking.com>',
  subject: `New booking! (${p.bookingId}) Arrival ${fmtUs(addDays(p.inDay))}`,
  text: `Great news! You have a new booking.

Booking number: ${p.bookingId}
Guest name: ${p.name}
Guest email: ${p.email}
Phone: ${p.phone}
Check-in: ${fmtLong(addDays(p.inDay))} (from 12:00)
Check-out: ${fmtLong(addDays(p.inDay + p.nights))} (until 11:00)
Room type: ${p.family ? 'Family Room' : 'Deluxe Double Room'}
Number of rooms: 1
Guests: ${p.adults} adults${p.children ? `, ${p.children} child` : ''}
Total price: ₹ ${p.total.toLocaleString('en-IN')}
Commission: ₹ ${Math.round(p.total * 0.15).toLocaleString('en-IN')}
Payment: Paid online (prepaid)
Booker country: India

Manage this booking in the Extranet.`
});

const agodaNew: Template = p => {
  const [first, ...rest] = p.name.split(' ');
  return {
    from: 'Agoda YCS <no-reply@agoda.com>',
    subject: `Agoda Booking Confirmation - Booking ID ${p.bookingId}`,
    html: `<html><body><h2>New Booking Confirmation</h2>
<table>
<tr><td>Booking ID</td><td>${p.bookingId}</td></tr>
<tr><td>Customer First Name</td><td>${first}</td></tr>
<tr><td>Customer Last Name</td><td>${rest.join(' ')}</td></tr>
<tr><td>Email</td><td>${p.email}</td></tr>
<tr><td>Arrival</td><td>${fmtDashed(addDays(p.inDay))}</td></tr>
<tr><td>Departure</td><td>${fmtDashed(addDays(p.inDay + p.nights))}</td></tr>
<tr><td>Room Type</td><td>${p.family ? 'Family Room' : 'Superior Double'}</td></tr>
<tr><td>No. of Rooms</td><td>1</td></tr>
<tr><td>No. of Adults</td><td>${p.adults}</td></tr>
<tr><td>No. of Children</td><td>${p.children}</td></tr>
<tr><td>Total Amount (incl. taxes)</td><td>INR ${p.total.toFixed(2)}</td></tr>
<tr><td>Commission</td><td>INR ${(p.total * 0.18).toFixed(2)}</td></tr>
<tr><td>Payment Model</td><td>Agoda Collect</td></tr>
</table>
<p>Special Request: Non-smoking room&nbsp;please</p>
</body></html>`
  };
};

const mmtNew: Template = p => ({
  from: 'MakeMyTrip Hotels <hotels@makemytrip.com>',
  subject: `Booking Confirmed: ${p.bookingId} | Sharda Palace`,
  text: `Dear Partner,
A new booking has been made at your property.

Booking ID: ${p.bookingId}
Primary Guest: ${p.name}
Mobile: ${p.phone}
Check-In: ${fmtShort(addDays(p.inDay))}
Check-Out: ${fmtShort(addDays(p.inDay + p.nights))}
Room: 1 x ${p.family ? 'Family Room' : 'Standard Double Room'}
Guests: ${p.adults} Adults${p.children ? ` ${p.children} Child` : ''}
Total Booking Amount: Rs. ${p.total}
MMT Commission: Rs. ${Math.round(p.total * 0.15)}
Payment Mode: Pay at Hotel

Regards,
Team MakeMyTrip`
});

const airbnbNew: Template = p => ({
  from: 'Airbnb <automated@airbnb.com>',
  subject: `Reservation confirmed - ${p.name} arrives ${fmtUs(addDays(p.inDay))}`,
  // Airbnb puts the label on one line and the value on the next
  text: `New booking confirmed! ${p.name.split(' ')[0]} arrives soon.

Confirmation code
${p.bookingId}

Guest
${p.name}

Check-in
${fmtUs(addDays(p.inDay))} 2:00 PM

Checkout
${fmtUs(addDays(p.inDay + p.nights))} 11:00 AM

Guests
${p.adults} adults${p.children ? `, ${p.children} children` : ''}

Total (INR)
₹${p.total.toLocaleString('en-IN')}

Host service fee
₹${Math.round(p.total * 0.03)}

Payout: sent to your account after check-in (prepaid)`
});

const websiteNew: Template = p => ({
  from: 'Sharda Palace Website <bookings@shardapalace.in>',
  subject: `New booking request #${p.bookingId} from website`,
  text: `A new booking was submitted on the website.

Reservation ID: ${p.bookingId}
Name: ${p.name}
Email: ${p.email}
Contact: ${p.phone}
Arrival date: ${fmtSlash(addDays(p.inDay))}
Departure date: ${fmtSlash(addDays(p.inDay + p.nights))}
Room: ${p.family ? 'Family Bed Room' : 'Double Bed Room'}
Adults: ${p.adults}
Children: ${p.children}
Amount: ₹${p.total}
Payment: Pay at hotel`
});

const BASE: InboxMessage[] = [
  {
    messageId: '<bdc-4012345678-new@dummy.booking.com>',
    receivedAt: receivedHoursAgo(30),
    ...bookingComNew({ bookingId: '4012345678', name: 'Rahul Sharma', phone: '+91 98310 22114', email: 'rsharma.812@guest.booking.com', inDay: 2, nights: 2, adults: 2, children: 1, total: 4480, family: false })
  },
  {
    messageId: '<agoda-987654321@dummy.agoda.com>',
    receivedAt: receivedHoursAgo(26),
    ...agodaNew({ bookingId: '987654321', name: 'Priya Verma', phone: '', email: 'priya.verma@example.com', inDay: 4, nights: 2, adults: 3, children: 1, total: 6200, family: true })
  },
  {
    messageId: '<mmt-NH7812345678@dummy.makemytrip.com>',
    receivedAt: receivedHoursAgo(20),
    ...mmtNew({ bookingId: 'NH7812345678', name: 'Ankit Kumar', phone: '9876501234', email: '', inDay: 1, nights: 1, adults: 2, children: 0, total: 2350, family: false })
  },
  {
    messageId: '<airbnb-HMQX4K2P9A@dummy.airbnb.com>',
    receivedAt: receivedHoursAgo(16),
    ...airbnbNew({ bookingId: 'HMQX4K2P9A', name: 'Sneha Iyer', phone: '', email: '', inDay: 6, nights: 3, adults: 2, children: 0, total: 7500, family: false })
  },
  {
    messageId: '<web-1043@dummy.shardapalace.in>',
    receivedAt: receivedHoursAgo(12),
    ...websiteNew({ bookingId: 'WEB-1043', name: 'Vikash Singh', phone: '+91 70045 11223', email: 'vikash.singh@example.com', inDay: 3, nights: 1, adults: 2, children: 0, total: 2240, family: false })
  },
  {
    // Booked and then cancelled — should end up Cancelled with inventory released
    messageId: '<bdc-4019998888-new@dummy.booking.com>',
    receivedAt: receivedHoursAgo(10),
    ...bookingComNew({ bookingId: '4019998888', name: 'Meera Joshi', phone: '+91 99340 55120', email: 'mjoshi.302@guest.booking.com', inDay: 8, nights: 2, adults: 2, children: 0, total: 4200, family: false })
  },
  {
    messageId: '<bdc-4012345678-modify@dummy.booking.com>',
    receivedAt: receivedHoursAgo(8),
    from: 'Booking.com <noreply@booking.com>',
    subject: 'Booking modified (4012345678)',
    text: `The following booking has been modified by the guest.

Booking number: 4012345678
Guest name: Rahul Sharma
Check-in: ${fmtLong(addDays(2))}
Check-out: ${fmtLong(addDays(5))} (changed)
Guests: 2 adults, 1 child
Total price: ₹ 6,720
Commission: ₹ 1,008
Payment: Paid online (prepaid)`
  },
  {
    messageId: '<bdc-4019998888-cancel@dummy.booking.com>',
    receivedAt: receivedHoursAgo(6),
    from: 'Booking.com <noreply@booking.com>',
    subject: 'Booking cancelled (4019998888)',
    text: `This booking has been cancelled by the guest.

Booking number: 4019998888
Guest name: Meera Joshi
Cancellation fee: ₹ 0`
  },
  {
    // Same booking number re-sent by the OTA — must not create a second booking
    messageId: '<bdc-4012345678-resend@dummy.booking.com>',
    receivedAt: receivedHoursAgo(5),
    ...bookingComNew({ bookingId: '4012345678', name: 'Rahul Sharma', phone: '+91 98310 22114', email: 'rsharma.812@guest.booking.com', inDay: 2, nights: 2, adults: 2, children: 1, total: 4480, family: false })
  },
  {
    messageId: '<mmt-NH7899990000@dummy.makemytrip.com>',
    receivedAt: receivedHoursAgo(3),
    from: 'MakeMyTrip Hotels <hotels@makemytrip.com>',
    subject: 'Booking Confirmed: NH7899990000 | Sharda Palace',
    // Check-out is missing: should be flagged for review, not guessed
    text: `Booking ID: NH7899990000
Primary Guest: Deepak Rao
Mobile: 9123456780
Check-In: ${fmtShort(addDays(5))}
Room: 1 x Standard Double Room
Guests: 2 Adults
Total Booking Amount: Rs. 2350
Payment Mode: Pay at Hotel`
  },
  {
    messageId: '<bdc-partner-newsletter@dummy.booking.com>',
    receivedAt: receivedHoursAgo(2),
    from: 'Booking.com Partner Hub <partner@booking.com>',
    subject: '5 tips to get more bookings this festive season',
    text: 'Improve your ranking with better photos, flexible cancellation policies and Genius discounts. Read more on the Partner Hub.'
  }
];

// Emails added at runtime through "Add test email" (kept in memory; the
// import records persist in Mongo either way).
const generated: InboxMessage[] = [];

const FIRST = ['Aarav', 'Ishita', 'Rohan', 'Kavya', 'Arjun', 'Nisha', 'Siddharth', 'Pooja', 'Aditya', 'Riya'];
const LAST = ['Gupta', 'Mishra', 'Pandey', 'Reddy', 'Nair', 'Das', 'Chopra', 'Jha', 'Sinha', 'Bose'];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export function addDummyTestEmail(): InboxMessage {
  const templates: [Template, () => string][] = [
    [bookingComNew, () => String(4000000000 + Math.floor(Math.random() * 99999999))],
    [agodaNew, () => String(900000000 + Math.floor(Math.random() * 9999999))],
    [mmtNew, () => `NH78${Math.floor(Math.random() * 1e8).toString().padStart(8, '0')}`],
    [airbnbNew, () => `HM${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`],
    [websiteNew, () => `WEB-${1100 + Math.floor(Math.random() * 900)}`]
  ];
  const [tpl, id] = pick(templates);
  const name = `${pick(FIRST)} ${pick(LAST)}`;
  const family = Math.random() < 0.3;
  const nights = 1 + Math.floor(Math.random() * 3);
  const msg: InboxMessage = {
    messageId: `<test-${randomUUID()}@dummy.inbox>`,
    receivedAt: new Date().toISOString(),
    ...tpl({
      bookingId: id(),
      name,
      phone: `+91 9${Math.floor(Math.random() * 1e9).toString().padStart(9, '0')}`,
      email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
      inDay: 1 + Math.floor(Math.random() * 14),
      nights,
      adults: family ? 3 : 2,
      children: family ? 1 : 0,
      total: (family ? 3100 : 2240) * nights,
      family
    })
  };
  generated.push(msg);
  return msg;
}

export class DummyInboxProvider implements InboxProvider {
  readonly id = 'dummy';
  readonly label = 'Dummy inbox (sample OTA emails)';

  async fetchMessages(): Promise<InboxMessage[]> {
    return [...BASE, ...generated];
  }
}
