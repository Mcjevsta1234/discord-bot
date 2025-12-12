const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PterodactylClient, loadConfig } = require('../services/pterodactyl');
const { formatBytes, formatPercent } = require('../utils/formatters');

const config = loadConfig();
const client = new PterodactylClient(config);

module.exports = {
    data: new SlashCommandBuilder().setName('network').setDescription('Show network server status'),
    async execute(interaction) {
        const servers = config.networkServers || [];
        if (!servers.length) {
            await interaction.reply({ content: 'No network servers configured.', ephemeral: true });
            return;
        }
        const embed = new EmbedBuilder().setTitle('Network status');
        const rows = await Promise.all(
            servers.map(async server => {
                try {
                    const resources = await client.getServerResources(server.id);
                    const memPercent = resources.limits?.memory
                        ? (resources.resources.memory_bytes / (resources.limits.memory * 1024 * 1024)) * 100
                        : 0;
                    const cpu = formatPercent(resources.resources.cpu_absolute || 0);
                    const ram = `${formatBytes(resources.resources.memory_bytes)} (${memPercent.toFixed(1)}%)`;
                    const players = resources.resources?.connections || 0;
                    return `**${server.name}** — ${resources.current_state}\nCPU: ${cpu} | RAM: ${ram}\nPlayers: ${players}\nIP: ${server.displayHost || 'Not configured'}`;
                } catch (error) {
                    return `**${server.name}** — unavailable (${error.message})`;
                }
            })
        );
        embed.setDescription(rows.join('\n\n'));
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
