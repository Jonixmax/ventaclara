process.env.JWT_SECRET = 'secreto-de-prueba';
const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { requerirSesion, requerirRol } = require('../src/middleware/auth');

function respuestaFalsa() {
  return { codigo: null, cuerpo: null, status(c) { this.codigo = c; return this; }, json(b) { this.cuerpo = b; return this; } };
}

test('middleware: sin token responde 401', () => {
  const res = respuestaFalsa();
  requerirSesion({ headers: {} }, res, () => assert.fail('no debía continuar'));
  assert.strictEqual(res.codigo, 401);
});

test('middleware: token válido continúa y deja el usuario en la petición', () => {
  const token = jwt.sign({ id: '1', rol: 'empleado', nombre: 'Ana' }, process.env.JWT_SECRET);
  const req = { headers: { authorization: `Bearer ${token}` } };
  let continuo = false;
  requerirSesion(req, respuestaFalsa(), () => { continuo = true; });
  assert.ok(continuo);
  assert.strictEqual(req.usuario.rol, 'empleado');
});

test('middleware: token falso responde 401', () => {
  const res = respuestaFalsa();
  requerirSesion({ headers: { authorization: 'Bearer token-inventado' } }, res, () => assert.fail());
  assert.strictEqual(res.codigo, 401);
});

test('permisos: el empleado no puede entrar a acciones de la propietaria', () => {
  const res = respuestaFalsa();
  requerirRol('propietaria')({ usuario: { rol: 'empleado' } }, res, () => assert.fail());
  assert.strictEqual(res.codigo, 403);
  assert.strictEqual(res.cuerpo.mensaje, 'No tiene permiso para esta acción.');
});

test('permisos: la propietaria sí puede', () => {
  let continuo = false;
  requerirRol('propietaria')({ usuario: { rol: 'propietaria' } }, respuestaFalsa(), () => { continuo = true; });
  assert.ok(continuo);
});

test('API: salud, login incompleto, ruta protegida y ruta inexistente', async () => {
  const servidor = app.listen(0);
  const base = `http://127.0.0.1:${servidor.address().port}`;
  try {
    const salud = await fetch(`${base}/api/salud`);
    assert.strictEqual(salud.status, 200);

    const login = await fetch(`${base}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: 'elsy' }),
    });
    assert.strictEqual(login.status, 400);
    assert.strictEqual((await login.json()).mensaje, 'Escriba su usuario y contraseña.');

    assert.strictEqual((await fetch(`${base}/api/productos`)).status, 401);
    assert.strictEqual((await fetch(`${base}/api/no-existe`)).status, 404);
  } finally {
    servidor.close();
  }
});
