const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const Producto = require('../src/models/Producto');
const Usuario = require('../src/models/Usuario');
const Venta = require('../src/models/Venta');
const Rubro = require('../src/models/Rubro');

const oid = () => new mongoose.Types.ObjectId();
const productoBase = () => ({ rubroId: oid(), nombre: 'Arroz 1 lb', precio: '0.60', existencias: 30, stockMinimo: 5 });

// Devuelve los errores de validación de un documento ({} si es válido); no necesita base de datos
async function errores(documento) {
  try {
    await documento.validate();
    return {};
  } catch (error) {
    return error.errors || {};
  }
}

test('producto válido pasa la validación', async () => {
  assert.deepStrictEqual(await errores(new Producto(productoBase())), {});
});

test('producto: el precio debe ser mayor a 0', async () => {
  assert.ok((await errores(new Producto({ ...productoBase(), precio: '0' }))).precio);
});

test('producto: las existencias no pueden ser negativas ni decimales', async () => {
  assert.ok((await errores(new Producto({ ...productoBase(), existencias: -1 }))).existencias);
  assert.ok((await errores(new Producto({ ...productoBase(), existencias: 2.5 }))).existencias);
});

test('producto: el nombre es obligatorio y de al menos 2 caracteres', async () => {
  assert.ok((await errores(new Producto({ ...productoBase(), nombre: 'A' }))).nombre);
  assert.ok((await errores(new Producto({ ...productoBase(), nombre: undefined }))).nombre);
});

test('producto: el JSON incluye el precio como número y el estado del semáforo', () => {
  const json = new Producto({ ...productoBase(), existencias: 4 }).toJSON();
  assert.strictEqual(json.precio, 0.6);
  assert.strictEqual(json.estadoStock, 'rojo');
});

test('usuario: el rol solo puede ser propietaria o empleado', async () => {
  const base = { nombre: 'Elsy Cruz', usuario: 'elsy', passwordHash: 'x' };
  assert.deepStrictEqual(await errores(new Usuario({ ...base, rol: 'empleado' })), {});
  assert.ok((await errores(new Usuario({ ...base, rol: 'administrador' }))).rol);
});

test('usuario: el nombre de acceso tiene de 4 a 20 caracteres', async () => {
  const base = { nombre: 'Elsy Cruz', passwordHash: 'x', rol: 'propietaria' };
  assert.ok((await errores(new Usuario({ ...base, usuario: 'abc' }))).usuario);
  assert.ok((await errores(new Usuario({ ...base, usuario: 'a'.repeat(21) }))).usuario);
});

test('usuario: el JSON nunca incluye el hash de la contraseña', () => {
  const json = new Usuario({ nombre: 'Elsy Cruz', usuario: 'elsy', passwordHash: 'secreto', rol: 'propietaria' }).toJSON();
  assert.strictEqual(json.passwordHash, undefined);
});

test('rubro: el color debe ser hexadecimal', async () => {
  assert.ok((await errores(new Rubro({ nombre: 'Víveres', color: 'verde' }))).color);
  assert.deepStrictEqual(await errores(new Rubro({ nombre: 'Víveres', color: '#2E7D32' })), {});
});

test('venta: debe tener al menos un producto y cantidades enteras mayores a cero', async () => {
  const item = { productoId: oid(), nombre: 'Arroz 1 lb', rubroId: oid(), cantidad: 1, precioUnitario: '0.60', subtotal: '0.60' };
  const base = { numeroComprobante: 'V-000001', usuarioId: oid(), total: '0.60' };
  assert.deepStrictEqual(await errores(new Venta({ ...base, items: [item] })), {});
  assert.ok((await errores(new Venta({ ...base, items: [] }))).items);
  assert.ok(Object.keys(await errores(new Venta({ ...base, items: [{ ...item, cantidad: 0 }] }))).length > 0);
  assert.ok(Object.keys(await errores(new Venta({ ...base, items: [{ ...item, cantidad: 1.5 }] }))).length > 0);
});
