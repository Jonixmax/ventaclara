const jwt = require('jsonwebtoken');

const COOKIE_SESION = 'ventaclara_sesion';

function leerToken(req) {
  const cookie = (req.headers.cookie || '')
    .split(';')
    .map((parte) => parte.trim())
    .find((parte) => parte.startsWith(`${COOKIE_SESION}=`));
  if (cookie) return cookie.slice(COOKIE_SESION.length + 1);
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  return tipo === 'Bearer' ? token : null;
}

// Exige una sesión válida: prioriza la cookie HttpOnly y mantiene compatibilidad con clientes Bearer.
function requerirSesion(req, res, next) {
  const token = leerToken(req);
  if (!token) {
    return res.status(401).json({ mensaje: 'Debe iniciar sesión.' });
  }
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'Su sesión venció. Inicie sesión de nuevo.' });
  }
}

// Exige que el rol del usuario esté entre los permitidos
function requerirRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ mensaje: 'No tiene permiso para esta acción.' });
    }
    return next();
  };
}

module.exports = { requerirSesion, requerirRol, COOKIE_SESION };
