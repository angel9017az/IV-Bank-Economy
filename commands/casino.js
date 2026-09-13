// commands/casino.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('casino')
    .setDescription('Muestra la guía oficial, comandos y reglamento del casino.'),

  async execute(interaction) {
    const embedGuia = new EmbedBuilder()
      .setTitle('🏛️ **REGLAMENTO Y MANUAL OPERATIVO DEL CASINO**')
      .setColor(0xD4AF37) // Dorado Elegante
      .setDescription(
        'Bienvenido al Complejo de Juegos y Apuestas Oficial. A continuación, se detallan las normativas de participación, los comandos de ejecución y los términos de liquidación bancaria.'
      )
      .addFields(
        {
          name: '🃏 **1. Blackjack Tradicional (21)**',
          value: '• **Comando:** `!bj <monto>`\n' +
                 '• **Objetivo:** Acumular un puntaje más cercano a 21 que la casa sin sobrepasarlo.\n' +
                 '• **Pagos:** Retorno de **2x** el valor apostado en caso de victoria.'
        },
        {
          name: '🎰 **2. Máquinas Tragamonedas (Slots)**',
          value: '• **Comando:** `!slots <monto>`\n' +
                 '• **Objetivo:** Obtener combinaciones coincidentes de símbolos en los rieles.\n' +
                 '• **Pagos:** Pareja coincidente (**1.5x**), trío de figuras (**5x**), triple 7️⃣ (**10x**).'
        },
        {
          name: '🎲 **3. Ruleta Francesa**',
          value: '• **Comando:** `!ruleta <rojo|negro|0-36> <monto>`\n' +
                 '• **Modalidades:** Apuesta a color (**2x**) o a número exacto (**36x**).'
        },
        {
          name: '🏇 **4. Hipódromo Privado**',
          value: '• **Comando:** `!caballos <número_1-4> <monto>`\n' +
                 '• **Objetivo:** Seleccionar el ejemplar victorioso entre los 4 competidores.\n' +
                 '• **Pagos:** Retorno fijo de **3x** el capital apostado.'
        },
        {
          name: '💼 **Términos de Tesorería y Garantías**',
          value: '• Las apuestas se debitan de su **dinero en efectivo** (billetera).\n' +
                 '• Todo cobro de premios está respaldado directamente por las reservas de liquidez del **Banco Central**.'
        }
      )
      .setFooter({ text: 'Sistema Financiero Integrado • Presione cualquier comando para iniciar' })
      .setTimestamp();

    return await interaction.reply({ embeds: [embedGuia] });
  }
};