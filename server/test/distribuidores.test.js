process.env.JWT_SECRET = 'secreto-de-prueba';
const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const {
  prepararNuevoDistribuidor,
  prepararCambioDistribuidor,
} = require('../src/services/distribuidorService');

const ID = 'a'.repeat(24);

test('distribuidor: normaliza nombre y WhatsApp', () => {
  assert.deepStrictEqual(
    prepararNuevoDistribuidor({ nombre: '  Distribuidora   López ', whatsapp: '+503 7000-1234' }),
    { nombre: 'Distribuidora López', nombreClave: 'distribuidora lópez', whatsapp: '50370001234', activo: true }
  );
});

test('distribuidor: valida nombre y WhatsApp', () => {
  for (const datos of [
    { nombre: 'A', whatsapp: '70001234' },
    { nombre: 'Distribuidor', whatsapp: 'abc1234567' },
    { nombre: 'Distribuidor', whatsapp: '12345' },
    { nombre: 'Distribuidor', whatsapp: '1'.repeat(16) },
  ]) {
    assert.throws(() => prepararNuevoDistribuidor(datos), { status: 400 });
  }
});

test('distribuidor: permite editar solo los datos enviados y valida el estado', () => {
  assert.deepStrictEqual(prepararCambioDistribuidor({ activo: false }), { activo: false });
  assert.deepStrictEqual(prepararCambioDistribuidor({ whatsapp: '(503) 7000 1234' }), { whatsapp: '50370001234' });
  assert.throws(() => prepararCambioDistribuidor({ activo: 'no' }), {
    message: 'El estado del distribuidor no es válido.',
  });
  assert.throws(() => prepararCambioDistribuidor({}), {
    message: 'Indique qué dato del distribuidor desea cambiar.',
  });
});

test('API de distribuidores: solo la propietaria puede gestionarlos', async () => {
  const token = (rol) => jwt.sign({ id: 'u1', rol, nombre: 'Prueba' }, process.env.JWT_SECRET);
  const servidor = app.listen(0);
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const enviar = (rol, metodo = 'GET', cuerpo) => fetch(`${base}/api/distribuidores${metodo === 'PUT' ? `/${ID}` : ''}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(rol ? { Authorization: `Bearer ${token(rol)}` } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  try {
    assert.strictEqual((await enviar()).status, 401);
    assert.strictEqual((await enviar('empleado')).status, 403);
    assert.strictEqual((await enviar('empleado', 'POST', {})).status, 403);
    assert.strictEqual((await enviar('propietaria', 'POST', { nombre: 'Distribuidor', whatsapp: '12345' })).status, 400);
    assert.strictEqual((await enviar('propietaria', 'PUT', { activo: 'no' })).status, 400);
    assert.strictEqual((await fetch(`${base}/api/distribuidores/123`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token('propietaria')}` },
      body: JSON.stringify({ activo: false }),
    })).status, 404);
  } finally {
    servidor.close();
  }
});
