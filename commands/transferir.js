// commands/transferir.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { transferir } = require('../economyManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transferir')
    .setDescription('Transfiere dinero de tu banco a otro usuario')
    .addUserOption(opt => opt.setName('destinatario').setDescription('Usuario que recibirá el dinero').setRequired(true))
    .addIntegerOption(opt => opt.setName('monto').setDescription('Cantidad a transferir').setRequired(true)),

  async execute(interaction) {
    const dest = interaction.options.getUser('destinatario');
    const monto = interaction.options.getInteger('monto');

    if (dest.id === interaction.user.id) {
      return interaction.reply({ content: '❌ No puedes transferirte dinero a ti mismo.', flags: 64 });
    }

    const res = transferir(interaction.user.id, dest.id, monto);
    if (!res.exito) return interaction.reply({ content: `❌ ${res.razon}`, flags: 64 });

    const embed = new EmbedBuilder()
      .setTitle('💸 Transferencia Exitosa')
      .setColor(0x3498DB)
      .setDescription(`Enviaste **$${monto.toLocaleString()}** a **${dest.username}**.`)
      .addFields({ name: '🏦 Nuevo Saldo en Banco', value: `$${res.emisor.banco.toLocaleString()}` });

    await interaction.reply({ embeds: [embed] });
  }
};