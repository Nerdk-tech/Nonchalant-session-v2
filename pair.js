const express = require('express');
const fs = require('fs');
const path = require('path');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, delay } = require('@whiskeysockets/baileys');
const pino = require("pino");

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
      logger: pino({ level: "silent" }),
      browser: ['Nonchalant', 'Chrome', '18.0']
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
        await delay(3000);
        await saveCreds();
        const sessionData = fs.readFileSync(path.join(sessionPath, 'creds.json'));
        const sessionId = 'nonchalant~' + Buffer.from(sessionData).toString('base64').slice(0, 32);

        const msg = `*🌟 THANK YOU FOR CHOOSING NONCHALANT-MD 🌟*

🔐 *YOUR SESSION ID:*
\`\`\`
${sessionId}
\`\`\`

✅ *DEPLOY YOUR BOT ON RENDER*  
📦 *Visit:* https://github.com/Nerdk-tech/NONCHALANT-MD

Stay safe, stay smart.  
_~ Powered by DAMI_
        `;
        await sock.sendMessage(sock.user.id, { text: msg });
        console.log('✅ Session ID sent to WhatsApp');
        await delay(5000);
        process.exit();
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
