// commands/depositar.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { depositar } = require('../economyManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('depositar')
    .setDescription('Deposita dinero en efectivo en tu cuenta bancaria')
    .addIntegerOption(opt => opt.setName('monto').setDescription('Cantidad a depositar').setRequired(true)),

  async execute(interaction) {
    const monto = interaction.options.getInteger('monto');
    const res = depositar(interaction.user.id, monto);

    if (!res.exito) return interaction.reply({ content: `❌ ${res.razon}`, flags: 64 });

    const embed = new EmbedBuilder()
      .setTitle('🏦 Depósito Exitoso')
      .setColor(0x00A86B)
      .setDescription(`Depositaste **$${res.montoReal.toLocaleString()}** en tu cuenta bancaria.`)
      .addFields(
        { name: '💵 Efectivo Restante', value: `$${res.cuenta.efectivo.toLocaleString()}`, inline: true },
        { name: '🏦 Saldo en Banco', value: `$${res.cuenta.banco.toLocaleString()}`, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
