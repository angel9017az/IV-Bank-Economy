require('dotenv').config();
const { 
  Client, 
  GatewayIntentBits, 
  ActivityType, 
  Collection, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
const { obtenerCuenta, actualizarSaldo } = require('./economyManager');
const { iniciarTickerService } = require('./services/marketTicker');
const casino = require('./casinoCommands');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Colección para almacenar los Slash Commands cargados
client.commands = new Collection();
const PREFIX = '!';

// ==========================================
// FUNCIÓN DEL COMANDO !SETUP-ECONOMIA / !HELPECO (INTERACTIVA)
// ==========================================
async function comandoSetupEconomia(message) {
  // Embed Principal (Central)
  const embedCentral = new EmbedBuilder()
    .setAuthor({ 
      name: 'CENTRAL FINANCIAL SYSTEM', 
      iconURL: 'https://cdn-icons-png.flaticon.com/512/2830/2830284.png' 
    })
    .setTitle('🏛️ Panel de Control & Guía de Economía')
    .setColor(0x00F0FF)
    .setDescription(
      `Bienvenido al sistema financiero del servidor. A continuación tienes la lista completa de comandos operativos disponibles tanto en **Slash Commands (/)** como mediante **Prefijo (!)**.\n\n` +
      `--------------------------------------------------`
    )
    .addFields(
      {
        name: '💳 **Gestión de Cuentas y Saldo**',
        value: '• `/dinero` — Consulta tu efectivo, banco, tarjeta y patrimonio neto.\n' +
               '• `/depositar <monto>` — Ingresa tu efectivo a la cuenta bancaria.\n' +
               '• `/retirar <monto>` — Retira dinero del banco a tu billetera.',
        inline: false
      },
      {
        name: '📈 **Bolsa & Criptomonedas**',
        value: '• `/inversion` — Abre la terminal de trading para comprar/vender activos.\n' +
               '• El canal oficial actualiza el gráfico de velas en vivo cada 5 minutos.',
        inline: false
      },
      {
        name: '🏛️ **Banco Central & Créditos**',
        value: '• `/banco reserva` — Consulta la liquidez actual de la bóveda central.\n' +
               '• `/prestamo solicitar <monto>` — Pide un crédito según tu Score Crediticio.\n' +
               '• `/prestamo pagar` — Liquida tu deuda activa para subir tu Score.',
        inline: false
      },
      {
        name: '🎰 **Juegos & Apuestas (Prefijo !)**',
        value: '• `!casino` — Muestra el reglamento y comandos del casino.\n' +
               '• `!bj <monto>` — Apuesta en el Blackjack tradicional.\n' +
               '• `!slots <monto>` — Gira la máquina tragamonedas.\n' +
               '• `!ruleta <rojo|negro|0-36> <monto>` — Apuesta a la ruleta.\n' +
               '• `!caballos <1-4> <monto>` — Apuesta en el hipódromo.',
        inline: false
      },
      {
        name: '🛒 **Mercado & Riesgo**',
        value: '• `/tienda` — Tramita tarjetas (Gold, Black, Obsidian) y licencias.\n' +
               '• `/robar <usuario>` — Intenta robar efectivo a otro jugador (Riesgo de multa).',
        inline: false
      }
    )
    .setFooter({ text: 'Sistema Financiero • Presiona los botones inferiores para accesos rápidos' })
    .setTimestamp();

  // Embed del Reglamento
  const embedReglamento = new EmbedBuilder()
    .setAuthor({ 
      name: 'CENTRAL FINANCIAL SYSTEM', 
      iconURL: 'https://cdn-icons-png.flaticon.com/512/2830/2830284.png' 
    })
    .setTitle('📜 Reglamento Oficial del Casino & Sistema Financiero')
    .setColor(0xFF9900)
    .setDescription(
      `Para garantizar un juego justo y una economía saludable en el servidor, lee atentamente las normas operativas:\n\n` +
      `--------------------------------------------------`
    )
    .addFields(
      {
        name: '1. 🎰 **Juegos de Casino y Apuestas**',
        value: '• Está prohibido el uso de bots o scripts para automatizar las apuestas.\n' +
               '• Las pérdidas en juegos de azar no son reembolsables por la administración.\n' +
               '• Si la cuenta queda en bancarrota, puedes solicitar créditos bancarios.',
        inline: false
      },
      {
        name: '2. 🏦 **Banco Central y Créditos**',
        value: '• El impago de préstamos reducirá tu Score Crediticio y bloqueará compras de tarjetas VIP.\n' +
               '• Los intereses de deudas vencidas se aplicarán automáticamente cada ciclo.',
        inline: false
      },
      {
        name: '3. 📈 **Mercado e Inversiones**',
        value: '• La manipulación maliciosa de precios o exploit del mercado derivará en el congelamiento de fondos.',
        inline: false
      }
    )
    .setFooter({ text: 'Sistema Financiero • Selecciona volver para regresar a la terminal principal' })
    .setTimestamp();

  // Botones de Navegación Iniciales
  const botonesInicio = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_reglamento')
      .setLabel('📜 Reglamento Casino')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('btn_ver_reserva')
      .setLabel('🏛️ Ver Banco Central')
      .setStyle(ButtonStyle.Secondary)
  );

  // Botón para volver al menú principal
  const botonesVolver = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_volver_central')
      .setLabel('⬅️ Volver al Menú Central')
      .setStyle(ButtonStyle.Success)
  );

  // Enviar mensaje e iniciar recolección de interacciones
  const msg = await message.channel.send({
    embeds: [embedCentral],
    components: [botonesInicio]
  });

  // Colector activo por 45 segundos por inactividad
  const collector = msg.createMessageComponentCollector({
    idle: 45000
  });

  collector.on('collect', async i => {
    // Permitir solo al usuario que ejecutó el comando interactuar
    if (i.user.id !== message.author.id) {
      return i.reply({ content: '❌ Solo quien ejecutó el comando puede usar estos botones.', flags: 64 });
    }

    if (i.customId === 'btn_reglamento') {
      await i.update({
        embeds: [embedReglamento],
        components: [botonesVolver]
      });
    } else if (i.customId === 'btn_volver_central') {
      await i.update({
        embeds: [embedCentral],
        components: [botonesInicio]
      });
    } else if (i.customId === 'btn_ver_reserva') {
      await i.reply({ content: '🏛️ Puedes consultar la reserva del Banco Central ejecutando `/banco reserva`.', flags: 64 });
    }
  });

  // Cuando expiran los 45s de inactividad, se restaura al Embed Central automáticamente
  collector.on('end', async () => {
    try {
      await msg.edit({
        embeds: [embedCentral],
        components: [botonesInicio]
      });
    } catch (e) {
      // El mensaje fue eliminado
    }
  });
}

