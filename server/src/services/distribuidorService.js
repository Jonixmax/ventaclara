const Distribuidor = require('../models/Distribuidor');
const { crearError } = require('../utils/errores');

const ES_OBJECT_ID = /^[a-f0-9]{24}$/i;

function validarNombre(valor) {
  const nombre = String(valor ?? '').trim().replace(/\s+/g, ' ');
  if (nombre.length < 2 || nombre.length > 60) throw crearError(400, 'El nombre debe tener de 2 a 60 caracteres.');
  return nombre;
}

function validarWhatsApp(valor) {
  const original = String(valor ?? '').trim();
  if (!/^\+?[\d\s().-]+$/.test(original)) throw crearError(400, 'Escriba un WhatsApp válido con entre 7 y 15 dígitos.');
  const whatsapp = original.replace(/\D/g, '');
  if (whatsapp.length < 7 || whatsapp.length > 15) throw crearError(400, 'Escriba un WhatsApp válido con entre 7 y 15 dígitos.');
  return whatsapp;
}

function prepararNuevoDistribuidor(datos = {}) {
  const nombre = validarNombre(datos.nombre);
  return { nombre, nombreClave: nombre.toLowerCase(), whatsapp: validarWhatsApp(datos.whatsapp), activo: true };
}

function prepararCambioDistribuidor(datos = {}) {
  const cambios = {};
  if (datos.nombre !== undefined) {
    cambios.nombre = validarNombre(datos.nombre);
    cambios.nombreClave = cambios.nombre.toLowerCase();
  }
  if (datos.whatsapp !== undefined) cambios.whatsapp = validarWhatsApp(datos.whatsapp);
  if (datos.activo !== undefined) {
    if (typeof datos.activo !== 'boolean') throw crearError(400, 'El estado del distribuidor no es válido.');
    cambios.activo = datos.activo;
  }
  if (!Object.keys(cambios).length) throw crearError(400, 'Indique qué dato del distribuidor desea cambiar.');
  return cambios;
}

async function listarDistribuidores() {
  return Distribuidor.find().sort({ nombre: 1 });
}

async function crearDistribuidor(datos) {
  return Distribuidor.create(prepararNuevoDistribuidor(datos));
}

async function actualizarDistribuidor(id, datos) {
  if (!ES_OBJECT_ID.test(String(id))) throw crearError(404, 'Distribuidor no encontrado.');
  const cambios = prepararCambioDistribuidor(datos);
  const distribuidor = await Distribuidor.findById(id);
  if (!distribuidor) throw crearError(404, 'Distribuidor no encontrado.');
  Object.assign(distribuidor, cambios);
  return distribuidor.save();
}

module.exports = {
  validarNombre,
  validarWhatsApp,
  prepararNuevoDistribuidor,
  prepararCambioDistribuidor,
  listarDistribuidores,
  crearDistribuidor,
  actualizarDistribuidor,
};
