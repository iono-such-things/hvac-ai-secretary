const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { createBookingEvent } = require('../utils/calendar');

// DB is optional — works email-only without it
let pool = null;
try { pool = require('../db').pool; } catch (e) { }

// ---- email transporter ----
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function fmt12(hour) {
  const ampm = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 || 12;
  return `${h}:00 ${ampm}`;
}

function fmtDateStr(isoDate) {
  if (!isoDate) return 'Not specified';
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

// ---- POST /api/bookings ----
router.post('/', async (req, res) => {
  const {
    type,        // 'booking' | 'callback'
    name, phone, email, service, address,
    date, slot,  // booking fields
    best_time,   // callback field
    notes,
  } = req.body;

  if (!name || !phone || !service) {
    return res.status(400).json({ success: false, message: 'Name, phone, and service are required' });
  }

  const now = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });

  let subject, html;

  if (type === 'callback') {
    subject = `📞 Call-Back Request — ${name} — ${service}`;
    html = `
      <div style="font-family:sans-serif;max-width:600px">
        <h2 style="color:#2563eb">📞 Call-Back Request</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#666;width:140px"><strong>Name</strong></td><td>${name}</td></tr>
          <tr><td style="padding:6px 0;color:#666"><strong>Phone</strong></td><td>${phone}</td></tr>
          <tr><td style="padding:6px 0;color:#666"><strong>Email</strong></td><td>${email || '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#666"><strong>Service</strong></td><td>${service}</td></tr>
          <tr><td style="padding:6px 0;color:#666"><strong>Best Time</strong></td><td>${best_time || 'Anytime'}</td></tr>
          <tr><td style="padding:6px 0;color:#666"><strong>Notes</strong></td><td>${notes || '—'}</td></tr>
        </table>
        <hr style="margin:16px 0;border:none;border-top:1px solid #eee">
        <p style="color:#999;font-size:12px">Received: ${now} ET</p>
      </div>
    `;
  } else {
    // Regular time-slot booking
    const dateLabel = fmtDateStr(date);
    const timeLabel = slot !== undefined ? fmt12(Number(slot)) : 'Not specified';

    subject = `📅 New Booking — ${name} — ${service} — ${dateLabel}`;
    html = `
      <div style="font-family:sans-serif;max-width:600px">
        <h2 style="color:#2563eb">📅 New Appointment Request</h2>
        <div style="background:#f0f7ff;border-left:4px solid #2563eb;padding:12px 16px;border-radius:4px;margin-bottom:16px">
          <strong>${dateLabel} at ${timeLabel}</strong>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#666;width:140px"><strong>Name</strong></td><td>${name}</td></tr>
          <tr><td style="padding:6px 0;color:#666"><strong>Phone</strong></td><td>${phone}</td></tr>
          <tr><td style="padding:6px 0;color:#666"><strong>Email</strong></td><td>${email || '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#666"><strong>Service</strong></td><td>${service}</td></tr>
          <tr><td style="padding:6px 0;color:#666"><strong>Address</strong></td><td>${address || '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#666"><strong>Notes</strong></td><td>${notes || '—'}</td></tr>
        </table>
        <hr style="margin:16px 0;border:none;border-top:1px solid #eee">
        <p style="color:#999;font-size:12px">Received: ${now} ET</p>
      </div>
    `;
  }

  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.NOTIFICATION_EMAIL || process.env.GMAIL_USER,
      subject,
      html,
    });

    // For time-slot bookings, also create a Google Calendar event (non-fatal if it fails)
    let calendarEvent = null;
    if (type !== 'callback' && date && slot !== undefined) {
      try {
        calendarEvent = await createBookingEvent({ name, email, phone, service, address, date, slot: Number(slot), notes });
        console.log('📅 Calendar event created:', calendarEvent.htmlLink);
      } catch (calErr) {
        // Calendar not yet connected or other error — email already sent, don't fail the booking
        console.warn('Calendar event skipped:', calErr.message);
      }
    }

    // ---- Partner webhook (Make.com) ----
    if (process.env.PARTNER_WEBHOOK_URL) {
      const payload = {
        type: type || 'booking',
        name,
        phone,
        email: email || null,
        service,
        address: address || null,
        date: date || null,
        slot: slot !== undefined ? Number(slot) : null,
        best_time: best_time || null,
        notes: notes || null,
        calendarLink: calendarEvent ? calendarEvent.htmlLink : null,
        submittedAt: new Date().toISOString(),
      };
      fetch(process.env.PARTNER_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(() => {
        console.log('🔗 Partner webhook delivered');
      }).catch((whErr) => {
        console.warn('Partner webhook failed (non-fatal):', whErr.message);
      });
    }

    res.status(201).json({
      success: true,
      message: 'Request received! We will be in touch shortly.',
      calendarLink: calendarEvent ? calendarEvent.htmlLink : null,
    });

  } catch (error) {
    console.error('Booking email error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send request. Please call (412) 512-0425.' });
  }
});

module.exports = router;
