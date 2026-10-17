import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

let transporter: nodemailer.Transporter | null = null;

// Initialize transporter
async function getTransporter() {
  if (transporter) return transporter;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
    return transporter;
  }

  // If no SMTP configured, use ethereal for testing or mock transporter
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    console.log('[EmailService] Using Ethereal test account for booking emails:', testAccount.user);
    return transporter;
  } catch (err) {
    console.warn('[EmailService] Failed to create test email account, using mock transporter:', err);
    // Fallback stub
    return null;
  }
}

export interface BookingConfirmationDetails {
  bookingId: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  roomNumber: string;
  roomCategory: string;
  checkIn: string; // ISO or date string
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  specialRequests?: string;
}

export function generateBookingConfirmationHtml(details: BookingConfirmationDetails): string {
  const checkInFormatted = new Date(details.checkIn).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const checkOutFormatted = new Date(details.checkOut).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation - Hotel Sharda Palace</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d0f12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e4e4e7;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0d0f12; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #14171d; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1f242d 0%, #14171d 100%); padding: 32px 30px; border-bottom: 2px solid #a87444; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 2px; color: #f5f2eb; text-transform: uppercase;">HOTEL SHARDA PALACE</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #a87444; letter-spacing: 1px;">DEOGHAR, JHARKHAND · OFFICIAL RESERVATION DESK</p>
            </td>
          </tr>

          <!-- Confirmation Badge -->
          <tr>
            <td style="padding: 28px 30px 10px 30px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.4); color: #4ade80; padding: 6px 16px; border-radius: 9999px; font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">
                ✓ BOOKING CONFIRMED
              </div>
              <h2 style="margin: 16px 0 4px 0; font-size: 20px; color: #ffffff;">Namaste, ${details.guestName}!</h2>
              <p style="margin: 0; font-size: 14px; color: #a1a1aa; line-height: 1.5;">
                We are delighted to confirm your upcoming reservation at Hotel Sharda Palace. Your booking details and hotel voucher are summarized below.
              </p>
            </td>
          </tr>

          <!-- Booking Reference Card -->
          <tr>
            <td style="padding: 20px 30px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1a1e26; border: 1px solid #2e3542; border-radius: 8px; padding: 18px 20px;">
                <tr>
                  <td width="50%" style="padding: 6px 0;">
                    <span style="font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 1px;">Booking ID</span><br>
                    <strong style="font-size: 15px; color: #f5f2eb; font-family: monospace;">${details.bookingId}</strong>
                  </td>
                  <td width="50%" style="padding: 6px 0; text-align: right;">
                    <span style="font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 1px;">Room Allocated</span><br>
                    <strong style="font-size: 15px; color: #a87444;">Room ${details.roomNumber} (${details.roomCategory})</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Stay Schedule -->
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1a1e26; border: 1px solid #2e3542; border-radius: 8px; padding: 18px 20px;">
                <tr>
                  <td width="48%" style="vertical-align: top;">
                    <span style="font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 1px;">CHECK-IN</span><br>
                    <strong style="font-size: 15px; color: #ffffff;">${checkInFormatted}</strong><br>
                    <span style="font-size: 12px; color: #22c55e; font-weight: 600;">From 12:00 PM</span>
                  </td>
                  <td width="4%" style="text-align: center; color: #71717a; font-size: 16px;">→</td>
                  <td width="48%" style="vertical-align: top; text-align: right;">
                    <span style="font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 1px;">CHECK-OUT</span><br>
                    <strong style="font-size: 15px; color: #ffffff;">${checkOutFormatted}</strong><br>
                    <span style="font-size: 12px; color: #eab308; font-weight: 600;">Until 11:00 AM</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="3" style="border-top: 1px solid #27272a; margin-top: 12px; padding-top: 12px; font-size: 13px; color: #a1a1aa;">
                    <strong>Duration:</strong> ${details.nights} Night${details.nights > 1 ? 's' : ''} &nbsp;·&nbsp; 
                    <strong>Guests:</strong> ${details.adults} Adult${details.adults > 1 ? 's' : ''}${details.children > 0 ? `, ${details.children} Child${details.children > 1 ? 'ren' : ''}` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Financial Breakdown -->
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1a1e26; border: 1px solid #2e3542; border-radius: 8px; padding: 16px 20px;">
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #a1a1aa;">Total Room Tariff:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #ffffff; text-align: right; font-weight: 600;">₹${details.totalAmount.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #22c55e;">Amount Paid:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #22c55e; text-align: right; font-weight: 600;">₹${details.paidAmount.toLocaleString('en-IN')}</td>
                </tr>
                <tr style="border-top: 1px solid #2e3542;">
                  <td style="padding: 10px 0 4px 0; font-size: 14px; color: #ffffff; font-weight: 700;">Balance Due at Reception:</td>
                  <td style="padding: 10px 0 4px 0; font-size: 15px; color: #a87444; text-align: right; font-weight: 700;">₹${details.balanceAmount.toLocaleString('en-IN')}</td>
                </tr>
              </table>
            </td>
          </tr>

          ${details.specialRequests ? `
          <!-- Special Requests -->
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <div style="background-color: rgba(168, 116, 68, 0.08); border-left: 3px solid #a87444; padding: 12px 16px; border-radius: 4px; font-size: 12px; color: #d4d4d8;">
                <strong style="color: #a87444;">Guest Note / Special Requests:</strong><br>
                ${details.specialRequests}
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Hotel Amenities & Policies -->
          <tr>
            <td style="padding: 0 30px 25px 30px;">
              <h3 style="margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #a87444;">Stay Information & Policies</h3>
              <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #a1a1aa; line-height: 1.8;">
                <li><strong>Check-in:</strong> 12:00 PM onwards | <strong>Check-out:</strong> Strictly 11:00 AM.</li>
                <li><strong>Government ID:</strong> A valid original photo ID (Aadhaar / Voter ID / Passport) is mandatory for all adult guests at check-in.</li>
                <li><strong>Complimentary:</strong> High-speed Wi-Fi throughout property, 24/7 hot water, pure RO drinking water.</li>
                <li><strong>Temple Proximity:</strong> Located minutes from the sacred Baba Baidyanath Jyotirlinga Temple.</li>
              </ul>
            </td>
          </tr>

          <!-- Contact & Directions Footer -->
          <tr>
            <td style="background-color: #0e1014; padding: 24px 30px; border-top: 1px solid #27272a; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #f5f2eb;">Hotel Sharda Palace</p>
              <p style="margin: 0 0 12px 0; font-size: 12px; color: #71717a; line-height: 1.5;">
                Opposite Circuit House Road, Near Baidyanath Dham, Deoghar, Jharkhand 814112<br>
                Phone / WhatsApp: <a href="tel:+917970735251" style="color: #a87444; text-decoration: none;">+91 79707 35251</a> &nbsp;|&nbsp; 
                Reception: <a href="tel:+919110137334" style="color: #a87444; text-decoration: none;">+91 91101 37334</a>
              </p>
              <div style="margin-top: 14px;">
                <a href="https://maps.google.com/?q=Hotel+Sharda+Palace+Deoghar" style="display: inline-block; background-color: #27272a; color: #ffffff; text-decoration: none; font-size: 11px; padding: 8px 16px; border-radius: 6px; font-weight: 600;">
                  📍 Open in Google Maps
                </a>
              </div>
              <p style="margin: 20px 0 0 0; font-size: 10px; color: #52525b;">
                This is an automated reservation confirmation generated by Sharda Palace Hotel Booking CRM.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export async function sendBookingConfirmationEmail(details: BookingConfirmationDetails): Promise<{
  success: boolean;
  messageId?: string;
  previewUrl?: string | false;
  message: string;
}> {
  try {
    const activeTransporter = await getTransporter();
    const html = generateBookingConfirmationHtml(details);

    if (!activeTransporter) {
      console.log(`[EmailService] Mock confirmation email generated for ${details.guestEmail} (Booking ${details.bookingId})`);
      return {
        success: true,
        message: `Confirmation email prepared for ${details.guestEmail} (Mock service active)`
      };
    }

    const info = await activeTransporter.sendMail({
      from: process.env.SMTP_FROM || '"Hotel Sharda Palace Reservations" <reservations@shardapalace.com>',
      to: details.guestEmail,
      subject: `Booking Confirmed: Room ${details.roomNumber} at Hotel Sharda Palace (Ref: ${details.bookingId})`,
      html
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[EmailService] Test confirmation email sent! Preview URL: ${previewUrl}`);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl,
      message: `Confirmation email sent to ${details.guestEmail}`
    };
  } catch (error: any) {
    console.error('[EmailService] Error sending booking confirmation email:', error);
    return {
      success: false,
      message: error.message || 'Failed to send confirmation email'
    };
  }
}
