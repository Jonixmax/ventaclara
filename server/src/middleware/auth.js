const jwt = require('jsonwebtoken');

// Exige una sesión válida: lee el token del encabezado Authorization: Bearer <token>
function requerirSesion(req, res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) {
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

module.exports = { requerirSesion, requerirRol };
