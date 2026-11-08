const { crearError } = require('./errores');

const TOPE_CENTAVOS = 100000000; // 1,000,000.00
const TOPE_ENTERO = 1000000;

// Convierte un monto escrito por el usuario (máximo 2 decimales) en centavos enteros
function montoACentavos(valor, mensaje) {
  const texto = String(valor ?? '').trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(texto)) throw crearError(400, mensaje);
  const centavos = Math.round(Number(texto) * 100);
  if (centavos > TOPE_CENTAVOS) throw crearError(400, mensaje);
  return centavos;
}

// Acepta solo enteros de cero en adelante (números o texto con dígitos)
function enteroNoNegativo(valor, mensaje) {
  const texto = String(valor ?? '').trim();
  if (!/^\d+$/.test(texto)) throw crearError(400, mensaje);
  const numero = Number(texto);
  if (numero > TOPE_ENTERO) throw crearError(400, mensaje);
  return numero;
}

module.exports = { montoACentavos, enteroNoNegativo };
