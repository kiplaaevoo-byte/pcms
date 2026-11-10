const express = require('express');
const router = express.Router();

// These 3 files MUST exist, else this router crashes on require:
// server/lib/mentions/normalizer.js
// server/lib/mentions/sentiment.js
// server/lib/mentions/store.js
// If any is missing, tell me - I will give you the full file.
const { normalize } = require('../lib/mentions/normalizer');
const { analyze } = require('../lib/mentions/sentiment');
const { saveMention } = require('../lib/mentions/store');

// GET /api/webhook/:platform - Meta + YouTube verification
// NOTE: This router must be mounted as app.use('/api', webhooksRouter)
// If you mount as app.use('/api/webhooks', ...) this becomes /api/webhooks/webhook/:platform - WRONG
router.get('/webhook/:platform', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe') {
    if (req.query['hub.verify_token'] === process.env.META_VERIFY_TOKEN) return res.send(req.query['hub.challenge']);
    return res.status(403).send('Forbidden');
  }
  if (req.query['hub.challenge']) return res.send(req.query['hub.challenge']);
  res.send('OK');
});

// POST /api/webhook/:platform - Telegram / Instagram / X / YouTube / TikTok
router.post('/webhook/:platform', async (req, res) => {
  const { platform } = req.params;
  // FIXED: Only check secret IF env is set. Old code failed when env was empty / when testing with curl.
  if (String(platform).toLowerCase() === 'telegram' && process.env.TELEGRAM_WEBHOOK_SECRET) {
    const secret = req.headers['x-telegram-bot-api-secret-token'];
    if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    const normalized = normalize(platform, req.body);
    if (!normalized) return res.json({ ok: true, skipped: true });
    await saveMention(normalized, analyze(normalized.text || ''));
    res.json({ ok: true });
  } catch (e) {
    console.error('Webhook error', platform, e);
    // Always 200 so Telegram / Meta don't spam retries
    res.json({ ok: true });
  }
});

module.exports = router;