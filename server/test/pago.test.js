process.env.JWT_SECRET = 'secreto-de-prueba';
const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Venta = require('../src/models/Venta');
const { leerEfectivoRecibido, calcularPago } = require('../src/utils/pago');

const oid = () => new mongoose.Types.ObjectId();

test('pago: el dinero recibido es opcional', () => {
  for (const vacio of [undefined, null, '', '   ']) assert.strictEqual(leerEfectivoRecibido(vacio), null);
  assert.deepStrictEqual(calcularPago(210, null), { recibidoCentavos: null, vueltoCentavos: null });
});

test('pago: lee montos con punto o coma y hasta 2 decimales', () => {
  assert.strictEqual(leerEfectivoRecibido('5'), 500);
  assert.strictEqual(leerEfectivoRecibido('2,50'), 250);
  assert.strictEqual(leerEfectivoRecibido(10), 1000);
});

test('pago: rechaza valores que no son dinero', () => {
  for (const malo of ['abc', '-5', '1.234', '1e3']) {
    assert.throws(() => leerEfectivoRecibido(malo), { message: 'Escriba cuánto dinero entregó el cliente.' });
  }
});

test('pago: calcula el vuelto en centavos', () => {
  assert.deepStrictEqual(calcularPago(210, 500), { recibidoCentavos: 500, vueltoCentavos: 290 });
  assert.deepStrictEqual(calcularPago(210, 210), { recibidoCentavos: 210, vueltoCentavos: 0 });
  assert.strictEqual(calcularPago(1135, 2000).vueltoCentavos, 865);
});

test('pago: no deja cobrar si el dinero recibido no alcanza', () => {
  assert.throws(() => calcularPago(210, 200), { message: 'El dinero recibido no alcanza para pagar el total.' });
});

test('venta: guarda el dinero recibido y el vuelto, y los devuelve como números', async () => {
  const item = { productoId: oid(), nombre: 'Arroz 1 lb', rubroId: oid(), cantidad: 1, precioUnitario: '0.60', subtotal: '0.60' };
  const venta = new Venta({ numeroComprobante: 'V-000001', usuarioId: oid(), items: [item], total: '0.60', efectivoRecibido: '5.00', vuelto: '4.40' });
  await venta.validate();
  const json = venta.toJSON();
  assert.strictEqual(json.efectivoRecibido, 5);
  assert.strictEqual(json.vuelto, 4.4);
  const sinPago = new Venta({ numeroComprobante: 'V-000002', usuarioId: oid(), items: [item], total: '0.60' });
  await sinPago.validate();
  assert.strictEqual(sinPago.toJSON().efectivoRecibido, undefined);
});

test('API: un dinero recibido inválido se rechaza antes de tocar la base de datos', async () => {
  const token = jwt.sign({ id: 'u1', rol: 'empleado', nombre: 'Prueba' }, process.env.JWT_SECRET);
  const servidor = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${servidor.address().port}/api/ventas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ items: [{ productoId: 'a'.repeat(24), cantidad: 1 }], efectivoRecibido: 'abc' }),
    });
    assert.strictEqual(r.status, 400);
    assert.strictEqual((await r.json()).mensaje, 'Escriba cuánto dinero entregó el cliente.');
  } finally {
    servidor.close();
  }
});
