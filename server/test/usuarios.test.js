process.env.JWT_SECRET = 'secreto-de-prueba';
const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { validarPassword, prepararNuevoUsuario, prepararCambioUsuario } = require('../src/services/usuarioService');

const ID = 'a'.repeat(24);

test('contraseña: de 8 a 64 caracteres', () => {
  assert.strictEqual(validarPassword('12345678'), '12345678');
  assert.throws(() => validarPassword('1234567'), { message: 'La contraseña debe tener al menos 8 caracteres.' });
  assert.throws(() => validarPassword(undefined), { message: 'La contraseña debe tener al menos 8 caracteres.' });
  assert.throws(() => validarPassword('a'.repeat(65)), { message: 'La contraseña no puede pasar de 64 caracteres.' });
});

test('usuario nuevo: limpia el nombre y el usuario', () => {
  const limpio = prepararNuevoUsuario({ nombre: '  Ana   Pérez ', usuario: ' Ana.Perez ', password: 'claveSegura1' });
  assert.deepStrictEqual(limpio, { nombre: 'Ana Pérez', usuario: 'ana.perez', password: 'claveSegura1' });
});

test('usuario nuevo: mensajes claros para cada dato inválido', () => {
  const base = { nombre: 'Ana Pérez', usuario: 'anap', password: 'claveSegura1' };
  const caso = (cambio, mensaje) => assert.throws(() => prepararNuevoUsuario({ ...base, ...cambio }), { message: mensaje });
  caso({ nombre: 'Al' }, 'El nombre debe tener de 3 a 60 caracteres.');
  caso({ usuario: 'abc' }, 'El usuario debe tener de 4 a 20 caracteres.');
  caso({ usuario: 'a'.repeat(21) }, 'El usuario debe tener de 4 a 20 caracteres.');
  caso({ usuario: 'ana perez' }, 'Use solo letras minúsculas, números, punto, guion o guion bajo.');
  caso({ password: 'corta' }, 'La contraseña debe tener al menos 8 caracteres.');
});

test('cambio de usuario: solo valida lo que se envía y ignora la contraseña vacía', () => {
  assert.deepStrictEqual(prepararCambioUsuario({ activo: false }), { activo: false });
  assert.deepStrictEqual(prepararCambioUsuario({ nombre: 'Ana María', password: '' }), { nombre: 'Ana María' });
  assert.deepStrictEqual(prepararCambioUsuario({ password: 'otraClave99' }), { password: 'otraClave99' });
  assert.throws(() => prepararCambioUsuario({ activo: 'si' }), { message: 'El estado del usuario no es válido.' });
  assert.throws(() => prepararCambioUsuario({ password: 'corta' }), { message: 'La contraseña debe tener al menos 8 caracteres.' });
});

test('API de usuarios: solo la propietaria y validaciones previas a la base de datos', async () => {
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
    assert.strictEqual((await enviar('/api/usuarios')).status, 401);
    for (const [ruta, metodo] of [['/api/usuarios', 'GET'], ['/api/usuarios', 'POST'], [`/api/usuarios/${ID}`, 'PUT']]) {
      const r = await enviar(ruta, 'empleado', metodo, metodo === 'GET' ? undefined : {});
      assert.strictEqual(r.status, 403, `${metodo} ${ruta}`);
    }
    const corta = await enviar('/api/usuarios', 'propietaria', 'POST', { nombre: 'Ana Pérez', usuario: 'anap', password: 'corta' });
    assert.strictEqual(corta.status, 400);
    assert.strictEqual((await corta.json()).mensaje, 'La contraseña debe tener al menos 8 caracteres.');

    assert.strictEqual((await enviar('/api/usuarios/123', 'propietaria', 'PUT', { activo: false })).status, 404);
    const cambio = await enviar(`/api/usuarios/${ID}`, 'propietaria', 'PUT', { password: 'corta' });
    assert.strictEqual(cambio.status, 400);
  } finally {
    servidor.close();
  }
});
