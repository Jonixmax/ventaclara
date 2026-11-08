const Producto = require('../models/Producto');
const Rubro = require('../models/Rubro');
const { crearError } = require('../utils/errores');
const { montoACentavos, enteroNoNegativo } = require('../utils/validaciones');
const { aDecimal } = require('../utils/decimal128');

const ES_OBJECT_ID = /^[a-f0-9]{24}$/i;
const MSG_PRECIO = 'Escriba un precio válido, por ejemplo 0.75.';
const MSG_ENTERO = 'Escriba un número entero, cero o mayor.';

// Limpia y valida los datos de un producto. Función pura: no toca la base de datos.
// Con parcial = true solo valida los campos que vienen en la petición (edición).
function prepararProducto(datos = {}, { parcial = false } = {}) {
  const limpio = {};
  const viene = (campo) => datos[campo] !== undefined;

  if (!parcial || viene('rubroId')) {
    if (!ES_OBJECT_ID.test(String(datos.rubroId ?? ''))) throw crearError(400, 'Elija un rubro.');
    limpio.rubroId = String(datos.rubroId);
  }
  if (!parcial || viene('nombre')) {
    const nombre = String(datos.nombre ?? '').trim().replace(/\s+/g, ' ');
    if (nombre.length < 2 || nombre.length > 80) throw crearError(400, 'El nombre debe tener de 2 a 80 caracteres.');
    limpio.nombre = nombre;
  }
  if (!parcial || viene('precio')) {
    const centavos = montoACentavos(datos.precio, MSG_PRECIO);
    if (centavos <= 0) throw crearError(400, MSG_PRECIO);
    limpio.precioCentavos = centavos;
  }
  if (!parcial || viene('existencias')) {
    limpio.existencias = enteroNoNegativo(datos.existencias, MSG_ENTERO);
  }
  if (!parcial || viene('stockMinimo')) {
    const sinValor = datos.stockMinimo === undefined || datos.stockMinimo === '';
    limpio.stockMinimo = sinValor ? 5 : enteroNoNegativo(datos.stockMinimo, MSG_ENTERO);
  }
  if (viene('activo')) {
    if (typeof datos.activo !== 'boolean') throw crearError(400, 'El estado del producto no es válido.');
    limpio.activo = datos.activo;
  }
  return limpio;
}

async function verificarRubro(rubroId) {
  const rubro = await Rubro.findOne({ _id: rubroId, activo: true });
  if (!rubro) throw crearError(400, 'Elija un rubro.');
}

function aplicar(producto, limpio) {
  const { precioCentavos, ...resto } = limpio;
  Object.assign(producto, resto);
  if (precioCentavos !== undefined) producto.precio = aDecimal(precioCentavos);
}

// Procedimiento "Guardar producto" (punto 4.2): alta
async function crearProducto(datos) {
  const limpio = prepararProducto(datos);
  await verificarRubro(limpio.rubroId);
  const producto = new Producto({ activo: true });
  aplicar(producto, limpio);
  return producto.save();
}

// Procedimiento "Guardar producto" (punto 4.2): edición, ajuste de existencias y activar o desactivar
async function actualizarProducto(id, datos) {
  if (!ES_OBJECT_ID.test(String(id))) throw crearError(404, 'Producto no encontrado.');
  const limpio = prepararProducto(datos, { parcial: true });
  const producto = await Producto.findById(id);
  if (!producto) throw crearError(404, 'Producto no encontrado.');
  if (limpio.rubroId) await verificarRubro(limpio.rubroId);
  aplicar(producto, limpio);
  return producto.save();
}

module.exports = { prepararProducto, crearProducto, actualizarProducto };
