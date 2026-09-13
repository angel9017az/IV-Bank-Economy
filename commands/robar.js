// commands/robar.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { obtenerCuenta, actualizarSaldo, cargarEconomia, guardarEconomia } = require('../economyManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('robar')
    .setDescription('Intenta robar a otro cliente (Riesgo de multa y bajada de Score)')
    .addUserOption(opt => opt.setName('victima').setDescription('Usuario a quien intentarás robar').setRequired(true)),

  async execute(interaction) {
    const victimaUser = interaction.options.getUser('victima');
    
    if (victimaUser.id === interaction.user.id) {
      return interaction.reply({ content: '❌ No puedes robarte a ti mismo.', flags: 64 });
    }

    const ladron = obtenerCuenta(interaction.user.id);
    const victima = obtenerCuenta(victimaUser.id);

    if (victima.efectivo < 200) {
      return interaction.reply({ content: '❌ La víctima no tiene suficiente dinero en efectivo en su billetera.', flags: 64 });
    }

    const exito = Math.random() < 0.45;

    if (exito) {
      const porcentaje = Math.random() * (0.35 - 0.15) + 0.15;
      const botin = Math.floor(victima.efectivo * porcentaje);

      actualizarSaldo(victimaUser.id, -botin, 0);
      actualizarSaldo(interaction.user.id, botin, 0);

      const embed = new EmbedBuilder()
        .setTitle('🥷 Robo Exitoso')
        .setColor(0xE74C3C)
        .setDescription(`Le robaste **$${botin.toLocaleString()} USD** en efectivo a ${victimaUser}.`);

      await interaction.reply({ embeds: [embed] });
    } else {
      const multa = Math.floor(ladron.efectivo * 0.20) + 500;
      actualizarSaldo(interaction.user.id, -multa, 0);

      const eco = cargarEconomia();
      eco[interaction.user.id].scoreCrediticio = Math.max(300, eco[interaction.user.id].scoreCrediticio - 30);
      guardarEconomia(eco);

      const embed = new EmbedBuilder()
        .setTitle('🚨 ¡Atrapado por las Autoridades!')
        .setColor(0x992D22)
        .setDescription(`Fuiste arrestado. Pagaste **$${multa.toLocaleString()} USD** de multa y tu Score Crediticio bajó **30 pts**.`);

      await interaction.reply({ embeds: [embed] });
    }
  }
};