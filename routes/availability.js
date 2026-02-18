const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');

// Path to the blocked-dates config file (lives at project root)
const BLOCKED_FILE = path.join(__dirname, '../data/blocked.json');

// Business hours per day-of-week (0=Sun … 6=Sat)
// null = closed
const BUSINESS_HOURS = {
  0: null,               // Sunday  – closed
  1: { open: 7, close: 19 },  // Monday
  2: { open: 7, close: 19 },  // Tuesday
  3: { open: 7, close: 19 },  // Wednesday
  4: { open: 7, close: 19 },  // Thursday
  5: { open: 7, close: 19 },  // Friday
  6: { open: 8, close: 17 },  // Saturday
};

// ---- helpers ----

function loadBlocked() {
  try {
    return JSON.parse(fs.readFileSync(BLOCKED_FILE, 'utf8'));
  } catch (e) {
    return { dates: [], slots: {} };
  }
}

function saveBlocked(data) {
  const dir = path.dirname(BLOCKED_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(BLOCKED_FILE, JSON.stringify(data, null, 2));
}

// ---- GET /api/availability?date=YYYY-MM-DD ----
router.get('/', (req, res) => {
  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, message: 'date param required (YYYY-MM-DD)' });
  }

  // Parse as local midnight (avoid UTC-shift issues)
  const [y, m, d] = date.split('-').map(Number);
  const day = new Date(y, m - 1, d);
  const dow = day.getDay();

  const blocked = loadBlocked();

  // Whole day blocked?
  if (blocked.dates && blocked.dates.includes(date)) {
    return res.json({ success: true, slots: [] });
  }

  const hours = BUSINESS_HOURS[dow];
  if (!hours) {
    return res.json({ success: true, slots: [] });  // closed day
  }

  // Build slot list
  const blockedHours = (blocked.slots && blocked.slots[date]) || [];
  const slots = [];

  for (let h = hours.open; h < hours.close; h++) {
    slots.push({
      hour:      h,
      available: !blockedHours.includes(h),
    });
  }

  res.json({ success: true, date, slots });
});

// ---- GET /api/availability/blocked ----
// Returns the full blocked config (for admin UI)
router.get('/blocked', (req, res) => {
  res.json({ success: true, ...loadBlocked() });
});

// ---- POST /api/availability/block-date ----
// Body: { date: "YYYY-MM-DD" }
router.post('/block-date', (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ success: false, message: 'date required' });

  const data = loadBlocked();
  if (!data.dates) data.dates = [];
  if (!data.dates.includes(date)) data.dates.push(date);
  saveBlocked(data);

  res.json({ success: true, message: `${date} blocked`, dates: data.dates });
});

// ---- POST /api/availability/unblock-date ----
// Body: { date: "YYYY-MM-DD" }
router.post('/unblock-date', (req, res) => {
  const { date } = req.body;
  const data = loadBlocked();
  data.dates = (data.dates || []).filter(d => d !== date);
  // Also remove any slot-level blocks for that date
  if (data.slots) delete data.slots[date];
  saveBlocked(data);

  res.json({ success: true, message: `${date} unblocked` });
});

// ---- POST /api/availability/block-slot ----
// Body: { date: "YYYY-MM-DD", hour: 14 }
router.post('/block-slot', (req, res) => {
  const { date, hour } = req.body;
  if (!date || hour === undefined) return res.status(400).json({ success: false, message: 'date and hour required' });

  const data = loadBlocked();
  if (!data.slots) data.slots = {};
  if (!data.slots[date]) data.slots[date] = [];
  if (!data.slots[date].includes(hour)) data.slots[date].push(hour);
  saveBlocked(data);

  res.json({ success: true, message: `${date} ${hour}:00 blocked` });
});

// ---- POST /api/availability/unblock-slot ----
// Body: { date: "YYYY-MM-DD", hour: 14 }
router.post('/unblock-slot', (req, res) => {
  const { date, hour } = req.body;
  const data = loadBlocked();
  if (data.slots && data.slots[date]) {
    data.slots[date] = data.slots[date].filter(h => h !== hour);
    if (data.slots[date].length === 0) delete data.slots[date];
  }
  saveBlocked(data);

  res.json({ success: true, message: `${date} ${hour}:00 unblocked` });
});

module.exports = router;
