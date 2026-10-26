// Da formato al número de comprobante: 123 -> V-000123
const formatearFolio = (numero) => `V-${String(numero).padStart(6, '0')}`;

module.exports = { formatearFolio };
