const { Router } = require('express');
const { resumenDelDia, resumenDelMes } = require('../services/ventaService');
const { requerirSesion, requerirRol } = require('../middleware/auth');
const { crearError } = require('../utils/errores');

const router = Router();

// GET /api/reportes/rubros?periodo=hoy|mes  (solo propietaria)
router.get('/rubros', requerirSesion, requerirRol('propietaria'), async (req, res, next) => {
  try {
    const periodo = req.query.periodo || 'hoy';
    if (!['hoy', 'mes'].includes(periodo)) throw crearError(400, 'Periodo no válido. Use hoy o mes.');
    const resumen = periodo === 'hoy' ? await resumenDelDia() : await resumenDelMes();
    res.json({ periodo, ...resumen });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
