const { Router } = require('express');
const { login } = require('../services/authService');
const { crearError } = require('../utils/errores');

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { usuario, password } = req.body || {};
    if (!usuario || !password) {
      throw crearError(400, 'Escriba su usuario y contraseña.');
    }
    res.json(await login(usuario, password));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
