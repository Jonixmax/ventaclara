const { Router } = require('express');
const { registrarVenta, listarVentas, obtenerVenta, anularVenta, resumenDelDia } = require('../services/ventaService');
const { productoVisible, ventaVisible } = require('../utils/visibilidad');
const { requerirSesion, requerirRol } = require('../middleware/auth');

const router = Router();

// POST /api/ventas  (propietaria y empleado)
// Cuerpo: { items: [{ productoId, cantidad }], efectivoRecibido (opcional) }.
// El precio NO se recibe: lo toma la API del catálogo. El empleado no recibe costos.
router.post('/', requerirSesion, requerirRol('propietaria', 'empleado'), async (req, res, next) => {
  try {
    const { venta, alertas } = await registrarVenta(req.body?.items, req.usuario.id, req.body?.efectivoRecibido);
    const propietaria = req.usuario.rol === 'propietaria';
    res.status(201).json({
      venta: ventaVisible(venta, propietaria),
      alertas: alertas.map((p) => productoVisible(p, propietaria)),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/ventas  (propietaria y empleado)
router.get('/', requerirSesion, requerirRol('propietaria', 'empleado'), async (req, res, next) => {
  try {
    const resultado = await listarVentas(req.query);
    const propietaria = req.usuario.rol === 'propietaria';
    res.json({
      ...resultado,
      ventas: resultado.ventas.map((venta) => ventaVisible(venta, propietaria)),
    });
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

// POST /api/ventas/:id/anular  (solo propietaria)
router.post('/:id/anular', requerirSesion, requerirRol('propietaria'), async (req, res, next) => {
  try {
    const venta = await anularVenta(req.params.id, req.usuario.id, req.body?.motivo);
    res.json({ venta: ventaVisible(venta, true) });
  } catch (error) {
    next(error);
  }
});

// GET /api/ventas/:id  (propietaria y empleado)
router.get('/:id', requerirSesion, requerirRol('propietaria', 'empleado'), async (req, res, next) => {
  try {
    const venta = await obtenerVenta(req.params.id);
    res.json({ venta: ventaVisible(venta, req.usuario.rol === 'propietaria') });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
