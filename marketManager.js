// marketManager.js
const fs = require('fs');
const path = require('path');
const { cargarEconomia, guardarEconomia, obtenerCuenta, registrarTransaccion } = require('./economyManager');

const dirPath = path.join(__dirname, 'database');
const filePath = path.join(dirPath, 'mercado.json');

if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

// Configuración de los activos del mercado
const ACTIVOS_INICIALES = {
  VTL: { nombre: 'VaultToken (VLT)', precio: 10000, historico: [9500, 9700, 10000], volatilidad: 0.12, icono: '🪙' },
  BTCX: { nombre: 'BitCore Express (BTCX)', precio: 45000, historico: [44000, 44500, 45000], volatilidad: 0.06, icono: '⚡' },
  ETHX: { nombre: 'EtherNet Token (ETHX)', precio: 3200, historico: [3100, 3150, 3200], volatilidad: 0.08, icono: '💎' },
  TESL: { nombre: 'Tech Stacks Inc. (TESL)', precio: 250, historico: [240, 245, 250], volatilidad: 0.04, icono: '📈' }
};

function cargarMercado() {
  try {
    if (!fs.existsSync(filePath)) {
      const inicial = { activos: ACTIVOS_INICIALES, inversiones: {}, ultimoCanalId: null, ultimoMensajeId: null };
      fs.writeFileSync(filePath, JSON.stringify(inicial, null, 2));
      return inicial;
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return data;
  } catch (error) {
    const inicial = { activos: ACTIVOS_INICIALES, inversiones: {}, ultimoCanalId: null, ultimoMensajeId: null };
    fs.writeFileSync(filePath, JSON.stringify(inicial, null, 2));
    return inicial;
  }
}

function guardarMercado(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Actualiza los precios simulando la bolsa con eventos dinámicos y rachas
function actualizarPreciosMercado() {
  const mercado = cargarMercado();
  const cambios = [];

  for (const simbolo in mercado.activos) {
    const activo = mercado.activos[simbolo];
    const precioAnterior = activo.precio;

    // 1. Inicializar tendencia y racha si no existen en el activo
    if (!activo.tendencia) activo.tendencia = 0; // -1 (Bajista), 0 (Neutral), 1 (Alcista)
    if (!activo.duracionRacha) activo.duracionRacha = 0;

    // 2. Probar cambio de tendencia cuando la racha expira o con probabilidad aleatoria
    if (activo.duracionRacha <= 0 || Math.random() < 0.25) {
      const azarTendencia = Math.random();
      if (azarTendencia < 0.40) activo.tendencia = 1;      // 40% probabilidad alcista
      else if (azarTendencia < 0.80) activo.tendencia = -1; // 40% probabilidad bajista
      else activo.tendencia = 0;                          // 20% probabilidad lateral/neutral

      // Duración de la racha entre 2 y 6 ciclos
      activo.duracionRacha = Math.floor(Math.random() * 5) + 2; 
    }
    activo.duracionRacha--;

    // 3. Modificador de tendencia base
    let sesgo = 0;
    if (activo.tendencia === 1) sesgo = 0.04;   // Empuje hacia arriba +4%
    if (activo.tendencia === -1) sesgo = -0.04; // Empuje hacia abajo -4%

    // 4. Factor de fluctuación estándar con volatilidad
    const fluctuacionBase = (Math.random() * 2 - 1) * activo.volatilidad;
    let variacionTotal = fluctuacionBase + sesgo;

    // 5. EVENTOS EXTREMOS (Dumps / To the Moon) - 5% de probabilidad por ciclo
    const eventoRaro = Math.random();
    if (eventoRaro < 0.025) {
      // 🚀 BOOM EXPONENCIAL (Subida masiva del 25% al 60%)
      variacionTotal += (Math.random() * 0.35 + 0.25);
    } else if (eventoRaro < 0.05) {
      // 📉 DUMP / CRASH (Caída drástica del 20% al 45%)
      variacionTotal -= (Math.random() * 0.25 + 0.20);
    }

    // 6. Aplicar el nuevo precio
    let nuevoPrecio = Math.round(precioAnterior * (1 + variacionTotal));

    // Precio mínimo de protección para evitar precios 0 o negativos
    if (nuevoPrecio < 10) nuevoPrecio = 10; 

    activo.precio = nuevoPrecio;
    if (!activo.historico) activo.historico = [];
    activo.historico.push(nuevoPrecio);
    if (activo.historico.length > 8) activo.historico.shift();

    const cambioPorcentaje = (((nuevoPrecio - precioAnterior) / precioAnterior) * 100).toFixed(2);
    cambios.push({
      simbolo,
      nombre: activo.nombre,
      icono: activo.icono,
      precio: nuevoPrecio,
      precioAnterior,
      cambioPorcentaje: parseFloat(cambioPorcentaje)
    });
  }

  guardarMercado(mercado);
  return cambios;
}

// Comprar monedas/acciones
function comprarActivo(userId, simbolo, cantidad) {
  const mercado = cargarMercado();
  const activo = mercado.activos[simbolo];
  if (!activo) return { exito: false, razon: 'El activo seleccionado no existe.' };
  if (cantidad <= 0) return { exito: false, razon: 'Cantidad inválida.' };

  const costoTotal = activo.precio * cantidad;
  const eco = cargarEconomia();
  const cuenta = obtenerCuenta(userId);

  if (cuenta.banco < costoTotal) {
    return { exito: false, razon: `Saldo bancario insuficiente. Necesitas **$${costoTotal.toLocaleString()} USD**.` };
  }

  cuenta.banco -= costoTotal;
  eco[userId] = cuenta;
  guardarEconomia(eco);

  if (!mercado.inversiones[userId]) mercado.inversiones[userId] = {};
  if (!mercado.inversiones[userId][simbolo]) {
    mercado.inversiones[userId][simbolo] = { cantidad: 0, costoPromedio: 0 };
  }

  const invertido = mercado.inversiones[userId][simbolo];
  const costoTotalPrevio = invertido.cantidad * invertido.costoPromedio;
  invertido.cantidad += cantidad;
  invertido.costoPromedio = Math.round((costoTotalPrevio + costoTotal) / invertido.cantidad);

  guardarMercado(mercado);
  registrarTransaccion(userId, 'COMPRA_CRIPTO', -costoTotal, `Compra de ${cantidad} x ${simbolo}`);

  return { exito: true, costoTotal, activo };
}

// Vender y retirar dinero al banco
function venderActivo(userId, simbolo, cantidad) {
  const mercado = cargarMercado();
  const activo = mercado.activos[simbolo];
  if (!activo) return { exito: false, razon: 'El activo no existe.' };

  const portafolio = mercado.inversiones[userId]?.[simbolo];
  if (!portafolio || portafolio.cantidad < cantidad) {
    return { exito: false, razon: `No posees suficiente cantidad de **${simbolo}** para vender.` };
  }

  const ingresoTotal = activo.precio * cantidad;
  const eco = cargarEconomia();
  const cuenta = obtenerCuenta(userId);

  cuenta.banco += ingresoTotal;
  eco[userId] = cuenta;
  guardarEconomia(eco);

  portafolio.cantidad -= cantidad;
  if (portafolio.cantidad === 0) {
    delete mercado.inversiones[userId][simbolo];
  }

  guardarMercado(mercado);
  registrarTransaccion(userId, 'VENTA_CRIPTO', ingresoTotal, `Venta de ${cantidad} x ${simbolo}`);

  return { exito: true, ingresoTotal, activo };
}

function obtenerPortafolio(userId) {
  const mercado = cargarMercado();
  return mercado.inversiones[userId] || {};
}

module.exports = {
  cargarMercado,
  guardarMercado,
  actualizarPreciosMercado,
  comprarActivo,
  venderActivo,
  obtenerPortafolio
};