// SMS API Routes
const express = require('express');
const router = express.Router();
const { sendSMS, sendBatchSMS, templates } = require('../utils/sms');

// Send SMS
router.post('/send', async (req, res) => {
  try {
    const { to, template, data } = req.body;
    const result = await sendSMS(to, template, data);
    res.json(result);
  } catch (error) {
    console.error('SMS route error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send batch SMS
router.post('/batch', async (req, res) => {
  try {
    const { recipients, template, data } = req.body;
    const results = await sendBatchSMS(recipients, template, data);
    res.json({ success: true, results });
  } catch (error) {
    console.error('SMS batch route error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get available templates
router.get('/templates', (req, res) => {
  res.json({ success: true, templates: Object.keys(templates) });
});

module.exports = router;
