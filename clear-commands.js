require('dotenv').config();
const { REST, Routes } = require('discord.js');

// Configuración del bot que deseas limpiar
const TOKEN = process.env.DISCORD_TOKEN_ECONOMIA; // o DISCORD_TOKEN_RP
const CLIENT_ID = process.env.CLIENT_ID;// ID de la aplicación del Bot
const GUILD_ID = process.env.GUILD_ID; // ID del Servidor de Discord

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('❌ Error: Faltan variables en el archivo .env (TOKEN, CLIENT_ID o GUILD_ID)');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('🧹 Eliminando comandos Slash GLOBALES...');
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: [] }
    );
    console.log('✅ Comandos globales eliminados.');

    console.log(`🧹 Eliminando comandos Slash del SERVIDOR (Guild: ${GUILD_ID})...`);
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: [] }
    );
    console.log('✅ Comandos de Guild eliminados.');

    console.log('🎉 Limpieza completa finalizada exitosamente.');
  } catch (error) {
    console.error('❌ Error al eliminar comandos:', error);
  }
})();