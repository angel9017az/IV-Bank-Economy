// services/marketTicker.js
const { EmbedBuilder } = require('discord.js');
const { cargarMercado, guardarMercado, actualizarPreciosMercado } = require('../marketManager');

// Generador de mini-velas con mejor precisión visual
function generarGraficoASCII(historico) {
  if (!historico || historico.length < 2) return '▅ ▅ ▅ ▅ ▅';
  const min = Math.min(...historico);
  const max = Math.max(...historico);
  const rango = max - min || 1;
  const bloques = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

  return historico.map(val => {
    const indice = Math.floor(((val - min) / rango) * (bloques.length - 1));
    return bloques[Math.max(0, Math.min(bloques.length - 1, indice))];
  }).join('');
}

function construirEmbedTicker() {
  const mercado = cargarMercado();
  let variacionGeneral = 0;
  let conteoActivos = 0;
  let bloquesCampos = [];

  for (const simbolo in mercado.activos) {
    const a = mercado.activos[simbolo];
    const historico = a.historico || [a.precio];
    const precioPrev = historico[historico.length - 2] || a.precio;
    const diff = a.precio - precioPrev;
    const porcentajeNum = parseFloat((((diff) / precioPrev) * 100).toFixed(2));

    variacionGeneral += porcentajeNum;
    conteoActivos++;

    const esPositivo = diff >= 0;
    const flecha = esPositivo ? '🚀' : '📉';
    const signo = esPositivo ? '+' : '';
    const tagColor = esPositivo ? '🟩' : '🟥';
    const grafico = generarGraficoASCII(historico);

    // Formato estilo tarjeta de activo
    const cuerpoActivo = 
      `\`\`\`yaml\n` +
      `Precio   : $${a.precio.toLocaleString()} USD\n` +
      `Variación: ${signo}${porcentajeNum}%\n` +
      `Historial: [ ${grafico} ]\n` +
      `\`\`\``;

    bloquesCampos.push({
      name: `${tagColor} ${a.icono} ${a.nombre} (${simbolo}) ${flecha}`,
      value: cuerpoActivo,
      inline: false
    });
  }

  // Cálculo del sentimiento general del mercado
  const promedioMercado = (variacionGeneral / (conteoActivos || 1)).toFixed(2);
  const mercadoAlcista = promedioMercado >= 0;
  const estadoMercadoTexto = mercadoAlcista 
    ? `🟢 **MERCADO ALCISTA (BULL MARKET)** | Promedio: \`+${promedioMercado}%\`` 
    : `🔴 **MERCADO BAJISTA (BEAR MARKET)** | Promedio: \`${promedioMercado}%\``;

  const embed = new EmbedBuilder()
    .setAuthor({ 
      name: 'TERMINAL DE BOLSAS & CRIPTOMONEDAS EN VIVO', 
      iconURL: 'https://cdn-icons-png.flaticon.com/512/2830/2830284.png' 
    })
    .setTitle('🏛️ MONITOR GLOBAL DE ACTIVOS FINANCIEROS')
    .setColor(mercadoAlcista ? 0x2ECC71 : 0xE74C3C) // Verde si el mercado sube, Rojo si cae
    .setDescription(
      `> ${estadoMercadoTexto}\n\n` +
      `*Los valores sufren fluctuaciones periódicas por oferta y demanda. Consulta el gráfico en tiempo real y gestiona tus inversiones mediante el comando \`/inversion\`.*`
    )
    .addFields(bloquesCampos)
    .setFooter({ text: '🔴 EN VIVO • Actualización cada 5 min • Reserva Federal' })
    .setTimestamp();

  return embed;
}

async function iniciarTickerService(client, channelId) {
  const actualizarMensaje = async () => {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) return;

      actualizarPreciosMercado();
      const embed = construirEmbedTicker();
      const mercado = cargarMercado();

      if (mercado.ultimoCanalId === channelId && mercado.ultimoMensajeId) {
        try {
          const msg = await channel.messages.fetch(mercado.ultimoMensajeId);
          if (msg) {
            await msg.edit({ embeds: [embed] });
            return;
          }
        } catch (e) {
          // El mensaje anterior fue borrado
        }
      }

      const nuevoMsg = await channel.send({ embeds: [embed] });
      mercado.ultimoCanalId = channelId;
      mercado.ultimoMensajeId = nuevoMsg.id;
      guardarMercado(mercado);
    } catch (err) {
      console.error('Error actualizando el ticker del mercado:', err.message);
    }
  };

  await actualizarMensaje();
  setInterval(actualizarMensaje, 5 * 60 * 1000); // Se actualiza cada 5 minutos
}

module.exports = { iniciarTickerService, construirEmbedTicker };