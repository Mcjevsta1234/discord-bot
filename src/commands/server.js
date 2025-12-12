const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');
const { PterodactylClient, loadConfig } = require('../services/pterodactyl');
const { formatBytes, formatPercent, sparkline } = require('../utils/formatters');

const config = loadConfig();
const client = new PterodactylClient(config);
const sessions = new Map();

function isAdmin(member) {
    if (!member) return false;
    const adminIds = new Set([...(config.adminUsers || []), ...(config.adminRoles || [])]);
    return (
        adminIds.has(member.id) ||
        member.permissions.has(PermissionFlagsBits.Administrator) ||
        (config.adminRoles || []).some(roleId => member.roles.cache.has(roleId))
    );
}

function buildButtons(serverId, userId) {
    const suffix = `${serverId}:${userId}`;
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`start:${suffix}`).setStyle(ButtonStyle.Success).setLabel('Start'),
        new ButtonBuilder().setCustomId(`stop:${suffix}`).setStyle(ButtonStyle.Danger).setLabel('Stop'),
        new ButtonBuilder().setCustomId(`restart:${suffix}`).setStyle(ButtonStyle.Secondary).setLabel('Restart'),
        new ButtonBuilder().setCustomId(`refresh:${suffix}`).setStyle(ButtonStyle.Primary).setLabel('Refresh'),
        new ButtonBuilder().setCustomId(`command:${suffix}`).setStyle(ButtonStyle.Secondary).setLabel('Send Command')
    );
}

function buildEmbed(server, resources, stats) {
    const embed = new EmbedBuilder()
        .setTitle(`${server.name} • ${resources?.current_state || 'unknown'}`)
        .setDescription('Live controls for your Pterodactyl server')
        .addFields(
            { name: 'CPU', value: `${formatPercent(resources?.resources?.cpu_absolute || 0)}\n${sparkline(stats.cpu, 300)}`, inline: true },
            { name: 'RAM', value: `${formatBytes(resources?.resources?.memory_bytes || 0)} / ${formatBytes(resources?.limits?.memory ? resources.limits.memory * 1024 * 1024 : 0)}\n${sparkline(stats.ram, resources?.limits?.memory || 100)}`, inline: true },
            { name: 'Disk', value: `${formatBytes(resources?.resources?.disk_bytes || 0)}`, inline: true },
        )
        .addFields(
            { name: 'Address', value: server.displayHost || 'Not configured', inline: true },
            { name: 'Status', value: resources?.current_state || 'unknown', inline: true },
            { name: 'Players', value: `${resources?.resources?.connections || 0}`, inline: true }
        )
        .setFooter({ text: 'Buttons are limited to the requester or admins' });

    const consoleText = stats.console.length ? stats.console.slice(-10).join('') : 'Console will stream here when available.';
    embed.addFields({ name: 'Console', value: `\u200b${consoleText.substring(0, 1000)}` });
    return embed;
}

async function ensureSession(server, userId, channel) {
    const key = `${server.id}:${userId}:${channel.id}`;
    if (!sessions.has(key)) {
        sessions.set(key, { cpu: [], ram: [], console: [], cleanup: null });
    }
    return sessions.get(key);
}

async function refreshEmbed(interaction, server, session) {
    const resources = await client.getServerResources(server.id);
    session.cpu.push(resources.resources.cpu_absolute);
    session.ram.push(resources.resources.memory_bytes / (1024 * 1024));
    const embed = buildEmbed(server, resources, session);
    await interaction.editReply({ embeds: [embed] });
}

async function handlePower(interaction, action, server) {
    await client.sendPowerSignal(server.id, action);
    await interaction.reply({ content: `Sent ${action} to ${server.name}`, ephemeral: true });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Control a configured Pterodactyl server')
        .addStringOption(opt =>
            opt.setName('name')
                .setDescription('Server to control')
                .setRequired(true)
                .addChoices(...(config.networkServers || []).map(s => ({ name: s.name, value: s.id }))))
        .addBooleanOption(opt => opt.setName('public').setDescription('Make the control embed public (default: false)')),
    async execute(interaction) {
        const serverId = interaction.options.getString('name');
        const isPublic = interaction.options.getBoolean('public') || false;
        const server = (config.networkServers || []).find(s => s.id === serverId);
        if (!server) {
            await interaction.reply({ content: 'Unknown server in configuration.', ephemeral: true });
            return;
        }

        const session = await ensureSession(server, interaction.user.id, interaction.channel);

        const initialResources = await client.getServerResources(server.id).catch(() => null);
        const embed = buildEmbed(server, initialResources, session);
        const reply = await interaction.reply({ embeds: [embed], components: [buildButtons(server.id, interaction.user.id)], ephemeral: !isPublic });

        const collector = reply.createMessageComponentCollector({ time: 10 * 60 * 1000 });
        const cleanup = await client.streamConsole(server.id, line => {
            session.console.push(line);
        });
        session.cleanup = cleanup;

        const interval = setInterval(async () => {
            try {
                const resources = await client.getServerResources(server.id);
                session.cpu.push(resources.resources.cpu_absolute);
                session.ram.push(resources.resources.memory_bytes / (1024 * 1024));
                const liveEmbed = buildEmbed(server, resources, session);
                await interaction.editReply({ embeds: [liveEmbed] });
            } catch (error) {
                console.warn('Failed to refresh server embed', error.message);
            }
        }, 15000);

        collector.on('end', () => {
            clearInterval(interval);
            if (session.cleanup) session.cleanup();
        });

        collector.on('collect', async i => {
            const [, sId, ownerId] = i.customId.split(':');
            if (ownerId !== i.user.id && !isAdmin(i.member)) {
                await i.reply({ content: 'Only the requestor or an admin can use these controls.', ephemeral: true });
                return;
            }
            if (sId !== server.id) {
                await i.reply({ content: 'Server mismatch.', ephemeral: true });
                return;
            }

            if (i.customId.startsWith('refresh:')) {
                await refreshEmbed(i, server, session);
                return;
            }
            if (i.customId.startsWith('command:')) {
                const modal = new ModalBuilder()
                    .setCustomId(`commandModal:${server.id}:${ownerId}`)
                    .setTitle(`Send command to ${server.name}`)
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('commandInput')
                                .setLabel('Command')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        )
                    );
                await i.showModal(modal);
                return;
            }

            const action = i.customId.split(':')[0];
            await client.sendPowerSignal(server.id, action);
            await i.reply({ content: `Sent ${action} signal to ${server.name}`, ephemeral: true });
        });
    },
    async handleModal(interaction) {
        const [, serverId, ownerId] = interaction.customId.split(':');
        const server = (config.networkServers || []).find(s => s.id === serverId);
        if (!server) {
            await interaction.reply({ content: 'Server not configured.', ephemeral: true });
            return;
        }
        if (ownerId !== interaction.user.id && !isAdmin(interaction.member)) {
            await interaction.reply({ content: 'Only the requestor or an admin can run commands.', ephemeral: true });
            return;
        }
        const command = interaction.fields.getTextInputValue('commandInput');
        await client.sendCommand(server.id, command);
        await interaction.reply({ content: `Sent command to ${server.name}: ${command}`, ephemeral: true });
    }
};
