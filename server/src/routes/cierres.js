const { Router } = require('express');
const { previsualizarCierre, registrarCierre } = require('../services/cierreService');
const { requerirSesion, requerirRol } = require('../middleware/auth');

const router = Router();

// GET /api/cierres/previsualizar  (solo propietaria)
router.get('/previsualizar', requerirSesion, requerirRol('propietaria'), async (req, res, next) => {
  try {
    res.json(await previsualizarCierre());
  } catch (error) {
    next(error);
  }
});

// POST /api/cierres  (solo propietaria). Cuerpo: { efectivoContado }
router.post('/', requerirSesion, requerirRol('propietaria'), async (req, res, next) => {
  try {
    res.status(201).json(await registrarCierre(req.body?.efectivoContado, req.usuario.id));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
