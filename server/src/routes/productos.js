const { Router } = require('express');
const mongoose = require('mongoose');
const Producto = require('../models/Producto');
const { requerirSesion } = require('../middleware/auth');
const { crearError } = require('../utils/errores');

const router = Router();

// GET /api/productos?rubroId=...  (catálogo; se puede filtrar por rubro)
router.get('/', requerirSesion, async (req, res, next) => {
  try {
    const filtro = { activo: true };
    if (req.query.rubroId) {
      if (!mongoose.isValidObjectId(req.query.rubroId)) throw crearError(400, 'Rubro no válido.');
      filtro.rubroId = req.query.rubroId;
    }
    res.json(await Producto.find(filtro).sort({ nombre: 1 }));
  } catch (error) {
    next(error);
  }
});

// GET /api/productos/alertas  (productos con existencias <= el doble del stock mínimo)
router.get('/alertas', requerirSesion, async (req, res, next) => {
  try {
    const productos = await Producto.find({
      activo: true,
      $expr: { $lte: ['$existencias', { $multiply: ['$stockMinimo', 2] }] },
    }).sort({ existencias: 1 });
    res.json(productos);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