// 1. CARGA AUTOMÁTICA DE SLASH COMMANDS DE LA CARPETA /commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    // Validar estructura de Slash Command (data y execute)
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`📦 Slash Command cargado: /${command.data.name}`);
    }
  }
}

// 2. MANEJADOR DE INTERACCIONES (SLASH COMMANDS)
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error al ejecutar el comando /${interaction.commandName}:`, error);
    const replyOptions = { content: '❌ Hubo un error al ejecutar este comando.', flags: 64 };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(replyOptions);
    } else {
      await interaction.reply(replyOptions);
    }
  }
});

// 3. MANEJADOR DE COMANDOS LEGACY CON PREFIJO (!) Y CASINO
client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Comando de Guía/Setup de Economía
  if (command === 'setup-economia' || command === 'helpeco') {
    return await comandoSetupEconomia(message);
  }

  // Comandos de Casino
  if (command === 'casino' || command === 'casinogui') return await casino.comandoGuiaCasino(message);
  if (command === 'bj' || command === 'blackjack') return await casino.comandoBlackjack(message, args);
  if (command === 'caballos' || command === 'carrera') return await casino.comandoCaballos(message, args);
  if (command === 'ruleta') return await casino.comandoRuleta(message, args);
  if (command === 'slots' || command === 'tragamonedas') return await casino.comandoSlots(message, args);
});

client.once('clientReady', async () => {
  console.log(`🏦 Bot de Economía activo como: ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: '🎰 Casino VIP | !setup-economia', type: ActivityType.Playing }],
    status: 'online',
  });

  if (process.env.CANAL_TICKER_ID) {
    await iniciarTickerService(client, process.env.CANAL_TICKER_ID);
  }
});

// 4. API HTTP DE TRANSACCIONES ROBLOX
const app = express();
app.use(express.json());

app.post('/api/roblox/economia/transaccion', (req, res) => {
  const { discordId, monto, tipo } = req.body;
  if (!discordId || monto === undefined) return res.status(400).json({ error: 'Faltan parámetros.' });
  
  if (tipo === 'banco') actualizarSaldo(discordId, 0, monto);
  else actualizarSaldo(discordId, monto, 0);

  return res.status(200).json({ status: 'Éxito', cuenta: obtenerCuenta(discordId) });
});

app.listen(process.env.PORT_ECONOMIA || 3000, () => {
  console.log(`🌐 API Economía en puerto ${process.env.PORT_ECONOMIA || 3000}`);
});

client.login(process.env.DISCORD_TOKEN_ECONOMIA);