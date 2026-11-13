const { crearError } = require('./errores');
const { montoACentavos } = require('./validaciones');

const MSG_FORMATO = 'Escriba cuánto dinero entregó el cliente.';
const MSG_INSUFICIENTE = 'El dinero recibido no alcanza para pagar el total.';

// El dinero recibido es opcional: si no se escribe, la venta se guarda igual (devuelve null)
function leerEfectivoRecibido(valor) {
  if (valor === undefined || valor === null || String(valor).trim() === '') return null;
  return montoACentavos(valor, MSG_FORMATO);
}

// Calcula el vuelto: dinero recibido menos total de la venta (todo en centavos)
function calcularPago(totalCentavos, recibidoCentavos) {
  if (recibidoCentavos === null) return { recibidoCentavos: null, vueltoCentavos: null };
  if (recibidoCentavos < totalCentavos) throw crearError(400, MSG_INSUFICIENTE);
  return { recibidoCentavos, vueltoCentavos: recibidoCentavos - totalCentavos };
}

module.exports = { leerEfectivoRecibido, calcularPago };
