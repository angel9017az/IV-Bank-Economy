// commands/dinero.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { obtenerCuenta, obtenerLimiteBanco } = require('../economyManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dinero')
    .setDescription('Consulta rápida de saldo e inventario de tu cuenta'),

  async execute(interaction) {
    const cuenta = obtenerCuenta(interaction.user.id);
    const limiteBanco = obtenerLimiteBanco(cuenta.tarjeta);
    const patrimonioTotal = cuenta.efectivo + cuenta.banco;

    const textoLimite = limiteBanco === Infinity ? 'Ilimitado' : `$${limiteBanco.toLocaleString()} USD`;

    const listaInventario = cuenta.inventario.length > 0 
      ? cuenta.inventario.map(i => `• ${i}`).join('\n') 
      : '*Sin artículos o licencias compradas*';

    const detallesCuenta = 
      `**ESTADO BANCARIO Y RESUMEN FINANCIERO**\n` +
      `--------------------------------------------------\n` +
      `• **Titular:** ${interaction.user.username.toUpperCase()}\n` +
      `• **N° Cuenta:** \`${cuenta.numeroCuenta}\`\n` +
      `• **Tarjeta Emitida:** \`${cuenta.tarjeta}\`\n` +
      `• **Límite Depósito Banco:** \`${textoLimite}\``;

    const embedBanco = new EmbedBuilder()
      .setAuthor({ 
        name: 'RESERVA FEDERAL | SISTEMA BANCARIO GLOBAL', 
        iconURL: 'https://cdn-icons-png.flaticon.com/512/2830/2830284.png' 
      })
      .setTitle(`💳 Estado de Cuenta — ${interaction.user.displayName}`)
      .setColor(0x00A86B)
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setDescription(detallesCuenta)
      .addFields(
        { 
          name: '💵 Efectivo en Billetera', 
          value: `> **$${cuenta.efectivo.toLocaleString('en-US')} USD**`, 
          inline: true 
        },
        { 
          name: '🏦 Saldo en Banco', 
          value: `> **$${cuenta.banco.toLocaleString('en-US')} USD**`, 
          inline: true 
        },
        { 
          name: '\u200B', 
          value: '\u200B', 
          inline: true 
        },
        { 
          name: '📊 Patrimonio Neto Total', 
          value: `\`\`\`css\n$${patrimonioTotal.toLocaleString('en-US')} USD\n\`\`\``, 
          inline: false 
        },
        { 
          name: '📦 Inventario de Compras', 
          value: listaInventario, 
          inline: false 
        }
      )
      .setFooter({ 
        text: 'Terminal del Banco Central — Usa /banco para operar', 
        iconURL: 'https://cdn-icons-png.flaticon.com/512/1161/1161388.png' 
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embedBanco] });
  }
};