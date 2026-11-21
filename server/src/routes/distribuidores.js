const { Router } = require('express');
const {
  listarDistribuidores,
  crearDistribuidor,
  actualizarDistribuidor,
} = require('../services/distribuidorService');
const { requerirSesion, requerirRol } = require('../middleware/auth');

const router = Router();
const soloPropietaria = [requerirSesion, requerirRol('propietaria')];

router.get('/', ...soloPropietaria, async (req, res, next) => {
  try {
    res.json(await listarDistribuidores());
  } catch (error) {
    next(error);
  }
});

router.post('/', ...soloPropietaria, async (req, res, next) => {
  try {
    res.status(201).json(await crearDistribuidor(req.body));
  } catch (error) {
    next(error);
  }
});

router.put('/:id', ...soloPropietaria, async (req, res, next) => {
  try {
    res.json(await actualizarDistribuidor(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
