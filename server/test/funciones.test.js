const test = require('node:test');
const assert = require('node:assert');
const { estadoStock } = require('../src/utils/estadoStock');
const { aCentavos, calcularSubtotal, formatearMoneda } = require('../src/utils/dinero');

test('semáforo: rojo cuando las existencias llegan al mínimo', () => {
  assert.strictEqual(estadoStock(4, 5), 'rojo');
  assert.strictEqual(estadoStock(5, 5), 'rojo');
  assert.strictEqual(estadoStock(0, 5), 'rojo');
});

test('semáforo: amarillo hasta el doble del mínimo', () => {
  assert.strictEqual(estadoStock(6, 5), 'amarillo');
  assert.strictEqual(estadoStock(10, 5), 'amarillo');
});

test('semáforo: verde por encima del doble del mínimo', () => {
  assert.strictEqual(estadoStock(11, 5), 'verde');
  assert.strictEqual(estadoStock(30, 5), 'verde');
});

test('dinero: se calcula en centavos sin errores de redondeo', () => {
  assert.strictEqual(aCentavos(0.6), 60);
  assert.strictEqual(aCentavos(1.1), 110);
  assert.strictEqual(aCentavos(0.1 + 0.2), 30);
  assert.strictEqual(calcularSubtotal(2, aCentavos(0.75)), 150);
});

test('dinero: formato de dólares', () => {
  assert.strictEqual(formatearMoneda(2.1), '$2.10');
  assert.strictEqual(formatearMoneda(0.6), '$0.60');
});
