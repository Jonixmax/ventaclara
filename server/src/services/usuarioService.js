const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const { crearError } = require('../utils/errores');

const ES_OBJECT_ID = /^[a-f0-9]{24}$/i;

// Regla del punto 4.4: la contraseña debe tener al menos 8 caracteres
function validarPassword(password) {
  const texto = String(password ?? '');
  if (texto.length < 8) throw crearError(400, 'La contraseña debe tener al menos 8 caracteres.');
  if (texto.length > 64) throw crearError(400, 'La contraseña no puede pasar de 64 caracteres.');
  return texto;
}

function validarNombre(valor) {
  const nombre = String(valor ?? '').trim().replace(/\s+/g, ' ');
  if (nombre.length < 3 || nombre.length > 60) throw crearError(400, 'El nombre debe tener de 3 a 60 caracteres.');
  return nombre;
}

// Valida los datos de un empleado nuevo. Función pura: no toca la base de datos.
function prepararNuevoUsuario(datos = {}) {
  const nombre = validarNombre(datos.nombre);
  const usuario = String(datos.usuario ?? '').trim().toLowerCase();
  if (usuario.length < 4 || usuario.length > 20) throw crearError(400, 'El usuario debe tener de 4 a 20 caracteres.');
  if (!/^[a-z0-9._-]+$/.test(usuario)) {
    throw crearError(400, 'Use solo letras minúsculas, números, punto, guion o guion bajo.');
  }
  return { nombre, usuario, password: validarPassword(datos.password) };
}

// Valida los cambios de un usuario: solo los campos que vienen en la petición
function prepararCambioUsuario(datos = {}) {
  const limpio = {};
  if (datos.nombre !== undefined) limpio.nombre = validarNombre(datos.nombre);
  if (datos.activo !== undefined) {
    if (typeof datos.activo !== 'boolean') throw crearError(400, 'El estado del usuario no es válido.');
    limpio.activo = datos.activo;
  }
  if (datos.password !== undefined && datos.password !== '') limpio.password = validarPassword(datos.password);
  return limpio;
}

async function listarUsuarios() {
  return Usuario.find().sort({ rol: -1, nombre: 1 });
}

// Los usuarios nuevos siempre son empleados; la propietaria se crea al inicializar el sistema
async function crearUsuario(datos) {
  const { nombre, usuario, password } = prepararNuevoUsuario(datos);
  const passwordHash = await bcrypt.hash(password, 10);
  return Usuario.create({ nombre, usuario, passwordHash, rol: 'empleado' });
}

async function actualizarUsuario(id, datos, solicitanteId) {
  if (!ES_OBJECT_ID.test(String(id))) throw crearError(404, 'Usuario no encontrado.');
  const { password, ...cambios } = prepararCambioUsuario(datos);
  if (cambios.activo === false && String(id) === String(solicitanteId)) {
    throw crearError(400, 'No puede desactivar su propia cuenta.');
  }
  const usuario = await Usuario.findById(id);
  if (!usuario) throw crearError(404, 'Usuario no encontrado.');
  Object.assign(usuario, cambios);
  if (password) usuario.passwordHash = await bcrypt.hash(password, 10);
  return usuario.save();
}

module.exports = { validarPassword, prepararNuevoUsuario, prepararCambioUsuario, listarUsuarios, crearUsuario, actualizarUsuario };
