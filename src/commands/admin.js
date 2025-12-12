const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { PterodactylClient, loadConfig } = require('../services/pterodactyl');
const { formatBytes } = require('../utils/formatters');

const config = loadConfig();
const client = new PterodactylClient(config);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Admin tools for all Pterodactyl servers')
        .addSubcommand(sub => sub.setName('list').setDescription('List all servers on the panel'))
        .addSubcommand(sub =>
            sub
                .setName('show')
                .setDescription('Inspect a specific server')
                .addStringOption(opt =>
                    opt
                        .setName('id')
                        .setDescription('Server UUID or identifier')
                        .setRequired(true)
                )
        ),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({ content: 'Admins only.', ephemeral: true });
            return;
        }
        const sub = interaction.options.getSubcommand();
        if (sub === 'list') {
            const servers = await client.listApplicationServers();
            const embed = new EmbedBuilder()
                .setTitle('All panel servers')
                .setDescription(servers.map(s => `**${s.name}** — ${s.identifier} (${s.uuid})`).join('\n'));
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
            const id = interaction.options.getString('id');
            const servers = await client.listApplicationServers();
            const target = servers.find(s => s.identifier === id || s.uuid === id);
            if (!target) {
                await interaction.reply({ content: 'Server not found.', ephemeral: true });
                return;
            }
            const embed = new EmbedBuilder()
                .setTitle(`${target.name}`)
                .addFields(
                    { name: 'Identifier', value: target.identifier, inline: true },
                    { name: 'UUID', value: target.uuid, inline: true },
                    { name: 'Memory', value: `${formatBytes(target.limits?.memory * 1024 * 1024 || 0)}`, inline: true },
                    { name: 'Disk', value: `${formatBytes(target.limits?.disk * 1024 * 1024 || 0)}`, inline: true },
                    { name: 'Status', value: target.suspended ? 'Suspended' : 'Active', inline: true }
                );
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
