require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { PterodactylClient, loadConfig } = require('./services/pterodactyl');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

const config = loadConfig();
const ptero = new PterodactylClient(config);
const port = Number(process.env.PORT) || 3000;

// Lightweight HTTP listener so Pterodactyl can expose a health port
http.createServer((_, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
}).listen(port, () => console.log(`Health server listening on ${port}`));

client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }
}

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            await command.execute(interaction);
            return;
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith('commandModal')) {
            const serverCommand = client.commands.get('server');
            if (serverCommand?.handleModal) {
                await serverCommand.handleModal(interaction);
            }
            return;
        }
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this interaction!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this interaction!', ephemeral: true });
        }
    }
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    // Passive offline monitor
    if (config.adminChannelId) {
        setInterval(async () => {
            if (!config.networkServers) return;
            for (const server of config.networkServers) {
                try {
                    const resources = await ptero.getServerResources(server.id);
                    if (resources.current_state === 'offline') {
                        const channel = await client.channels.fetch(config.adminChannelId).catch(() => null);
                        if (channel) {
                            channel.send(`⚠️ ${server.name} appears to be offline.`);
                        }
                    }
                } catch (error) {
                    console.warn('Monitor error', error.message);
                }
            }
        }, 60000);
    }
});

client.login(process.env.DISCORD_TOKEN);
