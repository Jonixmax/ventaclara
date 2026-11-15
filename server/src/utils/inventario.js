const { estadoStock } = require('./estadoStock');

// Meta de abastecimiento: tener 3 veces el stock mínimo
const FACTOR_OBJETIVO = 3;

// Cuántas unidades conviene comprar. Si el producto está bien abastecido (verde), no se sugiere nada;
// si no, se sugiere llegar a la meta (mínimo 1 unidad).
function cantidadSugerida(existencias, stockMinimo) {
  if (estadoStock(existencias, stockMinimo) === 'verde') return 0;
  return Math.max(1, stockMinimo * FACTOR_OBJETIVO - existencias);
}

module.exports = { cantidadSugerida, FACTOR_OBJETIVO };
