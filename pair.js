const express = require('express');
const fs = require('fs');
const path = require('path');
const {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const router = express.Router();

router.post('/', async (req, res) => {
  const phone = req.body.phone;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });

  try {
    const sessionPath = path.join(__dirname, 'sessions', phone);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: false,
      browser: ['Nonchalant', 'Chrome', '1.0']
    });

    let sent = false;
    sock.ev.on('connection.update', async (update) => {
      const { connection, pairingCode } = update;
      if (pairingCode && !sent) {
        sent = true;
        return res.json({ pairingCode });
      }

      if (connection === 'open') {
        console.log('✅ Connected');
        await saveCreds();
      }

      if (connection === 'close') {
        console.log('❌ Connection closed');
      }
    });

    sock.ev.on('creds.update', saveCreds);
  } catch (err) {
    console.error('Error:', err.message);
    if (!res.headersSent) {
      return res.status(500).json({ error: '❗ Service Unavailable' });
    }
  }
});

module.exports = router;
