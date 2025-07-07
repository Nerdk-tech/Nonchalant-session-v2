const express = require('express');
const fs = require('fs');
const path = require('path');
const {
  default: makeWASocket,
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
      browser: ['NONCHALANT', 'Chrome', '10.0']
    });

    let sent = false;

    sock.ev.on('connection.update', async (update) => {
      const { pairingCode, connection } = update;

      if (pairingCode && !sent) {
        sent = true;
        console.log('Pairing Code:', pairingCode);
        return res.json({ pairingCode });
      }

      if (connection === 'open') {
        await saveCreds();
        console.log('✅ Paired successfully with', sock.user.id);
      }

      if (connection === 'close') {
        console.log('❌ Connection closed');
      }
    });

    sock.ev.on('creds.update', saveCreds);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: 'Service Unavailable' });
  }
});

module.exports = router;
