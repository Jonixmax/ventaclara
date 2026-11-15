// Da formato al número de documento: 123 -> V-000123 (ventas) o C-000123 (compras)
const formatearFolio = (numero, prefijo = 'V') => `${prefijo}-${String(numero).padStart(6, '0')}`;

module.exports = { formatearFolio };
