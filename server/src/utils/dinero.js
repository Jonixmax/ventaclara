// Los cálculos de dinero se hacen en centavos (enteros) para evitar errores de redondeo
const aCentavos = (monto) => Math.round(Number(monto) * 100);
const deCentavos = (centavos) => centavos / 100;
const calcularSubtotal = (cantidad, precioCentavos) => cantidad * precioCentavos;
// Diferencia del arqueo: efectivo contado menos total del sistema (positiva = sobra, negativa = falta)
const calcularDiferenciaCaja = (efectivoCentavos, totalSistemaCentavos) => efectivoCentavos - totalSistemaCentavos;
const formatearMoneda = (monto) => `$${Number(monto).toFixed(2)}`;

// Convierte un Decimal128 de MongoDB en número normal para enviarlo en JSON
const aNumero = (valor) => (valor == null ? valor : Number(valor.toString()));

module.exports = { aCentavos, deCentavos, calcularSubtotal, calcularDiferenciaCaja, formatearMoneda, aNumero };
