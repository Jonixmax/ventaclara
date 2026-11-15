const mongoose = require('mongoose');
const Producto = require('../models/Producto');
const Compra = require('../models/Compra');
const Contador = require('../models/Contador');
const { crearError } = require('../utils/errores');
const { aCentavos, deCentavos, calcularSubtotal, aNumero } = require('../utils/dinero');
const { montoACentavos } = require('../utils/validaciones');
const { aDecimal } = require('../utils/decimal128');
const { formatearFolio } = require('../utils/folio');

const ES_OBJECT_ID = /^[a-f0-9]{24}$/i;
const MSG_COSTO = 'Escriba el costo por unidad, por ejemplo 0.45.';
const MSG_CANTIDAD = 'La cantidad debe ser un número entero mayor a cero.';
const TOPE_CANTIDAD = 100000;

// Valida la forma de los productos de la compra que manda el navegador
function normalizarItemsCompra(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw crearError(400, 'Agregue al menos un producto a la compra.');
  }
  const vistos = new Set();
  return items.map((item) => {
    const id = String(item?.productoId ?? '');
    if (!ES_OBJECT_ID.test(id)) throw crearError(400, 'Este producto no está disponible.');
    if (vistos.has(id)) throw crearError(400, 'Un producto aparece repetido en la compra.');
    vistos.add(id);
    const textoCantidad = String(item?.cantidad ?? '').trim();
    if (!/^\d+$/.test(textoCantidad)) throw crearError(400, MSG_CANTIDAD);
    const cantidad = Number(textoCantidad);
    if (cantidad < 1 || cantidad > TOPE_CANTIDAD) throw crearError(400, MSG_CANTIDAD);
    const costoCentavos = montoACentavos(item?.costoUnitario, MSG_COSTO);
    if (costoCentavos <= 0) throw crearError(400, MSG_COSTO);
    return { productoId: id, cantidad, costoCentavos };
  });
}

function normalizarProveedor(valor) {
  const texto = String(valor ?? '').trim().replace(/\s+/g, ' ');
  if (texto.length > 60) throw crearError(400, 'El nombre del proveedor no puede pasar de 60 caracteres.');
  return texto;
}

// Calcula subtotales y total con los datos del catálogo. Función pura: no toca la base de datos.
function prepararCompra(solicitados, productos) {
  const porId = new Map(productos.map((p) => [String(p._id), p]));
  const items = solicitados.map(({ productoId, cantidad, costoCentavos }) => {
    const producto = porId.get(String(productoId));
    if (!producto || producto.activo === false) throw crearError(400, 'Este producto no está disponible.');
    return {
      productoId: producto._id,
      nombre: producto.nombre,
      rubroId: producto.rubroId,
      cantidad,
      costoCentavos,
      subtotalCentavos: calcularSubtotal(cantidad, costoCentavos),
      precioCentavos: aCentavos(aNumero(producto.precio)),
    };
  });
  const totalCentavos = items.reduce((suma, i) => suma + i.subtotalCentavos, 0);
  return { items, totalCentavos };
}

// Productos que, con el nuevo costo, se venderían con pérdida (precio igual o menor al costo)
function productosConPrecioBajo(items) {
  return items
    .filter((i) => i.precioCentavos <= i.costoCentavos)
    .map((i) => ({ productoId: i.productoId, nombre: i.nombre, costo: deCentavos(i.costoCentavos), precio: deCentavos(i.precioCentavos) }));
}

// Procedimiento "Registrar compra" (punto 4.2): suma las existencias, guarda el costo y numera la compra
async function registrarCompra(itemsSolicitados, usuarioId, proveedor) {
  const solicitados = normalizarItemsCompra(itemsSolicitados);
  const nombreProveedor = normalizarProveedor(proveedor);
  const ids = solicitados.map((s) => s.productoId);
  const productos = await Producto.find({ _id: { $in: ids } });
  const { items, totalCentavos } = prepararCompra(solicitados, productos);

  const sesion = await mongoose.startSession();
  let compra;
  try {
    await sesion.withTransaction(async () => {
      for (const item of items) {
        const actualizado = await Producto.findOneAndUpdate(
          { _id: item.productoId, activo: true },
          { $inc: { existencias: item.cantidad }, $set: { costo: aDecimal(item.costoCentavos) } },
          { session: sesion, new: true }
        );
        if (!actualizado) throw crearError(409, `El producto ${item.nombre} ya no está disponible.`);
      }
      const contador = await Contador.findOneAndUpdate(
        { _id: 'compra' },
        { $inc: { valor: 1 } },
        { session: sesion, new: true, upsert: true }
      );
      [compra] = await Compra.create(
        [
          {
            numeroCompra: formatearFolio(contador.valor, 'C'),
            usuarioId,
            ...(nombreProveedor ? { proveedor: nombreProveedor } : {}),
            total: aDecimal(totalCentavos),
            items: items.map((i) => ({
              productoId: i.productoId,
              nombre: i.nombre,
              rubroId: i.rubroId,
              cantidad: i.cantidad,
              costoUnitario: aDecimal(i.costoCentavos),
              subtotal: aDecimal(i.subtotalCentavos),
            })),
          },
        ],
        { session: sesion }
      );
    });
  } finally {
    await sesion.endSession();
  }

  const actualizados = await Producto.find({ _id: { $in: ids } }).sort({ nombre: 1 });
  return { compra, productos: actualizados, avisos: productosConPrecioBajo(items) };
}

// Últimas compras registradas (historial)
async function listarCompras(limite = 30) {
  const n = Math.min(100, Math.max(1, Number.parseInt(limite, 10) || 30));
  return Compra.find().sort({ fecha: -1 }).limit(n);
}

// Total gastado en mercadería en un rango de fechas (para los reportes)
async function resumenCompras(inicio, fin) {
  const [fila] = await Compra.aggregate([
    { $match: { fecha: { $gte: inicio, $lt: fin } } },
    { $group: { _id: null, total: { $sum: '$total' }, cantidad: { $sum: 1 } } },
  ]);
  return { total: fila ? aNumero(fila.total) : 0, cantidad: fila ? fila.cantidad : 0 };
}

module.exports = {
  normalizarItemsCompra,
  prepararCompra,
  productosConPrecioBajo,
  registrarCompra,
  listarCompras,
  resumenCompras,
};
