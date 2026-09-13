// commands/banco.js
const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  PermissionFlagsBits, 
  MessageFlags 
} = require('discord.js');
const { 
  obtenerCuenta, 
  depositar, 
  retirar, 
  solicitarPrestamo, 
  pagarPrestamo, 
  ajustarReservaBanco, 
  ID_BOT_BANCO,
  TARJETAS 
} = require('../economyManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banco')
    .setDescription('Sistema financiero y operaciones del Banco Central')
    // Subcomando: Ver estado de las reservas del Banco
    .addSubcommand(sub =>
      sub.setName('reserva')
         .setDescription('Muestra el estado financiero y la liquidez disponible del Banco Central')
    )
    // Subcomando: Depositar
    .addSubcommand(sub =>
      sub.setName('depositar')
         .setDescription('Deposita dinero en efectivo a tu cuenta bancaria')
         .addIntegerOption(opt => opt.setName('monto').setDescription('Cantidad en efectivo a depositar').setRequired(true))
    )
    // Subcomando: Retirar
    .addSubcommand(sub =>
      sub.setName('retirar')
         .setDescription('Retira saldo de tu cuenta bancaria a efectivo')
         .addIntegerOption(opt => opt.setName('monto').setDescription('Cantidad a retirar').setRequired(true))
    )
    // Subcomando: Solicitar Préstamo
    .addSubcommand(sub =>
      sub.setName('prestamo')
         .setDescription('Solicita un crédito financiero al Banco Central')
         .addIntegerOption(opt => opt.setName('monto').setDescription('Monto del préstamo solicitado').setRequired(true))
    )
    // Subcomando: Pagar Préstamo
    .addSubcommand(sub =>
      sub.setName('pagar_prestamo')
         .setDescription('Paga el total de tu crédito bancario activo')
    )
    // Subcomando exclusivo de Staff: Inyectar capital
    .addSubcommand(sub =>
      sub.setName('inyectar')
         .setDescription('[STAFF] Inyecta capital a las reservas del Banco Central')
         .addIntegerOption(opt => opt.setName('monto').setDescription('Cantidad a ingresar al banco').setRequired(true))
    ),

  async execute(interaction) {
    const subcomando = interaction.options.getSubcommand();

    // 1. VER RESERVAS DEL BANCO CENTRAL
    if (subcomando === 'reserva') {
      const bancoBot = obtenerCuenta(ID_BOT_BANCO);
      const enQuiebra = bancoBot.banco <= 0;

      const embedReserva = new EmbedBuilder()
        .setTitle('🏛️ BANCO CENTRAL | ESTADO FINANCIERO')
        .setColor(enQuiebra ? 0xE74C3C : 0x2ECC71)
        .setDescription('> **Informe de liquidez y bóveda central del servidor.**')
        .addFields(
          { 
            name: '💰 Liquidez en Bóveda', 
            value: `\`\`\`\n$${bancoBot.banco.toLocaleString()} USD\n\`\`\``, 
            inline: false 
          },
          { 
            name: '📈 Estado Financiero', 
            value: enQuiebra ? '🔴 **En Quiebra / Sin Fondos**' : '🟢 **Operativo / Solvente**', 
            inline: true 
          },
          { 
            name: '💳 N° Cuenta Central', 
            value: `\`${bancoBot.numeroCuenta}\``, 
            inline: true 
          }
        )
        .setFooter({ text: 'Todos los préstamos y retiros de los usuarios dependen de estos fondos.' })
        .setTimestamp();

      return await interaction.reply({ embeds: [embedReserva] });
    }

    // 2. DEPOSITAR DINERO
    if (subcomando === 'depositar') {
      const monto = interaction.options.getInteger('monto');
      const resultado = depositar(interaction.user.id, monto);

      if (!resultado.exito) {
        return await interaction.reply({ content: `❌ ${resultado.razon}`, flags: MessageFlags.Ephemeral });
      }

      const embedDeposito = new EmbedBuilder()
        .setTitle('🏦 DEPÓSITO EXITOSO')
        .setColor(0x2ECC71)
        .setDescription(`Has abonado **$${resultado.montoReal.toLocaleString()} USD** a tu cuenta bancaria.`)
        .addFields(
          { name: '💵 Efectivo restante', value: `$${resultado.cuenta.efectivo.toLocaleString()}`, inline: true },
          { name: '💳 Saldo en Banco', value: `$${resultado.cuenta.banco.toLocaleString()}`, inline: true },
          { name: '🏛️ Bóveda del Banco', value: `$${resultado.reservaBanco.toLocaleString()}`, inline: false }
        )
        .setTimestamp();

      return await interaction.reply({ embeds: [embedDeposito] });
    }

    // 3. RETIRAR DINERO
    if (subcomando === 'retirar') {
      const monto = interaction.options.getInteger('monto');
      const resultado = retirar(interaction.user.id, monto);

      if (!resultado.exito) {
        return await interaction.reply({ content: resultado.razon, flags: MessageFlags.Ephemeral });
      }

      const embedRetiro = new EmbedBuilder()
        .setTitle('🏦 RETIRO EXITOSO')
        .setColor(0x3498DB)
        .setDescription(`Has retirado **$${monto.toLocaleString()} USD** de tu cuenta bancaria.`)
        .addFields(
          { name: '💵 Efectivo en Billetera', value: `$${resultado.cuenta.efectivo.toLocaleString()}`, inline: true },
          { name: '💳 Saldo Restante en Banco', value: `$${resultado.cuenta.banco.toLocaleString()}`, inline: true },
          { name: '🏛️ Liquidez Restante del Bot', value: `$${resultado.reservaBanco.toLocaleString()}`, inline: false }
        )
        .setTimestamp();

      return await interaction.reply({ embeds: [embedRetiro] });
    }

    // 4. SOLICITAR PRÉSTAMO
    if (subcomando === 'prestamo') {
      const monto = interaction.options.getInteger('monto');
      const resultado = solicitarPrestamo(interaction.user.id, monto);

      if (!resultado.exito) {
        return await interaction.reply({ content: resultado.razon, flags: MessageFlags.Ephemeral });
      }

      const embedPrestamo = new EmbedBuilder()
        .setTitle('📋 CRÉDITO BANCARIO APROBADO')
        .setColor(0xF1C40F)
        .setDescription(`El Banco Central te ha otorgado un préstamo por **$${resultado.monto.toLocaleString()} USD**.`)
        .addFields(
          { name: '💰 Total a Devolver', value: `$${resultado.totalAPagar.toLocaleString()} USD`, inline: true },
          { name: '📈 Historial (Score)', value: `${resultado.score} pts`, inline: true },
          { name: '🏛️ Bóveda del Banco Restante', value: `$${resultado.reservaBanco.toLocaleString()} USD`, inline: false }
        )
        .setFooter({ text: 'Recuerda saldar tu deuda a tiempo para aumentar tu credit score.' })
        .setTimestamp();

      return await interaction.reply({ embeds: [embedPrestamo] });
    }

    // 5. PAGAR PRÉSTAMO
    if (subcomando === 'pagar_prestamo') {
      const resultado = pagarPrestamo(interaction.user.id);

      if (!resultado.exito) {
        return await interaction.reply({ content: `❌ ${resultado.razon}`, flags: MessageFlags.Ephemeral });
      }

      const embedPago = new EmbedBuilder()
        .setTitle('✅ CRÉDITO LIQUIDADO')
        .setColor(0x2ECC71)
        .setDescription(`Has pagado la totalidad de tu deuda por **$${resultado.montoPagado.toLocaleString()} USD**.`)
        .addFields(
          { name: '⭐ Nuevo Score Crediticio', value: `${resultado.nuevoScore} pts (+25)`, inline: true },
          { name: '🏛️ Reserva Actual del Banco Central', value: `$${resultado.reservaBanco.toLocaleString()} USD`, inline: true }
        )
        .setTimestamp();

      return await interaction.reply({ embeds: [embedPago] });
    }

    // 6. INYECTAR CAPITAL (Solo Staff)
    if (subcomando === 'inyectar') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return await interaction.reply({ content: '❌ Solo el Staff tiene permiso para inyectar capital al banco.', flags: MessageFlags.Ephemeral });
      }

      const monto = interaction.options.getInteger('monto');
      const nuevaReserva = ajustarReservaBanco(monto);

      return await interaction.reply({
        content: `✅ Se inyectaron **$${monto.toLocaleString()} USD** a la bóveda del Banco Central. Liquidez total: **$${nuevaReserva.toLocaleString()} USD**.`
      });
    }
  }
};