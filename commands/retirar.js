// commands/retirar.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { retirar } = require('../economyManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('retirar')
    .setDescription('Retira dinero del banco a tu efectivo')
    .addIntegerOption(opt => opt.setName('monto').setDescription('Cantidad a retirar').setRequired(true)),

  async execute(interaction) {
    const monto = interaction.options.getInteger('monto');
    const res = retirar(interaction.user.id, monto);

    if (!res.exito) return interaction.reply({ content: `❌ ${res.razon}`, flags: 64 });

    const embed = new EmbedBuilder()
      .setTitle('🏧 Retiro Exitoso')
      .setColor(0xE74C3C)
      .setDescription(`Retiraste **$${monto.toLocaleString()}** del cajero.`)
      .addFields(
        { name: '💵 Efectivo Actual', value: `$${res.cuenta.efectivo.toLocaleString()}`, inline: true },
        { name: '🏦 Saldo en Banco', value: `$${res.cuenta.banco.toLocaleString()}`, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};