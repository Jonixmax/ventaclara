const { Router } = require('express');
const { registrarCompra, listarCompras } = require('../services/compraService');
const { productoVisible } = require('../utils/visibilidad');
const { requerirSesion, requerirRol } = require('../middleware/auth');

const router = Router();

// POST /api/compras  (solo propietaria)
// Cuerpo: { proveedor (opcional), items: [{ productoId, cantidad, costoUnitario }] }
router.post('/', requerirSesion, requerirRol('propietaria'), async (req, res, next) => {
  try {
    const { compra, productos, avisos } = await registrarCompra(req.body?.items, req.usuario.id, req.body?.proveedor);
    res.status(201).json({ compra, productos: productos.map((p) => productoVisible(p, true)), avisos });
  } catch (error) {
    next(error);
  }
});

// GET /api/compras?limite=30  (solo propietaria): historial de compras
router.get('/', requerirSesion, requerirRol('propietaria'), async (req, res, next) => {
  try {
    res.json(await listarCompras(req.query.limite));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
