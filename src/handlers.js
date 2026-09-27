const { postMessage } = require('./discord');

const LOG_CHANNEL = process.env.DISCORD_LOG_CHANNEL_ID;
const RELEASE_CHANNEL = process.env.DISCORD_RELEASE_CHANNEL_ID;

const COLOR = {
  push: 0x4c8eda,
  issueOpen: 0x2cbe4e,
  issueClose: 0xcb2431,
  prOpen: 0x2cbe4e,
  prMerge: 0x6f42c1,
  prClose: 0xcb2431,
  release: 0xf5a623,
  prerelease: 0x9e9e9e,
};

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function repoAuthor(p) {
  return {
    name: p.repository.full_name,
    url: p.repository.html_url,
    icon_url: p.sender?.avatar_url,
  };
}

async function handlePush(p) {
  if (!p.commits?.length) return;
  if (p.deleted) return;
  const branch = p.ref.replace('refs/heads/', '');
  const shown = p.commits.slice(0, 10);
  const lines = shown.map((c) => {
    const msg = c.message.split('\n')[0];
    const sha = c.id.slice(0, 7);
    return `[\`${sha}\`](${c.url}) ${truncate(msg, 70)} — ${c.author.name}`;
  });
  if (p.commits.length > shown.length) {
    lines.push(`…and ${p.commits.length - shown.length} more`);
  }
  const embed = {
    color: COLOR.push,
    author: repoAuthor(p),
    title: `${p.commits.length} commit${p.commits.length === 1 ? '' : 's'} to \`${branch}\``,
    url: p.compare,
    description: lines.join('\n'),
    timestamp: new Date().toISOString(),
  };
  await postMessage(LOG_CHANNEL, { embeds: [embed] });
}

async function handleIssues(p) {
  if (!['opened', 'closed', 'reopened'].includes(p.action)) return;
  const isClose = p.action === 'closed';
  const embed = {
    color: isClose ? COLOR.issueClose : COLOR.issueOpen,
    author: {
      name: `${p.repository.full_name} · ${p.sender.login} ${p.action} issue`,
      url: p.sender.html_url,
      icon_url: p.sender.avatar_url,
    },
    title: `#${p.issue.number} ${truncate(p.issue.title, 200)}`,
    url: p.issue.html_url,
    description: p.action === 'opened' ? truncate(p.issue.body || '', 500) : undefined,
    timestamp: new Date().toISOString(),
  };
  await postMessage(LOG_CHANNEL, { embeds: [embed] });
}

async function handlePullRequest(p) {
  let kind, color;
  if (p.action === 'opened' || p.action === 'reopened') {
    kind = p.action;
    color = COLOR.prOpen;
  } else if (p.action === 'closed') {
    if (p.pull_request.merged) {
      kind = 'merged';
      color = COLOR.prMerge;
    } else {
      kind = 'closed';
      color = COLOR.prClose;
    }
  } else {
    return;
  }
  const embed = {
    color,
    author: {
      name: `${p.repository.full_name} · ${p.sender.login} ${kind} PR`,
      url: p.sender.html_url,
      icon_url: p.sender.avatar_url,
    },
    title: `#${p.pull_request.number} ${truncate(p.pull_request.title, 200)}`,
    url: p.pull_request.html_url,
    description: p.action === 'opened' ? truncate(p.pull_request.body || '', 500) : undefined,
    timestamp: new Date().toISOString(),
  };
  await postMessage(LOG_CHANNEL, { embeds: [embed] });
}

// 'published' fires for stable and pre-releases alike; GitHub additionally
// sends 'prereleased' (or 'released') for the same release, so listening to
// both would post a pre-release twice.
const RELEASE_ACTIONS = new Set(['published']);

async function handleRelease(p) {
  if (!RELEASE_ACTIONS.has(p.action)) {
    console.log(`[release] skip action=${p.action}`);
    return;
  }
  const r = p.release;
  const embed = {
    color: r.prerelease ? COLOR.prerelease : COLOR.release,
    author: repoAuthor(p),
    title: `🎉 ${r.name || r.tag_name}${r.prerelease ? ' (pre-release)' : ''}`,
    url: r.html_url,
    description: truncate(r.body || '_No changelog provided._', 4000),
    timestamp: r.published_at || new Date().toISOString(),
    footer: { text: `tag ${r.tag_name}` },
  };
  await postMessage(RELEASE_CHANNEL, {
    content: '@everyone',
    embeds: [embed],
    allowed_mentions: { parse: ['everyone'] },
  });
}

async function handleEvent(event, payload) {
  const action = payload?.action;
  const repo = payload?.repository?.full_name || '?';
  console.log(`[event] ${event}${action ? ` action=${action}` : ''} repo=${repo}`);
  switch (event) {
    case 'push':
      return handlePush(payload);
    case 'issues':
      return handleIssues(payload);
    case 'pull_request':
      return handlePullRequest(payload);
    case 'release':
      return handleRelease(payload);
    case 'ping':
      return;
    default:
      return;
  }
}

module.exports = { handleEvent };
