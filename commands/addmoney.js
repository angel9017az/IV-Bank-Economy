const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { actualizarSaldo } = require('../economyManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addmoney')
    .setDescription('Añade dinero al banco o efectivo de un usuario (Solo Admins)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Solo usuarios con permisos de admin
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('Usuario al que le darás dinero')
        .setRequired(true))
    .addIntegerOption(option => 
      option.setName('cantidad')
        .setDescription('Cantidad de dinero a añadir')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('tipo')
        .setDescription('¿Dónde añadir el dinero?')
        .setRequired(true)
        .addChoices(
          { name: '🏦 Banco', value: 'banco' },
          { name: '💵 Efectivo', value: 'efectivo' }
        )),

  async execute(interaction) {
    const usuario = interaction.options.getUser('usuario');
    const cantidad = interaction.options.getInteger('cantidad');
    const tipo = interaction.options.getString('tipo');

    const efectivoDiff = tipo === 'efectivo' ? cantidad : 0;
    const bancoDiff = tipo === 'banco' ? cantidad : 0;

    const cuentaActualizada = actualizarSaldo(usuario.id, efectivoDiff, bancoDiff);

    const embed = new EmbedBuilder()
      .setTitle('💰 Inyección de Fondos Exitosa')
      .setColor(0x00FF00)
      .setDescription(`Se han añadido **$${cantidad.toLocaleString()}** al **${tipo}** de ${usuario}.`)
      .addFields(
        { name: '💵 Efectivo Actual', value: `$${cuentaActualizada.efectivo.toLocaleString()}`, inline: true },
        { name: '🏦 Banco Actual', value: `$${cuentaActualizada.banco.toLocaleString()}`, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
