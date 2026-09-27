const TOKEN = process.env.DISCORD_BOT_TOKEN;

async function postMessage(channelId, payload) {
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'github-discord-bot (self-hosted, 1.0)',
    },
    body: JSON.stringify(payload),
  });
  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    const retryMs = Math.ceil((data.retry_after ?? 1) * 1000);
    await new Promise((r) => setTimeout(r, retryMs));
    return postMessage(channelId, payload);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`discord ${res.status}: ${text}`);
  }
  const json = await res.json();
  console.log(`[discord] posted to channel=${channelId} message_id=${json.id}`);
  return json;
}

module.exports = { postMessage };
