const mongoose = require('mongoose');
const Producto = require('../models/Producto');
const Venta = require('../models/Venta');
const Rubro = require('../models/Rubro');
const Contador = require('../models/Contador');
const CierreCaja = require('../models/CierreCaja');
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

function normalizarConsultaHistorial(consulta = {}) {
  function leerFecha(valor, campo) {
    if (valor === undefined || valor === '') return null;
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      throw crearError(400, `La fecha ${campo} no es válida.`);
    }
    const [anio, mes, dia] = valor.split('-').map(Number);
    const mediodia = new Date(Date.UTC(anio, mes - 1, dia, 12));
    if (mediodia.toISOString().slice(0, 10) !== valor) throw crearError(400, `La fecha ${campo} no es válida.`);
    return rangoDelDia(mediodia);
  }

  const desde = leerFecha(consulta.desde, 'inicial');
  const hasta = leerFecha(consulta.hasta, 'final');
  if (desde && hasta && desde.inicio >= hasta.fin) throw crearError(400, 'La fecha inicial debe ser anterior o igual a la fecha final.');

  const pagina = consulta.pagina === undefined ? 1 : Number(consulta.pagina);
  const limite = consulta.limite === undefined ? 20 : Number(consulta.limite);
  if (!Number.isInteger(pagina) || pagina < 1) throw crearError(400, 'La página no es válida.');
  if (!Number.isInteger(limite) || limite < 1 || limite > 100) throw crearError(400, 'El límite debe estar entre 1 y 100.');

  const comprobante = String(consulta.comprobante || '').trim().toUpperCase();
  if (comprobante.length > 30) throw crearError(400, 'El comprobante no es válido.');
  return { desde, hasta, pagina, limite, comprobante };
}

async function listarVentas(consulta) {
  const filtros = normalizarConsultaHistorial(consulta);
  const filtro = {};
  if (filtros.desde || filtros.hasta) {
    filtro.fecha = {};
    if (filtros.desde) filtro.fecha.$gte = filtros.desde.inicio;
    if (filtros.hasta) filtro.fecha.$lt = filtros.hasta.fin;
  }
  if (filtros.comprobante) filtro.numeroComprobante = filtros.comprobante;
  const [ventas, total] = await Promise.all([
    Venta.find(filtro).sort({ fecha: -1, _id: -1 }).skip((filtros.pagina - 1) * filtros.limite).limit(filtros.limite),
    Venta.countDocuments(filtro),
  ]);
  return {
    ventas,
    pagina: filtros.pagina,
    limite: filtros.limite,
    total,
    paginas: Math.ceil(total / filtros.limite),
  };
}

async function obtenerVenta(id) {
  if (!ES_OBJECT_ID.test(String(id))) throw crearError(404, 'No se encontró la venta.');
  const venta = await Venta.findById(id);
  if (!venta) throw crearError(404, 'No se encontró la venta.');
  return venta;
}

async function anularVenta(id, usuarioId, motivo) {
  if (!ES_OBJECT_ID.test(String(id))) throw crearError(404, 'No se encontró la venta.');
  const motivoLimpio = typeof motivo === 'string' ? motivo.trim() : '';
  if (motivoLimpio.length < 5 || motivoLimpio.length > 200) {
    throw crearError(400, 'Explique el motivo de la anulación (de 5 a 200 caracteres).');
  }

  const sesion = await mongoose.startSession();
  let venta;
  try {
    await sesion.withTransaction(async () => {
      venta = await Venta.findById(id).session(sesion);
      if (!venta) throw crearError(404, 'No se encontró la venta.');
      if (venta.estado === 'anulada') throw crearError(409, 'Esta venta ya fue anulada.');

      const { inicio } = rangoDelDia(venta.fecha);
      if (await CierreCaja.exists({ fecha: inicio }).session(sesion)) {
        throw crearError(409, 'No se puede anular una venta de un día que ya tiene cierre de caja.');
      }

      for (const item of venta.items) {
        const producto = await Producto.findByIdAndUpdate(
          item.productoId,
          { $inc: { existencias: item.cantidad } },
          { session: sesion, new: true }
        );
        if (!producto) throw crearError(409, `No se pudo devolver al inventario ${item.nombre}.`);
      }

      venta.estado = 'anulada';
      venta.motivoAnulacion = motivoLimpio;
      venta.anuladaPor = usuarioId;
      venta.anuladaEn = new Date();
      await venta.save({ session: sesion });
    });
  } finally {
    await sesion.endSession();
  }
  return venta;
}

// Tipos numéricos de MongoDB: sirven para saber si un item de venta tiene costo registrado
const TIPOS_NUMERICOS = ['decimal', 'double', 'int', 'long'];

// Resumen de ventas de un rango de fechas: total, ganancia estimada y desglose por rubro.
// La ganancia solo cuenta los productos con costo registrado; el resto se reporta aparte.
async function resumenDeRango(inicio, fin) {
  const filtro = { fecha: { $gte: inicio, $lt: fin }, estado: { $ne: 'anulada' } };
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

module.exports = {
  registrarVenta,
  listarVentas,
  obtenerVenta,
  anularVenta,
  resumenDelDia,
  resumenDelMes,
  normalizarItems,
  normalizarConsultaHistorial,
  prepararVenta,
};
