process.env.JWT_SECRET = 'secreto-de-prueba';
const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Producto = require('../src/models/Producto');
const PedidoCompra = require('../src/models/PedidoCompra');
const Venta = require('../src/models/Venta');
const { normalizarItemsCompra, prepararCompra, productosConPrecioBajo, normalizarFechaEsperada, programarPedido } = require('../src/services/compraService');
const { prepararProducto } = require('../src/services/productoService');
const { cantidadSugerida } = require('../src/utils/inventario');
const { formatearFolio } = require('../src/utils/folio');
const { productoVisible, ventaVisible } = require('../src/utils/visibilidad');

const ID_A = 'a'.repeat(24);
const ID_B = 'b'.repeat(24);
const RUBRO = 'c'.repeat(24);
const oid = () => new mongoose.Types.ObjectId();
const catalogo = [
  { _id: ID_A, nombre: 'Arroz 1 lb', rubroId: RUBRO, precio: '0.60', activo: true },
  { _id: ID_B, nombre: 'Hilo blanco', rubroId: RUBRO, precio: '0.75', activo: true },
];

test('compra: exige al menos un producto', () => {
  assert.throws(() => normalizarItemsCompra([]), { message: 'Agregue al menos un producto a la compra.' });
  assert.throws(() => normalizarItemsCompra(undefined), { message: 'Agregue al menos un producto a la compra.' });
});

test('compra: lee cantidad y costo y convierte el costo a centavos', () => {
  const [item] = normalizarItemsCompra([{ productoId: ID_A, cantidad: '12', costoUnitario: '0,45' }]);
  assert.deepStrictEqual(item, { productoId: ID_A, cantidad: 12, costoCentavos: 45 });
});

test('compra: rechaza cantidades y costos inválidos con mensajes claros', () => {
  const caso = (cambio, mensaje) =>
    assert.throws(() => normalizarItemsCompra([{ productoId: ID_A, cantidad: 5, costoUnitario: '0.45', ...cambio }]), { message: mensaje });
  for (const cantidad of [0, -1, 2.5, 'doce', '', 100001]) caso({ cantidad }, 'La cantidad debe ser un número entero mayor a cero.');
  for (const costoUnitario of ['0', 'abc', '-1', '', '1.234']) caso({ costoUnitario }, 'Escriba el costo por unidad, por ejemplo 0.45.');
  caso({ productoId: '123' }, 'Este producto no está disponible.');
});

test('compra: un producto no puede repetirse', () => {
  assert.throws(
    () => normalizarItemsCompra([{ productoId: ID_A, cantidad: 1, costoUnitario: '1' }, { productoId: ID_A, cantidad: 2, costoUnitario: '1' }]),
    { message: 'Un producto aparece repetido en la compra.' }
  );
});

test('pedido: valida y conserva la fecha de recepción en formato local', () => {
  assert.strictEqual(normalizarFechaEsperada('2026-11-15'), '2026-11-15');
  for (const fecha of ['', '2026-02-30', '15-11-2026', undefined]) {
    assert.throws(() => normalizarFechaEsperada(fecha), { status: 400, message: 'Escriba una fecha de recepción válida.' });
  }
});

test('pedido: mantiene la fecha y devuelve los costos como números', () => {
  const pedido = new PedidoCompra({
    fechaEsperada: '2026-11-15',
    usuarioId: oid(),
    items: [{ productoId: oid(), nombre: 'Arroz 1 lb', rubroId: oid(), cantidad: 2, costoUnitario: '1.25', subtotal: '2.50' }],
    total: '2.50',
  }).toJSON();
  assert.strictEqual(pedido.fechaEsperada, '2026-11-15');
  assert.strictEqual(pedido.items[0].costoUnitario, 1.25);
  assert.strictEqual(pedido.total, 2.5);
  assert.ok(pedido.id);
});

test('pedido: programarlo no modifica las existencias', async () => {
  const originales = {
    buscarProductos: Producto.find,
    actualizarProducto: Producto.findOneAndUpdate,
    crearPedido: PedidoCompra.create,
  };
  let actualizaciones = 0;
  Producto.find = async () => catalogo;
  Producto.findOneAndUpdate = async () => { actualizaciones += 1; };
  PedidoCompra.create = async (pedidos) => pedidos;
  try {
    const pedido = await programarPedido(
      [{ productoId: ID_A, cantidad: '5', costoUnitario: '0.45' }],
      'usuario-prueba',
      'Proveedor',
      '2026-11-15'
    );
    assert.strictEqual(pedido.fechaEsperada, '2026-11-15');
    assert.strictEqual(pedido.total.toString(), '2.25');
    assert.strictEqual(actualizaciones, 0);
  } finally {
    Producto.find = originales.buscarProductos;
    Producto.findOneAndUpdate = originales.actualizarProducto;
    PedidoCompra.create = originales.crearPedido;
  }
});

test('compra: calcula subtotales y total en centavos con el catálogo', () => {
  const { items, totalCentavos } = prepararCompra(
    [{ productoId: ID_A, cantidad: 10, costoCentavos: 45 }, { productoId: ID_B, cantidad: 4, costoCentavos: 50 }],
    catalogo
  );
  assert.strictEqual(items[0].subtotalCentavos, 450);
  assert.strictEqual(items[1].subtotalCentavos, 200);
  assert.strictEqual(totalCentavos, 650);
  assert.strictEqual(items[0].nombre, 'Arroz 1 lb');
});

test('compra: un producto inexistente o inactivo no se puede comprar', () => {
  assert.throws(() => prepararCompra([{ productoId: ID_B, cantidad: 1, costoCentavos: 10 }], [catalogo[0]]), { message: 'Este producto no está disponible.' });
  assert.throws(() => prepararCompra([{ productoId: ID_A, cantidad: 1, costoCentavos: 10 }], [{ ...catalogo[0], activo: false }]), { message: 'Este producto no está disponible.' });
});

