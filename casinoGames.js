// casinoGames.js
const { obtenerCuenta, ID_BOT_BANCO } = require('./economyManager');

function crearCarta() {
  const valores = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const palos = ['♠️', '♥️', '♦️', '♣️'];
  const v = valores[Math.floor(Math.random() * valores.length)];
  const p = palos[Math.floor(Math.random() * palos.length)];
  return { valor: v, palo: p };
}

function calcularPuntos(mano) {
  let puntos = 0;
  let ases = 0;
  for (const c of mano) {
    if (['J', 'Q', 'K'].includes(c.valor)) puntos += 10;
    else if (c.valor === 'A') { puntos += 11; ases += 1; }
    else puntos += parseInt(c.valor);
  }
  while (puntos > 21 && ases > 0) {
    puntos -= 10;
    ases -= 1;
  }
  return puntos;
}

function iniciarPartidaBlackjack(userId, apuesta) {
  const jugador = obtenerCuenta(userId);
  if (apuesta <= 0) return { exito: false, razon: 'Monto de apuesta inválido.' };
  if (jugador.efectivo < apuesta) return { exito: false, razon: 'No tienes suficiente efectivo en tu billetera.' };

  const bancoCentral = obtenerCuenta(ID_BOT_BANCO);
  if (bancoCentral.banco < apuesta * 2) {
    return { exito: false, razon: '🏛️ **El Casino/Banco Central no tiene suficiente liquidez para cubrir este premio.**' };
  }

  const manoJugador = [crearCarta(), crearCarta()];
  const manoCrupier = [crearCarta(), crearCarta()];

  return {
    exito: true,
    manoJugador,
    manoCrupier,
    ptsJugador: calcularPuntos(manoJugador),
    ptsCrupierVisibles: calcularPuntos([manoCrupier[0]])
  };
}

// Validación individual para jugadores que se unen en salas multijugador
function validarApuestaBase(userId, apuesta, multiplicadorPremio = 2) {
  const jugador = obtenerCuenta(userId);
  if (isNaN(apuesta) || apuesta <= 0) return { exito: false, razon: '❌ Monto de apuesta inválido.' };
  if (jugador.efectivo < apuesta) return { exito: false, razon: '❌ No tienes suficiente efectivo en tu billetera.' };

  const bancoCentral = obtenerCuenta(ID_BOT_BANCO);
  if (bancoCentral.banco < apuesta * multiplicadorPremio) {
    return { exito: false, razon: '🏛️ **El Casino/Banco Central no tiene suficiente liquidez.**' };
  }

  return { exito: true };
}

module.exports = {
  crearCarta,
  calcularPuntos,
  iniciarPartidaBlackjack,
  validarApuestaBase
};