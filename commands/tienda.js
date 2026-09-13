// commands/tienda.js
const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder,
  ButtonStyle,
  ButtonBuilder
} = require('discord.js');
const { obtenerCuenta, procesarCompra } = require('../economyManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tienda')
    .setDescription('Abre la tienda de artículos, licencias y trámites de tarjetas bancarias'),

  async execute(interaction) {
    const cuenta = obtenerCuenta(interaction.user.id);

    const embedTienda = new EmbedBuilder()
      .setTitle('🛒 TIENDA CENTRAL & MÓDULO BANCARIO')
      .setColor(0x00A86B)
      .setDescription(
        `Bienvenido a la tienda oficial del servidor.\n\n` +
        `💳 **Tu tarjeta actual:** \`${cuenta.tarjeta}\`\n` +
        `💵 **Efectivo:** $${cuenta.efectivo.toLocaleString()}\n` +
        `🏦 **Banco:** $${cuenta.banco.toLocaleString()}\n\n` +
        `*Selecciona una categoría en el menú desplegable de abajo para ver los productos.*`
      )
      .setFooter({ text: 'Usa el menú para realizar tus compras' });

    const menuSeleccion = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('menu_tienda')
        .setPlaceholder('🛒 Selecciona una categoría para comprar...')
        .addOptions([
          {
            label: '💳 Tramitar Tarjetas Bancarias',
            description: 'Obtén tarjetas Gold, Black o VIP para tu cuenta',
            value: 'cat_tarjetas',
            emoji: '💳'
          },
          {
            label: '📜 Licencias y Documentos',
            description: 'Licencia de armas, conducir, pilotaje',
            value: 'cat_licencias',
            emoji: '📜'
          }
        ])
    );

    const response = await interaction.reply({
      embeds: [embedTienda],
      components: [menuSeleccion],
      fetchReply: true
    });

    const collector = response.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: '❌ Solo la persona que usó /tienda puede interactuar con este menú.', ephemeral: true });
      }

      if (i.customId === 'menu_tienda' && i.values[0] === 'cat_tarjetas') {
        const embedTarjetas = new EmbedBuilder()
          .setTitle('💳 MÓDULO DE TRÁMITE DE TARJETAS')
          .setColor(0x3498DB)
          .setDescription('Selecciona la tarjeta que deseas tramitar (Se cobra de tu banco):')
          .addFields(
            { name: '💳 Tarjeta Gold Visa ($5,000)', value: 'Eleva tu estatus bancario al nivel Gold.', inline: false },
            { name: '🖤 Tarjeta Black Platinum ($15,000)', value: 'Acceso a nivel Ejecutivo e historial bancario VIP.', inline: false },
            { name: '💎 Tarjeta Obsidian VIP ($50,000)', value: 'La tarjeta más exclusiva del servidor.', inline: false }
          );

        const botonesTarjetas = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('buy_card_gold').setLabel('Comprar Gold ($5,000)').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('buy_card_black').setLabel('Comprar Black ($15,000)').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('buy_card_obsidian').setLabel('Comprar Obsidian ($50,000)').setStyle(ButtonStyle.Success)
        );

        await i.update({ embeds: [embedTarjetas], components: [botonesTarjetas] });
      }

      else if (i.customId === 'menu_tienda' && i.values[0] === 'cat_licencias') {
        const embedLicencias = new EmbedBuilder()
          .setTitle('📜 MÓDULO DE LICENCIAS ROLPLAY')
          .setColor(0xF1C40F)
          .setDescription('Compra licencias legales para tu personaje (Se cobra de tu efectivo):')
          .addFields(
            { name: '🚗 Licencia de Conducir ($1,200)', value: 'Obligatoria para transitar legalmente.', inline: false },
            { name: '🔫 Licencia de Portación de Armas ($8,000)', value: 'Permiso para llevar armas de calibre ligero.', inline: false }
          );

        const botonesLicencias = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('buy_lic_conducir').setLabel('Lic. Conducir ($1,200)').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('buy_lic_armas').setLabel('Lic. Armas ($8,000)').setStyle(ButtonStyle.Danger)
        );

        await i.update({ embeds: [embedLicencias], components: [botonesLicencias] });
      }

      else if (i.customId.startsWith('buy_card_')) {
        let nombre = '';
        let precio = 0;

        if (i.customId === 'buy_card_gold') { nombre = 'Visa Gold'; precio = 5000; }
        if (i.customId === 'buy_card_black') { nombre = 'Black Platinum'; precio = 15000; }
        if (i.customId === 'buy_card_obsidian') { nombre = 'Obsidian VIP'; precio = 50000; }

        const resultado = procesarCompra(i.user.id, nombre, precio, 'banco', true);

        if (resultado.exito) {
          await i.reply({ content: `✅ ¡Felicidades! Tramitaste tu tarjeta **${nombre}**. Se debitaron **$${precio.toLocaleString()}** de tu banco.`, ephemeral: true });
        } else {
          await i.reply({ content: `❌ Error al tramitar: ${resultado.razon}`, ephemeral: true });
        }
      }

      else if (i.customId.startsWith('buy_lic_')) {
        let nombre = '';
        let precio = 0;

        if (i.customId === 'buy_lic_conducir') { nombre = 'Licencia de Conducir'; precio = 1200; }
        if (i.customId === 'buy_lic_armas') { nombre = 'Licencia de Armas'; precio = 8000; }

        const resultado = procesarCompra(i.user.id, nombre, precio, 'efectivo', false);

        if (resultado.exito) {
          await i.reply({ content: `✅ Compraste la **${nombre}** por **$${precio.toLocaleString()}** en efectivo.`, ephemeral: true });
        } else {
          await i.reply({ content: `❌ Error en la compra: ${resultado.razon}`, ephemeral: true });
        }
      }
    });
  }
};