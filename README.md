# Discord Pterodactyl Bot

A Discord bot that controls and monitors Pterodactyl Minecraft servers. Features include:

- Ephemeral (default) or public control embeds with start/stop/restart buttons and a command modal.
- Live CPU/RAM sparklines plus disk usage, player count, and server address.
- Console streaming via Pterodactyl websockets that auto-refreshes tokens.
- `/network` summary for all configured public servers.
- `/admin` tools to list or inspect any panel server.
- Offline pings to an admin channel.

## Configuration

1. Copy `.env.example` to `.env` and set your secrets:
   - `DISCORD_TOKEN` – Discord bot token.
   - `PORT` – optional port for the lightweight HTTP health listener (defaults to `3000`).
   - `PTERO_PANEL_URL` – base URL of your Pterodactyl panel (no trailing slash).
   - `PTERO_CLIENT_KEY` – client API key for user-level actions.
   - `PTERO_APPLICATION_KEY` – application API key for admin listing.
   - `ADMIN_ROLES` / `ADMIN_USERS` – comma-separated IDs that can use admin buttons and commands.
   - `ADMIN_CHANNEL_ID` – channel ID for offline alerts.

2. Copy `config/pterodactyl.example.json` to `config/pterodactyl.json` for network/server defaults. You can override any of these values via environment variables. `PTERO_NETWORK_SERVERS` accepts a JSON array matching the `networkServers` entries if you prefer configuring entirely through `.env`.

Each `networkServers` entry can override the display host/domain and custom command labels.

## Commands

- `/server name:<server>` – create a control embed (ephemeral by default, `public:true` to share). Only the requester or admins can press buttons.
- `/network` – list CPU/RAM/player counts and IP/domain for configured servers.
- `/admin list` – list every server on the panel (application API key required).
- `/admin show id:<identifier|uuid>` – inspect a specific server’s limits and identifiers.

## Running

```
npm install
npm start            # plain Node.js (Node 22 ready)
npm run dev          # optional nodemon reloads for Pterodactyl nodemon eggs
```

Use Discord’s slash command registration flow (or your preferred deployment script) to register the commands before testing. Th
e included dependencies are compatible with Node 22; if you deploy on a Pterodactyl egg that expects nodemon, use `npm run dev`
 so the nodemon binary installed with the app is picked up.

## Resolving GitHub merge conflicts

If a pull request shows a banner like “This branch has conflicts that must be resolved,” use one of the options GitHub provides above the file list:

- Click **Resolve conflicts** then **Open in web editor** to edit the conflicted files in the browser and commit the fixes directly.
- If you prefer the terminal, click **View command line instructions** to follow GitHub’s step-by-step git commands for pulling the base branch, resolving the conflicts locally, and pushing the updated branch.

Either option will let you clean up the conflicts in files like `README.md`, `package.json`, or `src/services/pterodactyl.js` before merging the PR.
