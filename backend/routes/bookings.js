const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Google Calendar client
function getCalendarClient() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.calendar({ version: 'v3', auth });
}

// Map window string to start hour (24h)
const WINDOW_START = {
  '8:00-10:00':  8,
  '10:00-12:00': 10,
  '12:00-14:00': 12,
  '13:00-15:00': 13,
};

// Validate M-F
function isWeekday(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return day !== 0 && day !== 6;
}

// POST /api/bookings
router.post('/', async (req, res) => {
  const { name, phone, email, topic, date, window: callWindow, notes } = req.body;

  // Required fields
  if (!name || !phone || !email || !topic || !date || !callWindow) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  // M-F only
  if (!isWeekday(date)) {
    return res.status(400).json({ success: false, message: 'Bookings are Monday–Friday only.' });
  }

  const startHour = WINDOW_START[callWindow];
  if (startHour === undefined) {
    return res.status(400).json({ success: false, message: 'Invalid call window.' });
  }

  // Build ISO datetime strings (ET — backend server should be in ET or adjust offset)
  const startISO = `${date}T${String(startHour).padStart(2,'0')}:00:00`;
  const endISO   = `${date}T${String(startHour + 1).padStart(2,'0')}:00:00`; // block 1 hour

  try {
    const calendar = getCalendarClient();

    // --- Check for conflicts on this day/window ---
    const existing = await calendar.events.list({
      calendarId: 'primary',
      timeMin: `${date}T08:00:00-05:00`,
      timeMax: `${date}T15:00:00-05:00`,
      singleEvents: true,
    });

    const bookedStarts = (existing.data.items || [])
      .filter(e => e.summary && e.summary.startsWith('[MJC Call]'))
      .map(e => new Date(e.start.dateTime).getHours());

    if (bookedStarts.includes(startHour)) {
      return res.status(409).json({
        success: false,
        conflict: true,
        message: 'That time window is already booked. Please choose another.'
      });
    }

    // --- Create calendar event (blocks 1 hour) ---
    const windowLabel = {
      '8:00-10:00':  '8–10 AM',
      '10:00-12:00': '10 AM–12 PM',
      '12:00-14:00': '12–2 PM',
      '13:00-15:00': '1–3 PM',
    }[callWindow];

    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `[MJC Call] ${name}`,
        description:
          `Phone: ${phone}\nEmail: ${email}\nTopic: ${topic}\nWindow: ${windowLabel}\nNotes: ${notes || 'None'}`,
        start: { dateTime: `${startISO}-05:00`, timeZone: 'America/New_York' },
        end:   { dateTime: `${endISO}-05:00`,   timeZone: 'America/New_York' },
        reminders: {
          useDefault: false,
          overrides: [{ method: 'popup', minutes: 15 }]
        }
      }
    });

    // --- Email to Mike ---
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.NOTIFICATION_EMAIL || process.env.GMAIL_USER,
      subject: `[MJC] New Call Scheduled — ${name} on ${date}`,
      html: `
        <h2>New Call Scheduled</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Topic:</strong> ${topic}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Call Window:</strong> ${windowLabel}</p>
        <p><strong>Notes:</strong> ${notes || 'None'}</p>
        <hr>
        <p><em>Blocked 1 hour on your Google Calendar starting at ${startHour}:00 AM.</em></p>
      `
    });

    // --- Confirmation email to customer ---
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: `Your call with M. Jacob Company is confirmed — ${date}`,
      html: `
        <h2>You're booked!</h2>
        <p>Hi ${name},</p>
        <p>Thanks for reaching out to <strong>M. Jacob Company</strong>. Here are your details:</p>
        <ul>
          <li><strong>Date:</strong> ${date}</li>
          <li><strong>Call window:</strong> ${windowLabel}</li>
          <li><strong>Topic:</strong> ${topic}</li>
        </ul>
        <p>We'll call you at <strong>${phone}</strong> during that window. Make sure your phone is on!</p>
        <p>Questions? Reply to this email or call us at <strong>(412) 512-0425</strong>.</p>
        <br>
        <p>— M. Jacob Company</p>
      `
    });

    // --- Save to DB (optional, non-blocking) ---
    if (pool) {
      pool.query(
        `INSERT INTO bookings (customer_name, phone, email, topic, call_date, call_window, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [name, phone, email, topic, date, callWindow, notes || null]
      ).catch(e => console.error('DB insert failed (non-fatal):', e.message));
    }

    res.status(201).json({ success: true, message: 'Call scheduled successfully.' });

  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to schedule call.', error: error.message });
  }
});

module.exports = router;