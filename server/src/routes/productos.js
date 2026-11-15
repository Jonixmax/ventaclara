const { Router } = require('express');
const mongoose = require('mongoose');
const Producto = require('../models/Producto');
const { requerirSesion, requerirRol } = require('../middleware/auth');
const { crearError } = require('../utils/errores');
const { productoVisible } = require('../utils/visibilidad');
const { crearProducto, actualizarProducto } = require('../services/productoService');

const router = Router();
const esPropietaria = (req) => req.usuario.rol === 'propietaria';

// GET /api/productos?rubroId=...&todos=1
// Catálogo activo. La propietaria puede pedir también los inactivos con todos=1.
// El empleado nunca recibe el costo de compra.
router.get('/', requerirSesion, async (req, res, next) => {
  try {
    const filtro = { activo: true };
    if (req.query.todos === '1' && esPropietaria(req)) delete filtro.activo;
    if (req.query.rubroId) {
      if (!mongoose.isValidObjectId(req.query.rubroId)) throw crearError(400, 'Rubro no válido.');
      filtro.rubroId = req.query.rubroId;
    }
    const productos = await Producto.find(filtro).sort({ nombre: 1 });
    res.json(productos.map((p) => productoVisible(p, esPropietaria(req))));
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
    res.json(productos.map((p) => productoVisible(p, esPropietaria(req))));
  } catch (error) {
    next(error);
  }
});

// POST /api/productos  (solo propietaria)
router.post('/', requerirSesion, requerirRol('propietaria'), async (req, res, next) => {
  try {
    res.status(201).json(await crearProducto(req.body));
  } catch (error) {
    next(error);
  }
});

// PUT /api/productos/:id  (solo propietaria): editar, corregir existencias, activar o desactivar
router.put('/:id', requerirSesion, requerirRol('propietaria'), async (req, res, next) => {
  try {
    res.json(await actualizarProducto(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
