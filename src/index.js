require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { handleEvent } = require('./handlers');
const { startPresence } = require('./presence');

const PORT = parseInt(process.env.PORT || '3005', 10);
const SECRET = process.env.GITHUB_WEBHOOK_SECRET;

for (const k of ['DISCORD_BOT_TOKEN', 'DISCORD_LOG_CHANNEL_ID', 'DISCORD_RELEASE_CHANNEL_ID', 'GITHUB_WEBHOOK_SECRET']) {
  if (!process.env[k]) {
    console.error(`missing env var: ${k}`);
    process.exit(1);
  }
}

const app = express();

app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

function verifySignature(req) {
  const sig = req.get('X-Hub-Signature-256');
  if (!sig || !req.rawBody) return false;
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(req.rawBody);
  const expected = `sha256=${hmac.digest('hex')}`;
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

app.get('/health', (_req, res) => res.send('ok'));

app.post('/webhook', async (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).send('invalid signature');
  }
  const event = req.get('X-GitHub-Event');
  const delivery = req.get('X-GitHub-Delivery');
  res.status(202).send('accepted');
  try {
    await handleEvent(event, req.body);
  } catch (err) {
    console.error(`[${delivery}] handler error for ${event}:`, err);
  }
});

app.listen(PORT, () => {
  console.log(`github-discord-bot listening on :${PORT}`);
});

startPresence(process.env.DISCORD_BOT_TOKEN);
