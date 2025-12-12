# Discord Pterodactyl Bot

A Discord bot that controls and monitors Pterodactyl Minecraft servers. Features include:

- Ephemeral (default) or public control embeds with start/stop/restart buttons and a command modal.
- Live CPU/RAM sparklines plus disk usage, player count, and server address.
- Console streaming via Pterodactyl websockets that auto-refreshes tokens.
- `/network` summary for all configured public servers.
- `/admin` tools to list or inspect any panel server.
- Offline pings to an admin channel.

## Configuration

Copy `config/pterodactyl.example.json` to `config/pterodactyl.json` and fill in your panel details. You can also set environment variables:

- `PTERO_CLIENT_KEY` – client API key for user-level actions.
- `PTERO_APPLICATION_KEY` – application API key for admin listing.
- `PTERO_CONFIG` – custom path to the configuration file.
- `DISCORD_TOKEN` – Discord bot token.

Each `networkServers` entry can override the display host/domain and custom command labels.

## Commands

- `/server name:<server>` – create a control embed (ephemeral by default, `public:true` to share). Only the requester or admins can press buttons.
- `/network` – list CPU/RAM/player counts and IP/domain for configured servers.
- `/admin list` – list every server on the panel (application API key required).
- `/admin show id:<identifier|uuid>` – inspect a specific server’s limits and identifiers.

## Running

```
npm install
npm run dev
```

`nodemon` is bundled as a normal dependency so Pterodactyl "nodemon" eggs keep their startup command. For a production run without
autoreload, use `npm start`.

Use Discord’s slash command registration flow (or your preferred deployment script) to register the commands before testing.
