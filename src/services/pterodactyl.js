const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

function parseEnvList(value) {
    return value ? value.split(',').map(v => v.trim()).filter(Boolean) : undefined;
}

function loadConfig() {
    const targetPath = process.env.PTERO_CONFIG || path.join(process.cwd(), 'config', 'pterodactyl.json');
    let fileConfig;
    if (fs.existsSync(targetPath)) {
        fileConfig = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    } else {
        console.warn(`[pterodactyl] No config found at ${targetPath}, falling back to example config.`);
        fileConfig = require(path.join(process.cwd(), 'config', 'pterodactyl.example.json'));
    }

    const merged = {
        ...fileConfig,
        panelUrl: process.env.PTERO_PANEL_URL || fileConfig.panelUrl,
        clientApiKey: process.env.PTERO_CLIENT_KEY || fileConfig.clientApiKey,
        applicationApiKey: process.env.PTERO_APPLICATION_KEY || fileConfig.applicationApiKey,
        adminRoles: parseEnvList(process.env.ADMIN_ROLES) || fileConfig.adminRoles,
        adminUsers: parseEnvList(process.env.ADMIN_USERS) || fileConfig.adminUsers,
        adminChannelId: process.env.ADMIN_CHANNEL_ID || fileConfig.adminChannelId,
        networkServers: fileConfig.networkServers || [],
    };

    if (process.env.PTERO_NETWORK_SERVERS) {
        try {
            merged.networkServers = JSON.parse(process.env.PTERO_NETWORK_SERVERS);
        } catch (error) {
            console.warn('[pterodactyl] Failed to parse PTERO_NETWORK_SERVERS JSON:', error.message);
        }
    }

    return merged;
}

class PterodactylClient {
    constructor(config = loadConfig()) {
        this.config = config;
        this.panelUrl = config.panelUrl?.replace(/\/$/, '');
        this.clientApiKey = process.env.PTERO_CLIENT_KEY || config.clientApiKey;
        this.applicationApiKey = process.env.PTERO_APPLICATION_KEY || config.applicationApiKey;
        if (!this.panelUrl || !this.clientApiKey) {
            console.warn('[pterodactyl] panelUrl or clientApiKey missing; API calls will fail.');
        }
        this.consoleStreams = new Map();
    }

    get headers() {
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.clientApiKey}`,
            Accept: 'application/json'
        };
    }

    async getServerResources(serverId) {
        const res = await fetch(`${this.panelUrl}/api/client/servers/${serverId}/resources`, {
            method: 'GET',
            headers: this.headers,
        });
        if (!res.ok) {
            throw new Error(`Failed to fetch resources for ${serverId}: ${res.status}`);
        }
        const body = await res.json();
        return body.attributes;
    }

    async sendCommand(serverId, command) {
        const res = await fetch(`${this.panelUrl}/api/client/servers/${serverId}/command`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ command }),
        });
        if (!res.ok) {
            throw new Error(`Failed to send command to ${serverId}: ${res.status}`);
        }
    }

    async sendPowerSignal(serverId, signal) {
        const res = await fetch(`${this.panelUrl}/api/client/servers/${serverId}/power`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ signal }),
        });
        if (!res.ok) {
            throw new Error(`Failed to send ${signal} to ${serverId}: ${res.status}`);
        }
    }

    async fetchWebsocketDetails(serverId) {
        const res = await fetch(`${this.panelUrl}/api/client/servers/${serverId}/websocket`, {
            method: 'GET',
            headers: this.headers,
        });
        if (!res.ok) {
            throw new Error(`Failed to fetch websocket details for ${serverId}: ${res.status}`);
        }
        const body = await res.json();
        return body.data[0].attributes;
    }

    async streamConsole(serverId, onMessage) {
        const existing = this.consoleStreams.get(serverId);
        if (existing) {
            existing.listeners.add(onMessage);
            return existing.cleanup;
        }
        const stream = { listeners: new Set([onMessage]), socket: null, cleanup: () => {} };
        const connect = async () => {
            try {
                const details = await this.fetchWebsocketDetails(serverId);
                const socket = new WebSocket(details.socket);
                stream.socket = socket;
                socket.on('open', () => {
                    socket.send(JSON.stringify({ event: 'auth', args: [details.token] }));
                });
                socket.on('message', raw => {
                    const data = JSON.parse(raw.toString());
                    if (data.event === 'token expiring') {
                        socket.close();
                        connect();
                        return;
                    }
                    if (data.event === 'auth success') {
                        return;
                    }
                    if (data.event === 'console output') {
                        for (const listener of stream.listeners) {
                            listener(data.args[0]);
                        }
                    }
                });
                socket.on('close', () => {
                    setTimeout(connect, 5000);
                });
            } catch (error) {
                console.error('[pterodactyl] websocket error', error);
                setTimeout(connect, 15000);
            }
        };
        await connect();
        stream.cleanup = () => {
            stream.listeners.delete(onMessage);
            if (stream.listeners.size === 0) {
                if (stream.socket) {
                    stream.socket.close();
                }
                this.consoleStreams.delete(serverId);
            }
        };
        this.consoleStreams.set(serverId, stream);
        return stream.cleanup;
    }

    async listApplicationServers() {
        if (!this.applicationApiKey) {
            throw new Error('applicationApiKey missing');
        }
        const res = await fetch(`${this.panelUrl}/api/application/servers`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.applicationApiKey}`,
                Accept: 'application/json'
            }
        });
        if (!res.ok) {
            throw new Error(`Failed to list application servers: ${res.status}`);
        }
        const body = await res.json();
        return body.data.map(entry => entry.attributes);
    }
}

module.exports = { PterodactylClient, loadConfig };
