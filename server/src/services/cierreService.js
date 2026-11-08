const CierreCaja = require('../models/CierreCaja');
const { crearError } = require('../utils/errores');
const { aCentavos, calcularDiferenciaCaja } = require('../utils/dinero');
const { montoACentavos } = require('../utils/validaciones');
const { aDecimal } = require('../utils/decimal128');
const { rangoDelDia } = require('../utils/fechas');
const { resumenDelDia } = require('./ventaService');

// Muestra el total que registra el sistema hoy y si ya existe un cierre
async function previsualizarCierre(fecha = new Date()) {
  const { inicio } = rangoDelDia(fecha);
  const [resumen, cierre] = await Promise.all([resumenDelDia(fecha), CierreCaja.findOne({ fecha: inicio })]);
  return {
    fecha: inicio,
    cantidadVentas: resumen.cantidadVentas,
    totalSistema: resumen.total,
    porRubro: resumen.porRubro,
    cierre,
  };
}

// Procedimiento "Cierre de caja" (punto 4.2): arqueo del día
async function registrarCierre(efectivoContado, usuarioId, fecha = new Date()) {
  const efectivoCentavos = montoACentavos(efectivoContado, 'Escriba el efectivo contado.');
  const { inicio } = rangoDelDia(fecha);
  if (await CierreCaja.exists({ fecha: inicio })) {
    throw crearError(409, 'Ya existe un cierre de caja para hoy.');
  }
  const resumen = await resumenDelDia(fecha);
  const totalSistemaCentavos = aCentavos(resumen.total);
  return CierreCaja.create({
    fecha: inicio,
    totalSistema: aDecimal(totalSistemaCentavos),
    efectivoContado: aDecimal(efectivoCentavos),
    diferencia: aDecimal(calcularDiferenciaCaja(efectivoCentavos, totalSistemaCentavos)),
    totalesPorRubro: resumen.porRubro.map((r) => ({ rubroId: r.rubroId, total: aDecimal(aCentavos(r.total)) })),
    usuarioId,
  });
}

module.exports = { previsualizarCierre, registrarCierre };
