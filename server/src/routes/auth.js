const { Router } = require('express');
const { rateLimit } = require('express-rate-limit');
const { login } = require('../services/authService');
const { COOKIE_SESION, requerirSesion } = require('../middleware/auth');
const { crearError } = require('../utils/errores');

const router = Router();
const limitarIntentos = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensaje: 'Demasiados intentos. Espere 15 minutos antes de volver a intentar.' },
});

function opcionesCookie() {
  const produccion = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: produccion,
    sameSite: produccion ? 'none' : 'lax',
    path: '/',
  };
}

// POST /api/auth/login
router.post('/login', limitarIntentos, async (req, res, next) => {
  try {
    const { usuario, password } = req.body || {};
    if (!usuario || !password) {
      throw crearError(400, 'Escriba su usuario y contraseña.');
    }
    const resultado = await login(usuario, password);
    res.cookie(COOKIE_SESION, resultado.token, { ...opcionesCookie(), maxAge: resultado.maxAge });
    res.json({ usuario: resultado.usuario });
  } catch (error) {
    next(error);
  }
});

router.get('/session', requerirSesion, (req, res) => {
  res.json({ usuario: { id: req.usuario.id, nombre: req.usuario.nombre, rol: req.usuario.rol } });
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_SESION, opcionesCookie());
  res.status(204).end();
});

module.exports = router;
