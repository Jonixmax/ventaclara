const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { crearError } = require('../utils/errores');

// Mensaje único para no revelar si falló el usuario o la contraseña
const MENSAJE_INVALIDO = 'Usuario o contraseña incorrectos.';

async function login(usuario, password) {
  const encontrado = await Usuario.findOne({
    usuario: String(usuario).toLowerCase().trim(),
    activo: true,
  });
  if (!encontrado) throw crearError(401, MENSAJE_INVALIDO);

  const coincide = await bcrypt.compare(String(password), encontrado.passwordHash);
  if (!coincide) throw crearError(401, MENSAJE_INVALIDO);

  const token = jwt.sign(
    { id: encontrado._id, rol: encontrado.rol, nombre: encontrado.nombre },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
  return { token, usuario: { id: encontrado._id, nombre: encontrado.nombre, rol: encontrado.rol } };
}

module.exports = { login };
