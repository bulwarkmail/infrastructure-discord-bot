# infrastructure-discord-bot

Relays GitHub webhook events from the Bulwark repositories to the Bulwark Discord server.

- Pushes, issues and pull requests (opened, closed, reopened, merged) go to the log channel.
- Published releases, including pre-releases, go to the release channel with their full changelog and an `@everyone` ping.

The bot also holds a Discord gateway connection so it shows as online.

## Setup

Requires Node.js 18 or newer.

```sh
npm ci
cp .env.example .env
```

Fill in `.env`:

| Variable | Meaning |
| --- | --- |
| `DISCORD_BOT_TOKEN` | Token of the Discord bot user |
| `DISCORD_LOG_CHANNEL_ID` | Channel for pushes, issues and pull requests |
| `DISCORD_RELEASE_CHANNEL_ID` | Channel for releases |
| `GITHUB_WEBHOOK_SECRET` | Secret of the GitHub webhook |
| `PORT` | Port to listen on (default `3005`) |

Single-quote the webhook secret if it contains `#`. Otherwise dotenv treats everything after the `#` as a comment and cuts the secret short, and every delivery fails with `401 invalid signature`.

Start it with pm2:

```sh
pm2 start ecosystem.config.js
```

## GitHub webhook

Add an organization or repository webhook with:

- Payload URL: `https://<your host>/webhook`
- Content type: `application/json`
- Secret: the value of `GITHUB_WEBHOOK_SECRET`
- Events: Pushes, Issues, Pull requests, Releases

Every delivery is checked against `X-Hub-Signature-256`. `GET /health` answers `ok`.

## License

[AGPL-3.0-only](LICENSE)
