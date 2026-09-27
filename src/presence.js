const WebSocket = require('ws');

const GATEWAY_URL = 'wss://gateway.discord.gg/?v=10&encoding=json';

function startPresence(token) {
  let ws;
  let heartbeatTimer;
  let lastSeq = null;

  function beat() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ op: 1, d: lastSeq }));
    }
  }

  function connect() {
    ws = new WebSocket(GATEWAY_URL);

    ws.on('open', () => console.log('[gateway] socket open'));

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      if (msg.s != null) lastSeq = msg.s;

      if (msg.op === 10) {
        const interval = msg.d.heartbeat_interval;
        setTimeout(beat, interval * Math.random());
        heartbeatTimer = setInterval(beat, interval);
        ws.send(
          JSON.stringify({
            op: 2,
            d: {
              token,
              intents: 0,
              properties: {
                os: 'linux',
                browser: 'github-discord-bot',
                device: 'github-discord-bot',
              },
              presence: { status: 'online', activities: [], afk: false },
            },
          })
        );
      } else if (msg.op === 0 && msg.t === 'READY') {
        console.log('[gateway] ready, presence online');
      } else if (msg.op === 7 || msg.op === 9) {
        try { ws.close(); } catch {}
      }
    });

    ws.on('close', (code) => {
      console.log(`[gateway] closed code=${code}, reconnecting in 5s`);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      setTimeout(connect, 5000);
    });

    ws.on('error', (err) => console.error('[gateway] error:', err.message));
  }

  connect();
}

module.exports = { startPresence };
