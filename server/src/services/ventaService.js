const mongoose = require('mongoose');
const Producto = require('../models/Producto');
const Venta = require('../models/Venta');
const Rubro = require('../models/Rubro');
const Contador = require('../models/Contador');
const { crearError } = require('../utils/errores');
const { aCentavos, deCentavos, calcularSubtotal, aNumero } = require('../utils/dinero');
const { rangoDelDia, rangoDelMes } = require('../utils/fechas');
const { formatearFolio } = require('../utils/folio');
const { leerEfectivoRecibido, calcularPago } = require('../utils/pago');

const ES_OBJECT_ID = /^[a-f0-9]{24}$/i;
const { aDecimal } = require('../utils/decimal128');

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
      // Costo del producto al momento de la venta (null si todavía no se registró)
      costoCentavos: producto.costo == null ? null : aCentavos(aNumero(producto.costo)),
      subtotalCentavos: calcularSubtotal(cantidad, precioCentavos),
    };
  });
  const totalCentavos = items.reduce((suma, i) => suma + i.subtotalCentavos, 0);
  return { items, totalCentavos };
}

// Procedimiento "Registrar venta" (punto 4.2): todo ocurre en una transacción
async function registrarVenta(itemsSolicitados, usuarioId, efectivoRecibido) {
  const solicitados = normalizarItems(itemsSolicitados);
  const recibidoCentavos = leerEfectivoRecibido(efectivoRecibido);
  const ids = solicitados.map((s) => s.productoId);
  const productos = await Producto.find({ _id: { $in: ids } });
  const { items, totalCentavos } = prepararVenta(solicitados, productos);
  const pago = calcularPago(totalCentavos, recibidoCentavos);

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
            ...(pago.recibidoCentavos !== null
              ? { efectivoRecibido: aDecimal(pago.recibidoCentavos), vuelto: aDecimal(pago.vueltoCentavos) }
              : {}),
            items: items.map((i) => ({
              productoId: i.productoId,
              nombre: i.nombre,
              rubroId: i.rubroId,
              cantidad: i.cantidad,
              precioUnitario: aDecimal(i.precioCentavos),
              ...(i.costoCentavos !== null ? { costoUnitario: aDecimal(i.costoCentavos) } : {}),
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

// Tipos numéricos de MongoDB: sirven para saber si un item de venta tiene costo registrado
const TIPOS_NUMERICOS = ['decimal', 'double', 'int', 'long'];

// Resumen de ventas de un rango de fechas: total, ganancia estimada y desglose por rubro.
// La ganancia solo cuenta los productos con costo registrado; el resto se reporta aparte.
async function resumenDeRango(inicio, fin) {
  const filtro = { fecha: { $gte: inicio, $lt: fin } };
  const tieneCosto = { $in: [{ $type: '$items.costoUnitario' }, TIPOS_NUMERICOS] };
  const [filas, cantidadVentas, rubros] = await Promise.all([
    Venta.aggregate([
      { $match: filtro },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.rubroId',
          total: { $sum: '$items.subtotal' },
          ventaConCosto: { $sum: { $cond: [tieneCosto, '$items.subtotal', 0] } },
          costoVendido: { $sum: { $cond: [tieneCosto, { $multiply: ['$items.costoUnitario', '$items.cantidad'] }, 0] } },
          sinCosto: { $sum: { $cond: [tieneCosto, 0, 1] } },
        },
      },
    ]),
    Venta.countDocuments(filtro),
    Rubro.find({ activo: true }).sort({ nombre: 1 }),
  ]);
  const porId = new Map(
    filas.map((f) => [
      String(f._id),
      {
        total: aCentavos(aNumero(f.total)),
        ganancia: aCentavos(aNumero(f.ventaConCosto)) - aCentavos(aNumero(f.costoVendido)),
        sinCosto: f.sinCosto,
      },
    ])
  );
  const vacio = { total: 0, ganancia: 0, sinCosto: 0 };
  const datos = rubros.map((r) => ({ rubro: r, ...(porId.get(String(r._id)) || vacio) }));
  const porRubro = datos.map(({ rubro, total, ganancia }) => ({
    rubroId: rubro._id,
    nombre: rubro.nombre,
    color: rubro.color,
    total: deCentavos(total),
    ganancia: deCentavos(ganancia),
  }));
  const total = datos.reduce((suma, d) => suma + d.total, 0);
  const ganancia = datos.reduce((suma, d) => suma + d.ganancia, 0);
  const itemsSinCosto = datos.reduce((suma, d) => suma + d.sinCosto, 0);
  return {
    fecha: inicio,
    desde: inicio,
    hasta: fin,
    cantidadVentas,
    total: deCentavos(total),
    ganancia: deCentavos(ganancia),
    itemsSinCosto,
    porRubro,
  };
}

// Resumen del día para el panel y el cierre de caja
async function resumenDelDia(fecha = new Date()) {
  const { inicio, fin } = rangoDelDia(fecha);
  return resumenDeRango(inicio, fin);
}

// Resumen del mes para los reportes de la propietaria
async function resumenDelMes(fecha = new Date()) {
  const { inicio, fin } = rangoDelMes(fecha);
  return resumenDeRango(inicio, fin);
}

module.exports = { registrarVenta, resumenDelDia, resumenDelMes, normalizarItems, prepararVenta };
