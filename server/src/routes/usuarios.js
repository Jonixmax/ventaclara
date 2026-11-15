const { Router } = require('express');
const { listarUsuarios, crearUsuario, actualizarUsuario } = require('../services/usuarioService');
const { requerirSesion, requerirRol } = require('../middleware/auth');

const router = Router();
const soloPropietaria = [requerirSesion, requerirRol('propietaria')];

// GET /api/usuarios
router.get('/', ...soloPropietaria, async (req, res, next) => {
  try {
    res.json(await listarUsuarios());
  } catch (error) {
    next(error);
  }
});

// POST /api/usuarios  Cuerpo: { nombre, usuario, password }  (crea un empleado)
router.post('/', ...soloPropietaria, async (req, res, next) => {
  try {
    res.status(201).json(await crearUsuario(req.body));
  } catch (error) {
    next(error);
  }
});

// PUT /api/usuarios/:id  Cuerpo: { nombre?, activo?, password? }
router.put('/:id', ...soloPropietaria, async (req, res, next) => {
  try {
    res.json(await actualizarUsuario(req.params.id, req.body, req.usuario.id));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
