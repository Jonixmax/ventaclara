process.env.JWT_SECRET = 'secreto-de-prueba';
const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { prepararProducto } = require('../src/services/productoService');
const { montoACentavos, enteroNoNegativo } = require('../src/utils/validaciones');
const { calcularDiferenciaCaja } = require('../src/utils/dinero');
const { rangoDelMes } = require('../src/utils/fechas');

const RUBRO = 'c'.repeat(24);
const valido = { rubroId: RUBRO, nombre: 'Azúcar 1 lb', precio: '0.75', existencias: '20', stockMinimo: '5' };

test('monto: acepta hasta 2 decimales y lo convierte a centavos sin errores', () => {
  assert.strictEqual(montoACentavos('0.75', 'x'), 75);
  assert.strictEqual(montoACentavos('1,15', 'x'), 115);
  assert.strictEqual(montoACentavos(12, 'x'), 1200);
  assert.strictEqual(montoACentavos('0.1', 'x'), 10);
});

test('monto: rechaza texto, negativos, más de 2 decimales y valores enormes', () => {
  for (const malo of ['abc', '-1', '1.234', '', null, undefined, '1e3', '99999999']) {
    assert.throws(() => montoACentavos(malo, 'Monto inválido.'), { message: 'Monto inválido.' });
  }
});

test('entero: solo enteros desde cero', () => {
  assert.strictEqual(enteroNoNegativo('0', 'x'), 0);
  assert.strictEqual(enteroNoNegativo(15, 'x'), 15);
  for (const malo of [-1, 2.5, 'dos', '', null, '3.0']) {
    assert.throws(() => enteroNoNegativo(malo, 'Entero inválido.'), { message: 'Entero inválido.' });
  }
});

test('producto: datos válidos se limpian y el precio pasa a centavos', () => {
  const limpio = prepararProducto({ ...valido, nombre: '  Azúcar   1 lb ' });
  assert.deepStrictEqual(limpio, { rubroId: RUBRO, nombre: 'Azúcar 1 lb', precioCentavos: 75, existencias: 20, stockMinimo: 5 });
});

test('producto: el stock mínimo vale 5 si no se escribe', () => {
  const { stockMinimo } = prepararProducto({ ...valido, stockMinimo: undefined });
  assert.strictEqual(stockMinimo, 5);
});

test('producto: mensajes claros para cada dato inválido', () => {
  const caso = (cambio, mensaje) =>
    assert.throws(() => prepararProducto({ ...valido, ...cambio }), { message: mensaje });
  caso({ rubroId: 'abc' }, 'Elija un rubro.');
  caso({ nombre: 'A' }, 'El nombre debe tener de 2 a 80 caracteres.');
  caso({ nombre: 'x'.repeat(81) }, 'El nombre debe tener de 2 a 80 caracteres.');
  caso({ precio: '0' }, 'Escriba un precio válido, por ejemplo 0.75.');
  caso({ precio: 'barato' }, 'Escriba un precio válido, por ejemplo 0.75.');
  caso({ existencias: '-3' }, 'Escriba un número entero, cero o mayor.');
  caso({ stockMinimo: '2.5' }, 'Escriba un número entero, cero o mayor.');
});

test('producto: en una edición solo se validan los campos enviados', () => {
  assert.deepStrictEqual(prepararProducto({ existencias: 8 }, { parcial: true }), { existencias: 8 });
  assert.deepStrictEqual(prepararProducto({ activo: false }, { parcial: true }), { activo: false });
  assert.throws(() => prepararProducto({ precio: '0' }, { parcial: true }), { message: 'Escriba un precio válido, por ejemplo 0.75.' });
  assert.throws(() => prepararProducto({ activo: 'no' }, { parcial: true }), { message: 'El estado del producto no es válido.' });
});

test('caja: la diferencia es efectivo menos sistema (positiva sobra, negativa falta)', () => {
  assert.strictEqual(calcularDiferenciaCaja(4875, 4875), 0);
  assert.strictEqual(calcularDiferenciaCaja(5000, 4875), 125);
  assert.strictEqual(calcularDiferenciaCaja(4800, 4875), -75);
});

test('mes: usa la hora de El Salvador (UTC-6)', () => {
  const mes = (iso) => rangoDelMes(new Date(iso));
  assert.strictEqual(mes('2026-11-03T15:42:10Z').inicio.toISOString(), '2026-11-01T06:00:00.000Z');
  assert.strictEqual(mes('2026-11-03T15:42:10Z').fin.toISOString(), '2026-12-01T06:00:00.000Z');
  // 11:59 p. m. del 30 de noviembre en El Salvador todavía es noviembre
  assert.strictEqual(mes('2026-12-01T05:59:00Z').inicio.toISOString(), '2026-11-01T06:00:00.000Z');
  // la medianoche local del 1 de diciembre ya es diciembre
  assert.strictEqual(mes('2026-12-01T06:00:00Z').inicio.toISOString(), '2026-12-01T06:00:00.000Z');
});

test('API de gestión: permisos y validaciones previas a la base de datos', async () => {
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
    // El empleado no puede gestionar productos, cerrar caja ni ver reportes
    for (const [ruta, metodo] of [['/api/productos', 'POST'], ['/api/productos/' + RUBRO, 'PUT'], ['/api/cierres', 'POST'],
      ['/api/cierres/previsualizar', 'GET'], ['/api/reportes/rubros', 'GET']]) {
      const r = await enviar(ruta, 'empleado', metodo, metodo === 'GET' ? undefined : {});
      assert.strictEqual(r.status, 403, `${metodo} ${ruta}`);
    }
    // Sin sesión
    assert.strictEqual((await enviar('/api/cierres/previsualizar')).status, 401);

    const producto = await enviar('/api/productos', 'propietaria', 'POST', { ...valido, precio: '0' });
    assert.strictEqual(producto.status, 400);
    assert.strictEqual((await producto.json()).mensaje, 'Escriba un precio válido, por ejemplo 0.75.');

    const idMalo = await enviar('/api/productos/123', 'propietaria', 'PUT', { existencias: 5 });
    assert.strictEqual(idMalo.status, 404);

    const cierre = await enviar('/api/cierres', 'propietaria', 'POST', { efectivoContado: 'abc' });
    assert.strictEqual(cierre.status, 400);
    assert.strictEqual((await cierre.json()).mensaje, 'Escriba el efectivo contado.');

    const periodo = await enviar('/api/reportes/rubros?periodo=semana', 'propietaria');
    assert.strictEqual(periodo.status, 400);
  } finally {
    servidor.close();
  }
});
