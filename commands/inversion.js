// commands/inversion.js
const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  MessageFlags
} = require('discord.js');
const { cargarMercado, comprarActivo, venderActivo, obtenerPortafolio } = require('../marketManager');
const { obtenerCuenta } = require('../economyManager');

// Genera mini-velas de tendencia según el historial de precios
function generarGraficoTexto(historico = []) {
  if (historico.length < 2) return '📊 `[ ▬ ▬ ▬ ]`';
  const min = Math.min(...historico);
  const max = Math.max(...historico);
  const delta = max - min || 1;
  const bloques = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

  const grafico = historico.map(v => {
    const idx = Math.floor(((v - min) / delta) * (bloques.length - 1));
    return bloques[Math.max(0, Math.min(bloques.length - 1, idx))];
  }).join('');

  const esAlcista = historico[historico.length - 1] >= historico[0];
  const iconoTrend = esAlcista ? '📈' : '📉';

  return `${iconoTrend} \`[ ${grafico} ]\``;
}

function crearEmbedPortafolio(user) {
  const cuenta = obtenerCuenta(user.id);
  const mercado = cargarMercado();
  const portafolio = obtenerPortafolio(user.id);

  let valorTotalInversiones = 0;
  let costoTotalInversiones = 0;
  let lineasPortafolio = [];

  for (const simbolo in portafolio) {
    const item = portafolio[simbolo];
    const activo = mercado.activos[simbolo];

    if (activo && item.cantidad > 0) {
      const valorActual = item.cantidad * activo.precio;
      const costoInvertido = item.cantidad * item.costoPromedio;

      valorTotalInversiones += valorActual;
      costoTotalInversiones += costoInvertido;

      const gananciaPerdida = valorActual - costoInvertido;
      const rendimientoPorcentaje = costoInvertido > 0 
        ? ((gananciaPerdida / costoInvertido) * 100).toFixed(2) 
        : '0.00';

      const esGanancia = gananciaPerdida >= 0;
      const signo = esGanancia ? '+' : '';
      const indicadorColor = esGanancia ? '🟢' : '🔴';

      lineasPortafolio.push(
        `${indicadorColor} **${activo.nombre}** (\`${simbolo}\`)\n` +
        `┗ Tenencia: \`${item.cantidad} un.\` | Precio Act.: \`$${activo.precio.toLocaleString()} USD\`\n` +
        `┗ Valor Total: \`$${valorActual.toLocaleString()} USD\` | ROI: \`${signo}$${gananciaPerdida.toLocaleString()} USD\` (\`${signo}${rendimientoPorcentaje}%\`)`
      );
    }
  }

  // Rendimiento Global de la Cartera
  const PnLGlobal = valorTotalInversiones - costoTotalInversiones;
  const ROIGlobal = costoTotalInversiones > 0 
    ? ((PnLGlobal / costoTotalInversiones) * 100).toFixed(2) 
    : '0.00';
  const signoGlobal = PnLGlobal >= 0 ? '+' : '';
  const colorPnL = PnLGlobal >= 0 ? '🟩' : '🟥';

  const textoDetalle = lineasPortafolio.length > 0 
    ? lineasPortafolio.join('\n\n') 
    : '*No posees posiciones abiertas en este momento.*';

  // Resumen del mercado en vivo
  let resumenMercado = [];
  for (const s in mercado.activos) {
    const a = mercado.activos[s];
    const miniGrafico = generarGraficoTexto(a.historico);
    resumenMercado.push(`${a.icono} **${s}**: \`$${a.precio.toLocaleString()} USD\` ${miniGrafico}`);
  }

  return new EmbedBuilder()
    .setAuthor({ 
      name: 'WALL STREET & CRYPTO EXCHANGE', 
      iconURL: 'https://cdn-icons-png.flaticon.com/512/2830/2830284.png' 
    })
    .setTitle(`📊 Terminal Financiera — ${user.displayName}`)
    .setColor(PnLGlobal >= 0 ? 0x00F0FF : 0xFF3838)
    .setDescription(
      `🏛️ **Saldo en Banco:** \`$${cuenta.banco.toLocaleString()} USD\`\n` +
      `💼 **Valor en Inversiones:** \`$${valorTotalInversiones.toLocaleString()} USD\`\n` +
      `🌐 **Patrimonio Inversionista:** \`$${(cuenta.banco + valorTotalInversiones).toLocaleString()} USD\`\n` +
      `${colorPnL} **Rendimiento Cartera (PnL):** \`${signoGlobal}$${PnLGlobal.toLocaleString()} USD\` (\`${signoGlobal}${ROIGlobal}%\`)\n` +
      `--------------------------------------------------`
    )
    .addFields(
      { name: '🔥 Precios de Mercado en Vivo', value: resumenMercado.join('\n'), inline: false },
      { name: '📦 Mis Posiciones Activas', value: textoDetalle, inline: false }
    )
    .setFooter({ text: 'Selecciona una opción del menú para habilitar la compra/venta activa' })
    .setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inversion')
    .setDescription('Abre tu terminal de inversiones y trading en tiempo real'),

  async execute(interaction) {
    const embed = crearEmbedPortafolio(interaction.user);
    const mercado = cargarMercado();

    const opcionesMercado = Object.keys(mercado.activos).map(simbolo => {
      const a = mercado.activos[simbolo];
      return {
        label: `${simbolo} — $${a.precio.toLocaleString()} USD`,
        description: a.nombre,
        value: simbolo,
        emoji: a.icono
      };
    });

    const menuOperacion = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_activo_operar')
        .setPlaceholder('💹 Selecciona un activo para operar...')
        .addOptions(opcionesMercado)
    );

    const botonesAccion = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_comprar').setLabel('Comprar 📈').setStyle(ButtonStyle.Success).setDisabled(true),
      new ButtonBuilder().setCustomId('btn_vender').setLabel('Vender 📉').setStyle(ButtonStyle.Danger).setDisabled(true)
    );

    const response = await interaction.reply({
      embeds: [embed],
      components: [menuOperacion, botonesAccion],
      fetchReply: true
    });

    let simboloSeleccionado = null;

    const collector = response.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id,
      time: 120000
    });

    collector.on('collect', async i => {
      if (i.isStringSelectMenu()) {
        simboloSeleccionado = i.values[0];

        const botonesHabilitados = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('btn_comprar').setLabel(`Comprar ${simboloSeleccionado} 🟢`).setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('btn_vender').setLabel(`Vender ${simboloSeleccionado} 🔴`).setStyle(ButtonStyle.Danger)
        );

        await i.update({ components: [menuOperacion, botonesHabilitados] });
      }

      else if (i.isButton()) {
        const esCompra = i.customId === 'btn_comprar';
        const accionTexto = esCompra ? 'COMPRAR' : 'VENDER';

        const modal = new ModalBuilder()
          .setCustomId(`modal_${i.customId}_${simboloSeleccionado}`)
          .setTitle(`${accionTexto} ${simboloSeleccionado}`);

        const inputCantidad = new TextInputBuilder()
          .setCustomId('input_cantidad')
          .setLabel(`Cantidad de ${simboloSeleccionado} a ${accionTexto.toLowerCase()}`)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ejemplo: 5')
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(inputCantidad));
        await i.showModal(modal);

        try {
          const modalSubmit = await response.awaitModalSubmit({
            filter: m => m.user.id === interaction.user.id,
            time: 60000
          });

          await modalSubmit.deferUpdate();
          const cantidad = parseInt(modalSubmit.fields.getTextInputValue('input_cantidad'));

          if (isNaN(cantidad) || cantidad <= 0) {
            return await modalSubmit.followUp({ content: '❌ Cantidad inválida.', flags: MessageFlags.Ephemeral });
          }

          if (esCompra) {
            const res = comprarActivo(interaction.user.id, simboloSeleccionado, cantidad);
            if (!res.exito) await modalSubmit.followUp({ content: `❌ ${res.razon}`, flags: MessageFlags.Ephemeral });
            else await modalSubmit.followUp({ content: `✅ Compraste **${cantidad}** unidades de **${simboloSeleccionado}** por **$${res.costoTotal.toLocaleString()} USD**.`, flags: MessageFlags.Ephemeral });
          } else {
            const res = venderActivo(interaction.user.id, simboloSeleccionado, cantidad);
            if (!res.exito) await modalSubmit.followUp({ content: `❌ ${res.razon}`, flags: MessageFlags.Ephemeral });
            else await modalSubmit.followUp({ content: `✅ Vendiste **${cantidad}** unidades de **${simboloSeleccionado}**. Se acreditaron **$${res.ingresoTotal.toLocaleString()} USD** en tu banco.`, flags: MessageFlags.Ephemeral });
          }

          // Actualizar la interfaz tras completar la operación
          await interaction.editReply({ embeds: [crearEmbedPortafolio(interaction.user)] });
        } catch (e) {
          // El tiempo expiró
        }
      }
    });
  }
};