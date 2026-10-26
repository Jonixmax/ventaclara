const { Router } = require('express');
const { registrarVenta, resumenDelDia } = require('../services/ventaService');
const { requerirSesion, requerirRol } = require('../middleware/auth');

const router = Router();

// POST /api/ventas  (propietaria y empleado)
// Cuerpo: { items: [{ productoId, cantidad }] }. El precio NO se recibe: lo toma la API del catálogo.
router.post('/', requerirSesion, requerirRol('propietaria', 'empleado'), async (req, res, next) => {
  try {
    const resultado = await registrarVenta(req.body?.items, req.usuario.id);
    res.status(201).json(resultado);
  } catch (error) {
    next(error);
  }
});

// GET /api/ventas/resumen-hoy  (solo propietaria: son datos financieros)
router.get('/resumen-hoy', requerirSesion, requerirRol('propietaria'), async (req, res, next) => {
  try {
    res.json(await resumenDelDia());
  } catch (error) {
    next(error);
  }
});

module.exports = router;
