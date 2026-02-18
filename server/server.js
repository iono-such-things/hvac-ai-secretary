require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
const bookingRoutes      = require('../routes/bookings');
const availabilityRoutes = require('../routes/availability');
app.use('/api/bookings',     bookingRoutes);
app.use('/api/availability', availabilityRoutes);

// ---- Google Calendar OAuth ----
const { getAuthUrl, handleCallback, getAuthedClient } = require('../utils/calendar');

// Step 1: redirect browser to Google's consent screen
app.get('/auth/google', (req, res) => {
  res.redirect(getAuthUrl());
});

// Step 2: Google redirects back here with ?code=...
app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code');
  try {
    await handleCallback(code);
    res.send(`
      <html><body style="font-family:sans-serif;padding:2rem;background:#0a0a0f;color:#f5f5f7">
        <h2 style="color:#10b981">✅ Google Calendar Connected!</h2>
        <p>Bookings will now automatically create calendar events.</p>
        <p><a href="/" style="color:#3b82f6">← Back to site</a></p>
      </body></html>
    `);
  } catch (e) {
    res.status(500).send('Auth failed: ' + e.message);
  }
});

// Status endpoint — lets you check if calendar is connected
app.get('/api/calendar/status', (req, res) => {
  const auth = getAuthedClient();
  res.json({ connected: !!auth });
});

// Dispatch and tech routes (require DB)
try {
  const dispatchRoutes = require('./routes/dispatch');
  const techRoutes = require('./routes/tech');
  app.use('/api/dispatch', dispatchRoutes);
  app.use('/api/tech', techRoutes);
} catch (e) {
  console.warn('Dispatch/tech routes not loaded (DB may not be configured)');
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve HTML pages
app.get('/dispatch', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dispatch.html'));
});

app.get('/tech', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/tech.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 HVAC CRM Server running on port ${PORT}`);
  console.log(`🌐 Website: http://localhost:${PORT}`);
  console.log(`📊 Dispatch dashboard: http://localhost:${PORT}/dispatch`);
  console.log(`🔧 Tech portal: http://localhost:${PORT}/tech`);
});
