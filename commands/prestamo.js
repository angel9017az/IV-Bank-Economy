// commands/prestamo.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { solicitarPrestamo, pagarPrestamo } = require('../economyManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prestamo')
    .setDescription('Solicita o paga préstamos bancarios')
    .addSubcommand(sub => 
      sub.setName('solicitar')
        .setDescription('Solicita un préstamo basado en tu Score Crediticio')
        .addIntegerOption(opt => opt.setName('monto').setDescription('Monto a solicitar').setRequired(true)))
    .addSubcommand(sub => 
      sub.setName('pagar')
        .setDescription('Liquida tu deuda activa con tu saldo del banco')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'solicitar') {
      const monto = interaction.options.getInteger('monto');
      const res = solicitarPrestamo(interaction.user.id, monto);
      if (!res.exito) return interaction.reply({ content: `❌ ${res.razon}`, flags: 64 });

      const embed = new EmbedBuilder()
        .setTitle('🤝 Préstamo Aprobado')
        .setColor(0x2ECC71)
        .setDescription(`El banco acreditó **$${monto.toLocaleString()}** en tu cuenta bancaria.`)
        .addFields(
          { name: '📌 Total a Pagar (Interés Incluido)', value: `$${res.totalAPagar.toLocaleString()}`, inline: true },
          { name: '📈 Score de Crédito Utilizado', value: `${res.score} pts`, inline: true }
        );

      await interaction.reply({ embeds: [embed] });
    } 
    
    else if (sub === 'pagar') {
      const res = pagarPrestamo(interaction.user.id);
      if (!res.exito) return interaction.reply({ content: `❌ ${res.razon}`, flags: 64 });

      const embed = new EmbedBuilder()
        .setTitle('✅ Préstamo Liquidado')
        .setColor(0x00A86B)
        .setDescription(`Pagaste tu deuda de **$${res.montoPagado.toLocaleString()}**.\n\n📈 **Tu Credit Score subió a:** \`${res.nuevoScore} pts\``);

      await interaction.reply({ embeds: [embed] });
    }
  }
};