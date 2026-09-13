// commands/trabajar.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { obtenerCuenta, actualizarSaldo, cargarEconomia, guardarEconomia } = require('../economyManager');

const TRABAJOS = [
  'Condujiste un autobús de la ciudad',
  'Reparaste el servidor del banco',
  'Trabajaste como cajero en el supermercado',
  'Entregaste pedidos de comida rápida',
  'Brindaste mantenimiento a las cámaras de seguridad'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trabajar')
    .setDescription('Realiza un turno de trabajo para recibir tu sueldo en efectivo'),

  async execute(interaction) {
    const cuenta = obtenerCuenta(interaction.user.id);
    const COOLDOWN = 60 * 60 * 1000;
    const ahora = Date.now();

    if (ahora - cuenta.ultimoTrabajo < COOLDOWN) {
      const restante = Math.ceil((COOLDOWN - (ahora - cuenta.ultimoTrabajo)) / (1000 * 60));
      return interaction.reply({ 
        content: `⏳ Estás agotado. Debes esperar **${restante} minutos** antes de volver a trabajar.`, 
        flags: 64 
      });
    }

    const paga = Math.floor(Math.random() * (800 - 300 + 1)) + 300;
    const trabajoAzar = TRABAJOS[Math.floor(Math.random() * TRABAJOS.length)];

    actualizarSaldo(interaction.user.id, paga, 0);

    const eco = cargarEconomia();
    eco[interaction.user.id].ultimoTrabajo = ahora;
    guardarEconomia(eco);

    const embed = new EmbedBuilder()
      .setTitle('🛠️ Jornada Laboral Completada')
      .setColor(0x2ECC71)
      .setDescription(`${trabajoAzar} y recibiste **$${paga.toLocaleString()} USD** en efectivo.`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};