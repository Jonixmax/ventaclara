const { Router } = require('express');
const Rubro = require('../models/Rubro');
const { requerirSesion } = require('../middleware/auth');

const router = Router();

// GET /api/rubros
router.get('/', requerirSesion, async (req, res, next) => {
  try {
    res.json(await Rubro.find({ activo: true }).sort({ nombre: 1 }));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
