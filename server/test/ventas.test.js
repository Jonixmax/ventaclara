process.env.JWT_SECRET = 'secreto-de-prueba';
const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { normalizarItems, prepararVenta } = require('../src/services/ventaService');
const { rangoDelDia } = require('../src/utils/fechas');
const { formatearFolio } = require('../src/utils/folio');

const ID_A = 'a'.repeat(24);
const ID_B = 'b'.repeat(24);
const RUBRO = 'c'.repeat(24);
const catalogo = [
  { _id: ID_A, nombre: 'Arroz 1 lb', rubroId: RUBRO, precio: '0.60', existencias: 30, activo: true },
  { _id: ID_B, nombre: 'Hilo blanco', rubroId: RUBRO, precio: '0.75', existencias: 1, activo: true },
];

test('normalizar: exige al menos un producto', () => {
  assert.throws(() => normalizarItems([]), { message: 'Agregue al menos un producto.' });
  assert.throws(() => normalizarItems(undefined), { message: 'Agregue al menos un producto.' });
});

test('normalizar: la cantidad debe ser un entero mayor a cero', () => {
  for (const cantidad of [0, -2, 1.5, '3', null]) {
    assert.throws(() => normalizarItems([{ productoId: ID_A, cantidad }]), {
      message: 'La cantidad debe ser un número entero mayor a cero.',
    });
  }
});

test('normalizar: rechaza identificadores inválidos y junta productos repetidos', () => {
  assert.throws(() => normalizarItems([{ productoId: '123', cantidad: 1 }]), { message: 'Este producto no está disponible.' });
  const juntos = normalizarItems([{ productoId: ID_A, cantidad: 1 }, { productoId: ID_A, cantidad: 2 }]);
  assert.deepStrictEqual(juntos, [{ productoId: ID_A, cantidad: 3 }]);
});

test('venta: el precio sale del catálogo y los totales se calculan en centavos', () => {
  const { items, totalCentavos } = prepararVenta(
    [{ productoId: ID_A, cantidad: 1 }, { productoId: ID_B, cantidad: 1 }],
    catalogo
  );
  assert.strictEqual(items[0].subtotalCentavos, 60);
  assert.strictEqual(items[1].subtotalCentavos, 75);
  assert.strictEqual(totalCentavos, 135);
});

test('venta: avisa cuántas unidades quedan cuando no alcanzan', () => {
  assert.throws(() => prepararVenta([{ productoId: ID_A, cantidad: 31 }], catalogo), {
    message: 'Solo quedan 30 unidades de Arroz 1 lb.',
  });
  assert.throws(() => prepararVenta([{ productoId: ID_B, cantidad: 2 }], catalogo), {
    message: 'Solo quedan 1 unidad de Hilo blanco.',
  });
});

test('venta: un producto agotado o inactivo no se puede vender', () => {
  const agotado = [{ ...catalogo[0], existencias: 0 }];
  assert.throws(() => prepararVenta([{ productoId: ID_A, cantidad: 1 }], agotado), { message: 'Arroz 1 lb está agotado.' });
  const inactivo = [{ ...catalogo[0], activo: false }];
  assert.throws(() => prepararVenta([{ productoId: ID_A, cantidad: 1 }], inactivo), { message: 'Este producto no está disponible.' });
  assert.throws(() => prepararVenta([{ productoId: ID_B, cantidad: 1 }], [catalogo[0]]), { message: 'Este producto no está disponible.' });
});

test('folio: 6 dígitos con el prefijo V-', () => {
  assert.strictEqual(formatearFolio(1), 'V-000001');
  assert.strictEqual(formatearFolio(123), 'V-000123');
});

test('día: usa la hora de El Salvador (UTC-6)', () => {
  const dia = (iso) => rangoDelDia(new Date(iso));
  assert.strictEqual(dia('2026-11-03T15:42:10Z').inicio.toISOString(), '2026-11-03T06:00:00.000Z');
  assert.strictEqual(dia('2026-11-03T15:42:10Z').fin.toISOString(), '2026-11-04T06:00:00.000Z');
  // 9 p. m. del 3 de noviembre en El Salvador sigue siendo el día 3
  assert.strictEqual(dia('2026-11-04T03:00:00Z').inicio.toISOString(), '2026-11-03T06:00:00.000Z');
  // la medianoche local inicia un día nuevo
  assert.strictEqual(dia('2026-11-04T06:00:00Z').inicio.toISOString(), '2026-11-04T06:00:00.000Z');
});

test('API de ventas: sesión, permisos y validaciones previas a la base de datos', async () => {
  const token = (rol) => jwt.sign({ id: 'u1', rol, nombre: 'Prueba' }, process.env.JWT_SECRET);
  const servidor = app.listen(0);
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const enviar = (ruta, opciones = {}) => fetch(`${base}${ruta}`, opciones);
  const json = (rol, cuerpo) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(rol)}` },
    body: JSON.stringify(cuerpo),
  });
  try {
    assert.strictEqual((await enviar('/api/ventas', { method: 'POST' })).status, 401);

    const vacia = await enviar('/api/ventas', json('empleado', { items: [] }));
    assert.strictEqual(vacia.status, 400);
    assert.strictEqual((await vacia.json()).mensaje, 'Agregue al menos un producto.');

    const cero = await enviar('/api/ventas', json('empleado', { items: [{ productoId: ID_A, cantidad: 0 }] }));
    assert.strictEqual(cero.status, 400);

    const resumenEmpleado = await enviar('/api/ventas/resumen-hoy', { headers: { Authorization: `Bearer ${token('empleado')}` } });
    assert.strictEqual(resumenEmpleado.status, 403);
    assert.strictEqual((await resumenEmpleado.json()).mensaje, 'No tiene permiso para esta acción.');
  } finally {
    servidor.close();
  }
});