test('compra: avisa cuando el precio de venta queda igual o por debajo del costo', () => {
  const { items } = prepararCompra(
    [{ productoId: ID_A, cantidad: 1, costoCentavos: 60 }, { productoId: ID_B, cantidad: 1, costoCentavos: 50 }],
    catalogo
  );
  const avisos = productosConPrecioBajo(items);
  assert.strictEqual(avisos.length, 1);
  assert.deepStrictEqual({ nombre: avisos[0].nombre, costo: avisos[0].costo, precio: avisos[0].precio }, { nombre: 'Arroz 1 lb', costo: 0.6, precio: 0.6 });
});

test('folio: las compras usan el prefijo C', () => {
  assert.strictEqual(formatearFolio(5, 'C'), 'C-000005');
  assert.strictEqual(formatearFolio(5), 'V-000005');
});

test('inventario: cuánto conviene comprar para llegar a 3 veces el mínimo', () => {
  assert.strictEqual(cantidadSugerida(4, 5), 11);   // rojo: meta 15
  assert.strictEqual(cantidadSugerida(9, 5), 6);    // amarillo
  assert.strictEqual(cantidadSugerida(30, 5), 0);   // verde: no hace falta
  assert.strictEqual(cantidadSugerida(0, 0), 1);    // sin mínimo definido, al menos 1
});

test('producto: el costo es opcional, se limpia cuando viene vacío y se valida si viene', () => {
  const base = { rubroId: RUBRO, nombre: 'Azúcar 1 lb', precio: '0.75', existencias: '20' };
  assert.strictEqual(prepararProducto({ ...base, costo: '0.45' }).costoCentavos, 45);
  assert.strictEqual(prepararProducto({ ...base, costo: '' }).costoCentavos, null);
  assert.strictEqual(prepararProducto(base).costoCentavos, undefined);
  for (const malo of ['0', 'abc', '-2']) {
    assert.throws(() => prepararProducto({ ...base, costo: malo }), { message: 'Escriba el costo por unidad, por ejemplo 0.45.' });
  }
  assert.deepStrictEqual(prepararProducto({ costo: '' }, { parcial: true }), { costoCentavos: null });
});

test('producto: el JSON incluye costo (o null) y la cantidad sugerida', () => {
  const datos = { rubroId: oid(), nombre: 'Frijol 1 lb', precio: '0.85', existencias: 4, stockMinimo: 5 };
  const conCosto = new Producto({ ...datos, costo: '0.65' }).toJSON();
  assert.strictEqual(conCosto.costo, 0.65);
  assert.strictEqual(conCosto.sugerido, 11);
  assert.strictEqual(new Producto(datos).toJSON().costo, null);
});

test('visibilidad: el empleado nunca recibe el costo; la propietaria sí', () => {
  const producto = new Producto({ rubroId: oid(), nombre: 'Frijol 1 lb', precio: '0.85', costo: '0.65', existencias: 4, stockMinimo: 5 });
  assert.strictEqual(productoVisible(producto, true).costo, 0.65);
  assert.strictEqual('costo' in productoVisible(producto, false), false);

  const item = { productoId: oid(), nombre: 'Frijol 1 lb', rubroId: oid(), cantidad: 1, precioUnitario: '0.85', costoUnitario: '0.65', subtotal: '0.85' };
  const venta = new Venta({ numeroComprobante: 'V-000001', usuarioId: oid(), items: [item], total: '0.85' });
  assert.strictEqual(ventaVisible(venta, true).items[0].costoUnitario, 0.65);
  assert.strictEqual('costoUnitario' in ventaVisible(venta, false).items[0], false);
});

test('API de compras: solo la propietaria y validaciones previas a la base de datos', async () => {
  const token = (rol) => jwt.sign({ id: 'u1', rol, nombre: 'Prueba' }, process.env.JWT_SECRET);
  const servidor = app.listen(0);
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const enviar = (ruta, rol, metodo = 'GET', cuerpo) =>
    fetch(`${base}${ruta}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(rol ? { Authorization: `Bearer ${token(rol)}` } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  try {
    assert.strictEqual((await enviar('/api/compras')).status, 401);
    assert.strictEqual((await enviar('/api/compras', 'empleado')).status, 403);
    assert.strictEqual((await enviar('/api/compras', 'empleado', 'POST', {})).status, 403);
    assert.strictEqual((await enviar('/api/compras/pedidos')).status, 401);
    assert.strictEqual((await enviar('/api/compras/pedidos', 'empleado')).status, 403);

    const fechaInvalida = await enviar('/api/compras/pedidos', 'propietaria', 'POST', {
      fechaEsperada: '2026-02-30',
      items: [{ productoId: ID_A, cantidad: 5, costoUnitario: '0.45' }],
    });
    assert.strictEqual(fechaInvalida.status, 400);
    assert.strictEqual((await fechaInvalida.json()).mensaje, 'Escriba una fecha de recepción válida.');

    const vacia = await enviar('/api/compras', 'propietaria', 'POST', { items: [] });
    assert.strictEqual(vacia.status, 400);
    assert.strictEqual((await vacia.json()).mensaje, 'Agregue al menos un producto a la compra.');

    const costo = await enviar('/api/compras', 'propietaria', 'POST', { items: [{ productoId: ID_A, cantidad: 5, costoUnitario: 'abc' }] });
    assert.strictEqual(costo.status, 400);
    assert.strictEqual((await costo.json()).mensaje, 'Escriba el costo por unidad, por ejemplo 0.45.');
  } finally {
    servidor.close();
  }
});
