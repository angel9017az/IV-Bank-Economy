// casinoCommands.js
const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const { 
  crearCarta,
  calcularPuntos,
  iniciarPartidaBlackjack,
  validarApuestaBase
} = require('./casinoGames');
const { obtenerCuenta, procesarApuestaCasino } = require('./economyManager');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Control de salas activas por canal y cooldown de usuarios
const salasActivas = new Map();
const cooldownsUsuario = new Map();

// Ajustes Generales
const TIEMPO_LOBBY_SEGUNDOS = 25; 
const TIEMPO_COOLDOWN_SEGUNDOS = 10; 

// ==========================================
// 🧠 ALGORITMO DINÁMICO POR HORA (CAMBIA CADA HORA)
// ==========================================
function obtenerSemillaHora() {
  const fecha = new Date();
  return fecha.getFullYear() * 10000 + (fecha.getMonth() + 1) * 100 + fecha.getDate() + fecha.getHours();
}

// Generador de números pseudo-aleatorios basado en la hora actual
function pseudoRandomHora(semillaExtra = 0) {
  const x = Math.sin(obtenerSemillaHora() + semillaExtra) * 10000;
  return x - Math.floor(x);
}

// Verificador de Cooldown por Usuario
function verificarCooldown(userId) {
  const ahora = Date.now();
  const tiempoEnfriamiento = TIEMPO_COOLDOWN_SEGUNDOS * 1000;
  
  if (cooldownsUsuario.has(userId)) {
    const expiracion = cooldownsUsuario.get(userId) + tiempoEnfriamiento;
    if (ahora < expiracion) {
      const segundosRestantes = ((expiracion - ahora) / 1000).toFixed(1);
      return { activo: true, tiempo: segundosRestantes };
    }
  }
  
  cooldownsUsuario.set(userId, ahora);
  return { activo: false };
}

