const mongoose = require('mongoose');
const Producto = require('../models/Producto');
const Venta = require('../models/Venta');
const Rubro = require('../models/Rubro');
const Contador = require('../models/Contador');
const { crearError } = require('../utils/errores');
const { aCentavos, deCentavos, calcularSubtotal, aNumero } = require('../utils/dinero');
const { rangoDelDia } = require('../utils/fechas');
const { formatearFolio } = require('../utils/folio');

const ES_OBJECT_ID = /^[a-f0-9]{24}$/i;
const aDecimal = (centavos) => mongoose.Types.Decimal128.fromString(deCentavos(centavos).toFixed(2));

// Valida la forma de los items que manda el navegador y junta los productos repetidos
function normalizarItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw crearError(400, 'Agregue al menos un producto.');
  }
  const porProducto = new Map();
  for (const item of items) {
    const id = String(item?.productoId ?? '');
    const cantidad = item?.cantidad;
    if (!ES_OBJECT_ID.test(id)) throw crearError(400, 'Este producto no está disponible.');
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      throw crearError(400, 'La cantidad debe ser un número entero mayor a cero.');
    }
    porProducto.set(id, (porProducto.get(id) || 0) + cantidad);
  }
  return [...porProducto].map(([productoId, cantidad]) => ({ productoId, cantidad }));
}

// Regla central: el precio y el nombre SIEMPRE salen del catálogo, nunca del navegador.
// Función pura (no toca la base de datos), por eso se puede probar sin conexión.
function prepararVenta(solicitados, productos) {
  const porId = new Map(productos.map((p) => [String(p._id), p]));
  const items = solicitados.map(({ productoId, cantidad }) => {
    const producto = porId.get(String(productoId));
    if (!producto || producto.activo === false) throw crearError(400, 'Este producto no está disponible.');
    if (producto.existencias < cantidad) {
      const n = producto.existencias;
      throw crearError(
        400,
        n === 0
          ? `${producto.nombre} está agotado.`
          : `Solo quedan ${n} ${n === 1 ? 'unidad' : 'unidades'} de ${producto.nombre}.`
      );
    }
    const precioCentavos = aCentavos(aNumero(producto.precio));
    return {
      productoId: producto._id,
      nombre: producto.nombre,
      rubroId: producto.rubroId,
      cantidad,
      precioCentavos,
      subtotalCentavos: calcularSubtotal(cantidad, precioCentavos),
    };
  });
  const totalCentavos = items.reduce((suma, i) => suma + i.subtotalCentavos, 0);
  return { items, totalCentavos };
}

// Procedimiento "Registrar venta" (punto 4.2): todo ocurre en una transacción
async function registrarVenta(itemsSolicitados, usuarioId) {
  const solicitados = normalizarItems(itemsSolicitados);
  const ids = solicitados.map((s) => s.productoId);
  const productos = await Producto.find({ _id: { $in: ids } });
  const { items, totalCentavos } = prepararVenta(solicitados, productos);

  const sesion = await mongoose.startSession();
  let venta;
  try {
    await sesion.withTransaction(async () => {
      // Descuento atómico: solo se descuenta si todavía hay existencias suficientes
      for (const item of items) {
        const actualizado = await Producto.findOneAndUpdate(
          { _id: item.productoId, activo: true, existencias: { $gte: item.cantidad } },
          { $inc: { existencias: -item.cantidad } },
          { session: sesion, new: true }
        );
        if (!actualizado) throw crearError(409, `Ya no hay existencias suficientes de ${item.nombre}.`);
      }
      const contador = await Contador.findOneAndUpdate(
        { _id: 'comprobante' },
        { $inc: { valor: 1 } },
        { session: sesion, new: true, upsert: true }
      );
      [venta] = await Venta.create(
        [
          {
            numeroComprobante: formatearFolio(contador.valor),
            usuarioId,
            total: aDecimal(totalCentavos),
            items: items.map((i) => ({
              productoId: i.productoId,
              nombre: i.nombre,
              rubroId: i.rubroId,
              cantidad: i.cantidad,
              precioUnitario: aDecimal(i.precioCentavos),
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

  // Productos de esta venta que quedaron por agotarse (para avisar en pantalla)
  const alertas = await Producto.find({
    _id: { $in: ids },
    activo: true,
    $expr: { $lte: ['$existencias', { $multiply: ['$stockMinimo', 2] }] },
  }).sort({ existencias: 1 });

  return { venta, alertas };
}

// Resumen del día para el panel de la propietaria: total y desglose por rubro
async function resumenDelDia(fecha = new Date()) {
  const { inicio, fin } = rangoDelDia(fecha);
  const filtro = { fecha: { $gte: inicio, $lt: fin } };
  const [filas, cantidadVentas, rubros] = await Promise.all([
    Venta.aggregate([
      { $match: filtro },
      { $unwind: '$items' },
      { $group: { _id: '$items.rubroId', total: { $sum: '$items.subtotal' } } },
    ]),
    Venta.countDocuments(filtro),
    Rubro.find({ activo: true }).sort({ nombre: 1 }),
  ]);
  const totalPorRubro = new Map(filas.map((f) => [String(f._id), aCentavos(aNumero(f.total))]));
  const porRubro = rubros.map((r) => ({
    rubroId: r._id,
    nombre: r.nombre,
    color: r.color,
    total: deCentavos(totalPorRubro.get(String(r._id)) || 0),
  }));
  const total = porRubro.reduce((suma, r) => suma + aCentavos(r.total), 0);
  return { fecha: inicio, cantidadVentas, total: deCentavos(total), porRubro };
}

module.exports = { registrarVenta, resumenDelDia, normalizarItems, prepararVenta };
