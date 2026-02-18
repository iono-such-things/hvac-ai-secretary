const { google } = require('googleapis');
const fs         = require('fs');
const path       = require('path');

// Where we persist the refresh token so we only auth once
const TOKEN_FILE = path.join(__dirname, '../data/google-token.json');

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function loadToken() {
  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
  } catch (e) {
    return null;
  }
}

function saveToken(token) {
  const dir = path.dirname(TOKEN_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(token, null, 2));
}

// Returns an authenticated OAuth2 client, or null if not yet authorized
function getAuthedClient() {
  const token = loadToken();
  if (!token) return null;

  const auth = getOAuthClient();
  auth.setCredentials(token);

  // Auto-save refreshed tokens
  auth.on('tokens', (newTokens) => {
    const current = loadToken() || {};
    saveToken({ ...current, ...newTokens });
  });

  return auth;
}

// Generate the URL the user visits once to grant calendar access
function getAuthUrl() {
  const auth = getOAuthClient();
  return auth.generateAuthUrl({
    access_type: 'offline',
    prompt:      'consent',   // forces refresh_token to be returned
    scope:       ['https://www.googleapis.com/auth/calendar'],
  });
}

// Exchange the code from the callback for tokens, save them
async function handleCallback(code) {
  const auth   = getOAuthClient();
  const { tokens } = await auth.getToken(code);
  saveToken(tokens);
  auth.setCredentials(tokens);
  return auth;
}

// Create a calendar event for a confirmed booking
async function createBookingEvent({ name, email, phone, service, address, date, slot, notes }) {
  const auth = getAuthedClient();
  if (!auth) throw new Error('Google Calendar not authorized yet');

  const calendar = google.calendar({ version: 'v3', auth });

  // Build start/end datetimes from date (YYYY-MM-DD) and slot (hour integer)
  const [y, m, d] = date.split('-').map(Number);
  const start = new Date(y, m - 1, d, slot, 0, 0);
  const end   = new Date(y, m - 1, d, slot + 2, 0, 0); // 2-hour appointment

  const event = {
    summary:     `HVAC — ${service} — ${name}`,
    description: [
      `Customer: ${name}`,
      `Phone:    ${phone}`,
      `Email:    ${email || '—'}`,
      `Service:  ${service}`,
      `Address:  ${address || '—'}`,
      notes ? `Notes:    ${notes}` : null,
    ].filter(Boolean).join('\n'),
    location:    address || '',
    start: {
      dateTime: start.toISOString(),
      timeZone: 'America/New_York',
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: 'America/New_York',
    },
    attendees: email ? [{ email }] : [],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 24h before
        { method: 'popup', minutes: 60 },       // 1h before
      ],
    },
    colorId: '6', // tangerine — stands out on calendar
  };

  const result = await calendar.events.insert({
    calendarId:  'primary',
    resource:    event,
    sendUpdates: email ? 'all' : 'none', // sends Google invite to customer if they have email
  });

  return result.data;
}

module.exports = { getAuthUrl, handleCallback, getAuthedClient, createBookingEvent };