module.exports = {

  // ==========================================
  // 🏇 1. HIPÓDROMO MULTIJUGADOR VIP
  // ==========================================
  async comandoCaballos(message, args) {
    const channelId = message.channel.id;
    const cd = verificarCooldown(message.author.id);
    if (cd.activo) {
      return message.reply(`⏳ **¡Tómate un respiro!** Debes esperar \`${cd.tiempo}s\` antes de apostar de nuevo.`);
    }

    if (salasActivas.get(channelId)) {
      return message.reply('⚠️ **MESA OCUPADA:** Ya hay una carrera a punto de iniciar en este canal. Únete usando la mesa activa.');
    }

    const cabInit = parseInt(args[0]);
    const apInit = parseInt(args[1]);

    if (isNaN(cabInit) || isNaN(apInit) || cabInit < 1 || cabInit > 4) {
      return message.reply('❌ **USO:** `!caballos <caballo 1-4> <apuesta>` (Ej: `!caballos 2 1000`)');
    }

    const valInit = validarApuestaBase(message.author.id, apInit, 3);
    if (!valInit.exito) return message.reply(valInit.razon);

    salasActivas.set(channelId, true);
    const listaCaballos = [
      { id: 1, nombre: '⚡ Trueno Red' },
      { id: 2, nombre: '🔥 Tornado Gold' },
      { id: 3, nombre: '🚀 Rayo VIP' },
      { id: 4, nombre: '💎 Fortuna Black' }
    ];

    const apuestasMesa = [
      { userId: message.author.id, username: message.author.username, eleccion: cabInit, apuesta: apInit }
    ];

    let tiempoRestante = TIEMPO_LOBBY_SEGUNDOS;

    const renderLobbyEmbed = () => {
      let lista = apuestasMesa.map(a => 
        `│ 👤 ${a.username.padEnd(12, ' ')} ➔ #${a.eleccion} (${listaCaballos[a.eleccion - 1].nombre}) ➔ $${a.apuesta.toLocaleString()} USD`
      ).join('\n');

      return new EmbedBuilder()
        .setTitle('🏛️ 💎 ROYAL HIPÓDROMO VIP 💎 🏛️')
        .setColor(0x1ABC9C)
        .setDescription(
          `\`\`\`text\n` +
          `┌────────────────────────────────────────────────────────┐\n` +
          `│             SALA DE APUESTAS ABIERTA                   │\n` +
          `├────────────────────────────────────────────────────────┤\n` +
          `│ ⏱️ Cierre de apuestas: ${tiempoRestante.toString().padEnd(2, ' ')} Segundos                      │\n` +
          `│ 💰 Pozo Total Acumulado: $${apuestasMesa.reduce((acc, c) => acc + c.apuesta, 0).toLocaleString()} USD\n` +
          `├────────────────────────────────────────────────────────┤\n` +
          `│ JUGADORES REGISTRADOS:                                 │\n` +
          `${lista}\n` +
          `└────────────────────────────────────────────────────────┘\n` +
          `\`\`\``
        )
        .setFooter({ text: '🎰 Presiona el botón para realizar tu apuesta antes de que cierre la mesa' });
    };

    const botonUnirse = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('caballos_unirse').setLabel('🏇 ENTRAMOS Y APOSTAMOS').setStyle(ButtonStyle.Success)
    );

    const mensajeLobby = await message.channel.send({
      embeds: [renderLobbyEmbed()],
      components: [botonUnirse]
    });

    const collector = mensajeLobby.createMessageComponentCollector({ time: tiempoRestante * 1000 });

    collector.on('collect', async interaction => {
      if (interaction.customId === 'caballos_unirse') {
        const cdUser = verificarCooldown(interaction.user.id);
        if (cdUser.activo) {
          return interaction.reply({ content: `⏳ Debes esperar \`${cdUser.tiempo}s\` para volver a interactuar.`, ephemeral: true });
        }

        const modal = new ModalBuilder().setCustomId(`m_cab_${interaction.id}`).setTitle('🎫 Boleta de Apuesta Hipódromo');
        const inputCaballo = new TextInputBuilder().setCustomId('cab').setLabel('Número de Caballo (1 al 4)').setStyle(TextInputStyle.Short).setRequired(true);
        const inputApuesta = new TextInputBuilder().setCustomId('ap').setLabel('Monto a Apostar (USD)').setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(inputCaballo), new ActionRowBuilder().addComponents(inputApuesta));

        await interaction.showModal(modal);

        try {
          const sub = await interaction.awaitModalSubmit({ filter: m => m.customId === `m_cab_${interaction.id}`, time: 14000 });
          await sub.deferReply({ ephemeral: true });

          const cab = parseInt(sub.fields.getTextInputValue('cab'));
          const ap = parseInt(sub.fields.getTextInputValue('ap'));

          if (isNaN(cab) || isNaN(ap) || cab < 1 || cab > 4) {
            return sub.editReply({ content: '❌ Selección inválida. Elige un caballo entre el 1 y el 4.' });
          }

          const val = validarApuestaBase(sub.user.id, ap, 3);
          if (!val.exito) return sub.editReply({ content: val.razon });

          const idx = apuestasMesa.findIndex(a => a.userId === sub.user.id);
          if (idx !== -1) apuestasMesa[idx] = { userId: sub.user.id, username: sub.user.username, eleccion: cab, apuesta: ap };
          else apuestasMesa.push({ userId: sub.user.id, username: sub.user.username, eleccion: cab, apuesta: ap });

          await sub.editReply({ content: `🎟️ **BOLETA REGISTRADA:** Apostaste **$${ap.toLocaleString()} USD** al **Caballo #${cab}**.` });
          await mensajeLobby.edit({ embeds: [renderLobbyEmbed()] }).catch(() => {});
        } catch (e) {}
      }
    });

    const timer = setInterval(() => {
      tiempoRestante -= 4;
      if (tiempoRestante > 0) mensajeLobby.edit({ embeds: [renderLobbyEmbed()] }).catch(() => {});
    }, 4000);

    collector.on('end', async () => {
      clearInterval(timer);
      const posiciones = [0, 0, 0, 0];
      const META = 12;

      const renderPista = () => {
        let txt = '```text\n┌────────────────────────────────────────────────────────┐\n';
        for (let i = 0; i < 4; i++) {
          const carril = `#${i+1} [${'='.repeat(posiciones[i])}🏇${' '.repeat(META - posiciones[i])}🏁]`;
          txt += `│ ${carril.padEnd(54, ' ')} │\n`;
        }
        txt += '└────────────────────────────────────────────────────────┘\n```';
        return txt;
      };

      let ganadorId = null;
      await mensajeLobby.edit({ 
        embeds: [new EmbedBuilder().setTitle('🏁 **¡LA CARRERA HA COMENZADO!** 🏁').setColor(0xE67E22).setDescription(renderPista())], 
        components: [] 
      });

      while (!ganadorId) {
        await delay(1200);
        for (let i = 0; i < 4; i++) {
          posiciones[i] = Math.min(META, posiciones[i] + Math.floor(Math.random() * 3));
          if (posiciones[i] >= META && !ganadorId) ganadorId = i + 1;
        }
        await mensajeLobby.edit({ 
          embeds: [new EmbedBuilder().setTitle(ganadorId ? '🏆 **¡TENEMOS UN GANADOR!**' : '🏇 **¡CARRERA EN CURSO!**').setColor(ganadorId ? 0xF1C40F : 0xE67E22).setDescription(renderPista())] 
        });
      }

      let reporte = '';
      for (const j of apuestasMesa) {
        const gano = j.eleccion === ganadorId;
        const premio = gano ? j.apuesta * 3 : 0;
        procesarApuestaCasino(j.userId, j.apuesta, premio);
        reporte += gano ? `✅ <@${j.userId}> ➔ Ganó **+$${(premio - j.apuesta).toLocaleString()} USD**\n` : `❌ <@${j.userId}> ➔ Perdió **-$${j.apuesta.toLocaleString()} USD**\n`;
      }

      salasActivas.delete(channelId);
      return mensajeLobby.edit({ 
        embeds: [
          new EmbedBuilder()
            .setTitle(`🏆 CABALLO #${ganadorId} ${listaCaballos[ganadorId-1].nombre.toUpperCase()} CRUZA LA META`)
            .setColor(0x2ECC71)
            .setDescription(`### 📊 **RESULTADOS DE LA CARRERA**\n${reporte}`)
        ] 
      });
    });
  },

  // ==========================================
  // 🎲 2. RULETA VIP (CON ALGORITMO POR HORA)
  // ==========================================
  async comandoRuleta(message, args) {
    const channelId = message.channel.id;
    const cd = verificarCooldown(message.author.id);
    if (cd.activo) {
      return message.reply(`⏳ **¡Tranquilo apostador!** Aguarda \`${cd.tiempo}s\` antes de tirar la bola de nuevo.`);
    }

    if (salasActivas.get(channelId)) return message.reply('⚠️ **MESA OCUPADA:** Hay una bola a punto de girar en este canal.');

    const selInit = args[0]?.toLowerCase();
    const apInit = parseInt(args[1]);
    if (!selInit || isNaN(apInit) || apInit <= 0) return message.reply('❌ **USO:** `!ruleta <rojo|negro|0-36> <apuesta>`');

    const multInit = !isNaN(parseInt(selInit)) ? 36 : 2;
    const valInit = validarApuestaBase(message.author.id, apInit, multInit);
    if (!valInit.exito) return message.reply(valInit.razon);

    salasActivas.set(channelId, true);
    const apuestasMesa = [{ userId: message.author.id, username: message.author.username, eleccion: selInit, apuesta: apInit }];
    let tiempoRestante = TIEMPO_LOBBY_SEGUNDOS;

    const renderLobbyEmbed = () => {
      const resumen = apuestasMesa.map(a => 
        `│ 👤 ${a.username.padEnd(12, ' ')} ➔ APUESTAS EN [ ${a.eleccion.toUpperCase()} ] ➔ $${a.apuesta.toLocaleString()} USD`
      ).join('\n');

      return new EmbedBuilder()
        .setTitle('🎰 💎 CASINO GRAND RULETA VIP 💎 🎰')
        .setColor(0x9B59B6)
        .setDescription(
          `\`\`\`text\n` +
          `┌────────────────────────────────────────────────────────┐\n` +
          `│             MESA ABIERTA PARA APUESTAS                 │\n` +
          `├────────────────────────────────────────────────────────┤\n` +
          `│ ⏱️ Tiempo para girar bola: ${tiempoRestante.toString().padEnd(2, ' ')} Segundos              │\n` +
          `│ 🔄 Patrón de Horario: ALGORITMO DINÁMICO ACTIVO        │\n` +
          `├────────────────────────────────────────────────────────┤\n` +
          `│ APUESTAS SOBRE LA MESA:                                │\n` +
          `${resumen}\n` +
          `└────────────────────────────────────────────────────────┘\n` +
          `\`\`\``
        );
    };

    const botonUnirse = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ruleta_unirse').setLabel('🎲 PONER APUESTA EN LA MESA').setStyle(ButtonStyle.Primary)
    );

    const mensajeLobby = await message.channel.send({ embeds: [renderLobbyEmbed()], components: [botonUnirse] });
    const collector = mensajeLobby.createMessageComponentCollector({ time: tiempoRestante * 1000 });

    collector.on('collect', async interaction => {
      if (interaction.customId === 'ruleta_unirse') {
        const cdUser = verificarCooldown(interaction.user.id);
        if (cdUser.activo) {
          return interaction.reply({ content: `⏳ Espera \`${cdUser.tiempo}s\` para volver a jugar.`, ephemeral: true });
        }

        const modal = new ModalBuilder().setCustomId(`m_rul_${interaction.id}`).setTitle('🎰 Apuesta de Ruleta VIP');
        const inputCasilla = new TextInputBuilder().setCustomId('casilla').setLabel('Elección (rojo, negro o número 0-36)').setStyle(TextInputStyle.Short).setRequired(true);
        const inputApuesta = new TextInputBuilder().setCustomId('ap').setLabel('Monto a Apostar (USD)').setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(inputCasilla), new ActionRowBuilder().addComponents(inputApuesta));

        await interaction.showModal(modal);

        try {
          const sub = await interaction.awaitModalSubmit({ filter: m => m.customId === `m_rul_${interaction.id}`, time: 14000 });
          await sub.deferReply({ ephemeral: true });

          const sel = sub.fields.getTextInputValue('casilla').toLowerCase();
          const ap = parseInt(sub.fields.getTextInputValue('ap'));

          const esNum = !isNaN(parseInt(sel));
          if (!esNum && !['rojo', 'negro'].includes(sel)) return sub.editReply({ content: '❌ Debes elegir entre: rojo, negro o un número (0 al 36).' });
          if (esNum && (parseInt(sel) < 0 || parseInt(sel) > 36)) return sub.editReply({ content: '❌ Casilla fuera de límite (0 al 36).' });

          const val = validarApuestaBase(sub.user.id, ap, esNum ? 36 : 2);
          if (!val.exito) return sub.editReply({ content: val.razon });

          const idx = apuestasMesa.findIndex(a => a.userId === sub.user.id);
          if (idx !== -1) apuestasMesa[idx] = { userId: sub.user.id, username: sub.user.username, eleccion: sel, apuesta: ap };
          else apuestasMesa.push({ userId: sub.user.id, username: sub.user.username, eleccion: sel, apuesta: ap });

          await sub.editReply({ content: `✅ **APUESTA ACEPTADA:** **[ ${sel.toUpperCase()} ]** por **$${ap.toLocaleString()} USD**.` });
          await mensajeLobby.edit({ embeds: [renderLobbyEmbed()] }).catch(() => {});
        } catch (e) {}
      }
    });

    const timer = setInterval(() => {
      tiempoRestante -= 4;
      if (tiempoRestante > 0) mensajeLobby.edit({ embeds: [renderLobbyEmbed()] }).catch(() => {});
    }, 4000);

    collector.on('end', async () => {
      clearInterval(timer);
      await mensajeLobby.edit({ 
        embeds: [
          new EmbedBuilder()
            .setTitle('🎲 **¡NO VA MÁS! LA BOLA ESTÁ EN LA RUEDA...**')
            .setColor(0x9B59B6)
            .setDescription('```text\n[ 🔴 1 | ⚫ 20 | 🔴 14 | 🟢 0 | ⚫ 31 | 🔴 9 | ⚫ 22 ]\n               ▲ (GIRANDO...)\n```')
        ], 
        components: [] 
      });

      await delay(3000);

      // Algoritmo por hora: La semilla cambia exactamente cada 60 minutos
      const factorSemilla = pseudoRandomHora(Date.now() % 1000);
      const numeroCaido = Math.floor(factorSemilla * 37);

      const esRojo = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(numeroCaido);
      const colorCaido = numeroCaido === 0 ? 'verde' : (esRojo ? 'rojo' : 'negro');

      let reporte = '';
      for (const j of apuestasMesa) {
        let gano = false;
        let premio = 0;
        const esNum = !isNaN(parseInt(j.eleccion));

        if (!esNum && j.eleccion === colorCaido) { gano = true; premio = j.apuesta * 2; }
        else if (esNum && parseInt(j.eleccion) === numeroCaido) { gano = true; premio = j.apuesta * 36; }

        procesarApuestaCasino(j.userId, j.apuesta, premio);
        reporte += gano ? `✅ <@${j.userId}> ➔ Ganó **+$${(premio - j.apuesta).toLocaleString()} USD**\n` : `❌ <@${j.userId}> ➔ Perdió **-$${j.apuesta.toLocaleString()} USD**\n`;
      }

      const tagColor = colorCaido === 'rojo' ? '🔴 ROJO' : (colorCaido === 'negro' ? '⚫ NEGRO' : '🟢 VERDE');
      salasActivas.delete(channelId);

      return mensajeLobby.edit({ 
        embeds: [
          new EmbedBuilder()
            .setTitle(`🎯 RESULTADO FINAL: ${numeroCaido} [ ${tagColor} ]`)
            .setColor(0x2ECC71)
            .setDescription(
              `\`\`\`text\n` +
              `│ LA BOLA CAYÓ EN EL CASILLERO: [ ${numeroCaido} -${tagColor} ]\n` +
              `└────────────────────────────────────────────────────────┘\n` +
              `\`\`\`\n` +
              `### 📊 **PAGOS DE LA MESA**\n${reporte}`
            )
        ] 
      });
    });
  },

  // ==========================================
  // 🎰 3. SLOTS VIP (CON ALGORITMO POR HORA)
  // ==========================================
  async comandoSlots(message, args) {
    const channelId = message.channel.id;
    const cd = verificarCooldown(message.author.id);
    if (cd.activo) {
      return message.reply(`⏳ **¡Palanca trabada!** Debes esperar \`${cd.tiempo}s\` antes de tirar los rodillos otra vez.`);
    }

    if (salasActivas.get(channelId)) return message.reply('⚠️ **MESA OCUPADA:** Hay una tirada en proceso en este canal.');

    const apInit = parseInt(args[0]);
    if (isNaN(apInit) || apInit <= 0) return message.reply('❌ **USO:** `!slots <apuesta>` (Ej: `!slots 200`)');

    const valInit = validarApuestaBase(message.author.id, apInit, 10);
    if (!valInit.exito) return message.reply(valInit.razon);

    salasActivas.set(channelId, true);
    const apuestasMesa = [{ userId: message.author.id, username: message.author.username, apuesta: apInit }];
    let tiempoRestante = TIEMPO_LOBBY_SEGUNDOS;

    const renderLobbyEmbed = () => {
      const resumen = apuestasMesa.map(a => `│ 👤 ${a.username.padEnd(12, ' ')} ➔ APUESTA: $${a.apuesta.toLocaleString()} USD`).join('\n');
      return new EmbedBuilder()
        .setTitle('🎰 💎 TRAGAMONEDAS GOLDEN JACKPOT 💎 🎰')
        .setColor(0xF1C40F)
        .setDescription(
          `\`\`\`text\n` +
          `┌────────────────────────────────────────────────────────┐\n` +
          `│           TIRADA MULTIJUGADOR EN PREPARACIÓN           │\n` +
          `├────────────────────────────────────────────────────────┤\n` +
          `│ ⏱️ Tiempo para accionar palanca: ${tiempoRestante.toString().padEnd(2, ' ')} Segundos         │\n` +
          `│ 🔄 Patrón de Horario: ALGORITMO DINÁMICO ACTIVO        │\n` +
          `├────────────────────────────────────────────────────────┤\n` +
          `│ JUGADORES UNIDOS A LA TIRADA:                          │\n` +
          `${resumen}\n` +
          `└────────────────────────────────────────────────────────┘\n` +
          `\`\`\``
        );
    };

    const botonUnirse = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('slots_unirse').setLabel('🎰 UNIRSE A LA MÁQUINA').setStyle(ButtonStyle.Success)
    );

    const mensajeLobby = await message.channel.send({ embeds: [renderLobbyEmbed()], components: [botonUnirse] });
    const collector = mensajeLobby.createMessageComponentCollector({ time: tiempoRestante * 1000 });

    collector.on('collect', async interaction => {
      if (interaction.customId === 'slots_unirse') {
        const cdUser = verificarCooldown(interaction.user.id);
        if (cdUser.activo) {
          return interaction.reply({ content: `⏳ Aguarda \`${cdUser.tiempo}s\` para volver a ingresar.`, ephemeral: true });
        }

        const modal = new ModalBuilder().setCustomId(`m_slo_${interaction.id}`).setTitle('🎰 Apuesta Tragamonedas');
        const inputApuesta = new TextInputBuilder().setCustomId('ap').setLabel('Monto a Apostar (USD)').setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(inputApuesta));

        await interaction.showModal(modal);

        try {
          const sub = await interaction.awaitModalSubmit({ filter: m => m.customId === `m_slo_${interaction.id}`, time: 14000 });
          await sub.deferReply({ ephemeral: true });

          const ap = parseInt(sub.fields.getTextInputValue('ap'));

          const val = validarApuestaBase(sub.user.id, ap, 10);
          if (!val.exito) return sub.editReply({ content: val.razon });

          const idx = apuestasMesa.findIndex(a => a.userId === sub.user.id);
          if (idx !== -1) apuestasMesa[idx] = { userId: sub.user.id, username: sub.user.username, apuesta: ap };
          else apuestasMesa.push({ userId: sub.user.id, username: sub.user.username, apuesta: ap });

          await sub.editReply({ content: `✅ **EN MÁQUINA:** Apostaste **$${ap.toLocaleString()} USD**.` });
          await mensajeLobby.edit({ embeds: [renderLobbyEmbed()] }).catch(() => {});
        } catch (e) {}
      }
    });

    const timer = setInterval(() => {
      tiempoRestante -= 4;
      if (tiempoRestante > 0) mensajeLobby.edit({ embeds: [renderLobbyEmbed()] }).catch(() => {});
    }, 4000);

    collector.on('end', async () => {
      clearInterval(timer);
      const iconos = ['🍇', '🍋', '🍒', '🔔', '💎', '7️⃣'];

      // Rodillos influenciados por el Algoritmo Horario
      const r1 = iconos[Math.floor(pseudoRandomHora(1) * iconos.length)];
      const r2 = iconos[Math.floor(pseudoRandomHora(2) * iconos.length)];
      const r3 = iconos[Math.floor(pseudoRandomHora(3) * iconos.length)];

      await mensajeLobby.edit({ embeds: [new EmbedBuilder().setTitle('🎰 **¡JALANDO PALANCA!**').setColor(0xF1C40F).setDescription('```text\n╔═════════════════════╗\n║  [ 🌀 ] [ 🌀 ] [ 🌀 ]  ║\n╚═════════════════════╝\n```')], components: [] });
      await delay(1000);
      await mensajeLobby.edit({ embeds: [new EmbedBuilder().setTitle('🎰 **RODILLO 1 DETENIDO**').setColor(0xF1C40F).setDescription(`\`\`\`text\n╔═════════════════════╗\n║  [ ${r1} ] [ 🌀 ] [ 🌀 ]  ║\n╚═════════════════════╝\n\`\`\``)] });
      await delay(1000);
      await mensajeLobby.edit({ embeds: [new EmbedBuilder().setTitle('🎰 **RODILLO 2 DETENIDO**').setColor(0xF1C40F).setDescription(`\`\`\`text\n╔═════════════════════╗\n║  [ ${r1} ] [ ${r2} ] [ 🌀 ]  ║\n╚═════════════════════╝\n\`\`\``)] });
      await delay(1000);

      let reporte = '';
      for (const j of apuestasMesa) {
        let premio = 0;
        let gano = false;

        if (r1 === r2 && r2 === r3) { gano = true; premio = r1 === '7️⃣' ? j.apuesta * 10 : j.apuesta * 5; }
        else if (r1 === r2 || r1 === r3 || r2 === r3) { gano = true; premio = Math.floor(j.apuesta * 1.5); }

        procesarApuestaCasino(j.userId, j.apuesta, premio);
        reporte += gano ? `✅ <@${j.userId}> ➔ Ganó **+$${(premio - j.apuesta).toLocaleString()} USD**\n` : `❌ <@${j.userId}> ➔ Perdió **-$${j.apuesta.toLocaleString()} USD**\n`;
      }

      salasActivas.delete(channelId);
      return mensajeLobby.edit({ 
        embeds: [
          new EmbedBuilder()
            .setTitle('🎰 COMBINACIÓN FINAL DE MÁQUINA')
            .setColor(0x2ECC71)
            .setDescription(
              `\`\`\`text\n` +
              `╔═════════════════════╗\n` +
              `║  [ ${r1} ] [ ${r2} ] [ ${r3} ]  ║\n` +
              `╚═════════════════════╝\n` +
              `\`\`\`\n` +
              `### 📊 **PREMIACIÓN**\n${reporte}`
            )
        ] 
      });
    });
  },

  // ==========================================
  // 🃏 4. BLACKJACK VIP (MESA DE ALTAS APUESTAS)
  // ==========================================
  async comandoBlackjack(message, args) {
    const channelId = message.channel.id;
    const cd = verificarCooldown(message.author.id);
    if (cd.activo) {
      return message.reply(`⏳ **¡Descansa las manos!** Aguarda \`${cd.tiempo}s\` antes de pedir otra mesa de Blackjack.`);
    }

    if (salasActivas.get(channelId)) return message.reply('⚠️ **MESA OCUPADA:** Hay una mesa de Blackjack armándose en este canal.');

    const apInit = parseInt(args[0]);
    if (isNaN(apInit) || apInit <= 0) return message.reply('❌ **USO:** `!bj <apuesta>` (Ej: `!bj 500`)');

    const estadoInicial = iniciarPartidaBlackjack(message.author.id, apInit);
    if (!estadoInicial.exito) return message.reply(estadoInicial.razon);

    salasActivas.set(channelId, true);
    const apostadores = [{ userId: message.author.id, username: message.author.username, apuesta: apInit }];
    let tiempoRestante = TIEMPO_LOBBY_SEGUNDOS;

    const renderLobbyEmbed = () => {
      const resumen = apostadores.map(a => `│ 👤 ${a.username.padEnd(12, ' ')} ➔ FICHA DE $${a.apuesta.toLocaleString()} USD`).join('\n');
      return new EmbedBuilder()
        .setTitle('🃏 💎 MESA VIP BLACKJACK 21 💎 🃏')
        .setColor(0x1F8B4D)
        .setDescription(
          `\`\`\`text\n` +
          `┌────────────────────────────────────────────────────────┐\n` +
          `│           MESA ABIERTA PARA NUEVOS JUGADORES           │\n` +
          `├────────────────────────────────────────────────────────┤\n` +
          `│ ⏱️ Reparto de cartas en: ${tiempoRestante.toString().padEnd(2, ' ')} Segundos               │\n` +
          `├────────────────────────────────────────────────────────┤\n` +
          `│ JUGADORES SENTADOS:                                    │\n` +
          `${resumen}\n` +
          `└────────────────────────────────────────────────────────┘\n` +
          `\`\`\``
        );
    };

    const botonUnirse = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('bj_unirse').setLabel('🃏 SENTARSE EN LA MESA').setStyle(ButtonStyle.Success)
    );

    const mensajeLobby = await message.channel.send({ embeds: [renderLobbyEmbed()], components: [botonUnirse] });
    const collector = mensajeLobby.createMessageComponentCollector({ time: tiempoRestante * 1000 });

    collector.on('collect', async interaction => {
      if (interaction.customId === 'bj_unirse') {
        const cdUser = verificarCooldown(interaction.user.id);
        if (cdUser.activo) {
          return interaction.reply({ content: `⏳ Espera \`${cdUser.tiempo}s\` antes de tomar un asiento.`, ephemeral: true });
        }

        const modal = new ModalBuilder().setCustomId(`m_bj_${interaction.id}`).setTitle('🃏 Asiento Blackjack VIP');
        const inputApuesta = new TextInputBuilder().setCustomId('ap').setLabel('Monto a Apostar (USD)').setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(inputApuesta));

        await interaction.showModal(modal);

        try {
          const sub = await interaction.awaitModalSubmit({ filter: m => m.customId === `m_bj_${interaction.id}`, time: 14000 });
          await sub.deferReply({ ephemeral: true });

          const ap = parseInt(sub.fields.getTextInputValue('ap'));

          const estado = iniciarPartidaBlackjack(sub.user.id, ap);
          if (!estado.exito) return sub.editReply({ content: estado.razon });

          const idx = apostadores.findIndex(a => a.userId === sub.user.id);
          if (idx !== -1) apostadores[idx] = { userId: sub.user.id, username: sub.user.username, apuesta: ap };
          else apostadores.push({ userId: sub.user.id, username: sub.user.username, apuesta: ap });

          await sub.editReply({ content: `✅ **ASIENTO ASIGNADO:** Entraste a la mesa con **$${ap.toLocaleString()} USD**.` });
          await mensajeLobby.edit({ embeds: [renderLobbyEmbed()] }).catch(() => {});
        } catch (e) {}
      }
    });

    const timer = setInterval(() => {
      tiempoRestante -= 4;
      if (tiempoRestante > 0) mensajeLobby.edit({ embeds: [renderLobbyEmbed()] }).catch(() => {});
    }, 4000);

    collector.on('end', async () => {
      clearInterval(timer);
      salasActivas.delete(channelId);
      await mensajeLobby.edit({ embeds: [new EmbedBuilder().setTitle('🃏 **MESA CERRADA • EL CRUPIER REPARTE LAS CARTAS**').setColor(0x1F8B4D)], components: [] });

      for (const j of apostadores) {
        let manoJugador = [crearCarta(), crearCarta()];
        let manoCrupier = [crearCarta(), crearCarta()];

        const formatoMano = (mano) => mano.map(c => `[\`${c.valor}${c.palo}\`]`).join(' ');

        const botones = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('pedir').setLabel('🃏 PEDIR CARTA').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('plantar').setLabel('🛑 PLANTARSE').setStyle(ButtonStyle.Success)
        );

        const embedTurno = new EmbedBuilder()
          .setTitle(`🃏 Turno Individual: ${j.username}`)
          .setColor(0x1F8B4D)
          .setDescription(
            `\`\`\`text\n` +
            `┌────────────────────────────────────────────────────────┐\n` +
            `│ APUESTA REGISTRADA: $${j.apuesta.toLocaleString()} USD\n` +
            `├────────────────────────────────────────────────────────┤\n` +
            `│ TU MANO:    ${manoJugador.map(c=> c.valor+c.palo).join(' ')} (${calcularPuntos(manoJugador)} Puntos)\n` +
            `│ CRUPIER:    ${manoCrupier[0].valor}${manoCrupier[0].palo} [🂠 ?]\n` +
            `└────────────────────────────────────────────────────────┘\n` +
            `\`\`\``
          );

        const msgTurno = await message.channel.send({ content: `<@${j.userId}>, ¡es tu turno en la mesa!`, embeds: [embedTurno], components: [botones] });

        const collectorJugador = msgTurno.createMessageComponentCollector({ filter: i => i.user.id === j.userId, time: 30000 });

        await new Promise((resolve) => {
          collectorJugador.on('collect', async interaction => {
            await interaction.deferUpdate();
            if (interaction.customId === 'pedir') {
              manoJugador.push(crearCarta());
              const pts = calcularPuntos(manoJugador);
              if (pts >= 21) {
                collectorJugador.stop();
              } else {
                await msgTurno.edit({ 
                  embeds: [
                    new EmbedBuilder()
                      .setTitle(`🃏 Turno Individual: ${j.username}`)
                      .setColor(0x1F8B4D)
                      .setDescription(
                        `\`\`\`text\n` +
                        `┌────────────────────────────────────────────────────────┐\n` +
                        `│ APUESTA REGISTRADA: $${j.apuesta.toLocaleString()} USD\n` +
                        `├────────────────────────────────────────────────────────┤\n` +
                        `│ TU MANO:    ${manoJugador.map(c=> c.valor+c.palo).join(' ')} (${pts} Puntos)\n` +
                        `│ CRUPIER:    ${manoCrupier[0].valor}${manoCrupier[0].palo} [🂠 ?]\n` +
                        `└────────────────────────────────────────────────────────┘\n` +
                        `\`\`\``
                      )
                  ] 
                });
              }
            } else if (interaction.customId === 'plantar') {
              collectorJugador.stop();
            }
          });

          collectorJugador.on('end', () => resolve());
        });

        let ptsJugador = calcularPuntos(manoJugador);
        let ptsCrupier = calcularPuntos(manoCrupier);

        if (ptsJugador <= 21) {
          while (ptsCrupier < 17) {
            manoCrupier.push(crearCarta());
            ptsCrupier = calcularPuntos(manoCrupier);
          }
        }

        let premio = 0;
        let resultadoText = '';

        if (ptsJugador > 21) {
          resultadoText = '💥 TE PASASTE DE 21 (CASA GANA)';
        } else if (ptsCrupier > 21 || ptsJugador > ptsCrupier) {
          premio = j.apuesta * 2;
          resultadoText = `🎉 VICTORIA VIP (${ptsJugador} vs ${ptsCrupier})`;
        } else if (ptsJugador === ptsCrupier) {
          premio = j.apuesta;
          resultadoText = `🤝 EMPATE TÉCNICO (${ptsJugador} vs ${ptsCrupier})`;
        } else {
          resultadoText = `📉 CRUPIER GANA (${ptsCrupier} vs ${ptsJugador})`;
        }

        procesarApuestaCasino(j.userId, j.apuesta, premio);

        const embedFinal = new EmbedBuilder()
          .setTitle(`🏆 DICTAMEN FINAL: ${j.username}`)
          .setColor(premio > j.apuesta ? 0x2ECC71 : (premio === j.apuesta ? 0xE67E22 : 0xE74C3C))
          .setDescription(
            `\`\`\`text\n` +
            `┌────────────────────────────────────────────────────────┐\n` +
            `│ DICTAMEN: ${resultadoText}\n` +
            `├────────────────────────────────────────────────────────┤\n` +
            `│ TU MANO FINAL:   ${formatoMano(manoJugador)} (${ptsJugador} Pts)\n` +
            `│ CRUPIER FINAL:   ${formatoMano(manoCrupier)} (${ptsCrupier} Pts)\n` +
            `└────────────────────────────────────────────────────────┘\n` +
            `\`\`\``
          );

        await msgTurno.edit({ content: ' ', embeds: [embedFinal], components: [] });
      }
    });
  }
};