require('dotenv').config({ quiet: true });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const conectarDB = require('../config/db');
const Usuario = require('../models/Usuario');
const Rubro = require('../models/Rubro');
const Contador = require('../models/Contador');
const { prepararNuevoUsuario } = require('../services/usuarioService');

// Prepara una base NUEVA para uso real: crea los rubros, los contadores y la cuenta de la propietaria.
// No borra nada y no carga productos de ejemplo.
// Uso: npm run inicializar -- --usuario elsy --nombre "Elsy Elizabeth Cruz Romero" --password "UnaClaveSegura1"
function argumento(nombre) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const RUBROS = [
  { nombre: 'Víveres', color: '#2E7D32' },
  { nombre: 'Costura', color: '#B8500A' },
  { nombre: 'Medicina', color: '#1565C0' },
];

async function inicializar() {
  const datos = prepararNuevoUsuario({
    nombre: argumento('nombre'),
    usuario: argumento('usuario'),
    password: argumento('password'),
  });
  await conectarDB();

  for (const rubro of RUBROS) {
    await Rubro.updateOne({ nombre: rubro.nombre }, { $setOnInsert: rubro }, { upsert: true });
  }
  for (const id of ['comprobante', 'compra']) {
    await Contador.updateOne({ _id: id }, { $setOnInsert: { valor: 0 } }, { upsert: true });
  }

  if (await Usuario.exists({ rol: 'propietaria' })) {
    console.log('Ya existe una propietaria: no se creó otra cuenta. Los rubros y contadores están al día.');
  } else {
    const passwordHash = await bcrypt.hash(datos.password, 10);
    await Usuario.create({ nombre: datos.nombre, usuario: datos.usuario, passwordHash, rol: 'propietaria' });
    console.log(`Sistema inicializado. Cuenta de la propietaria creada: ${datos.usuario}`);
  }
  await mongoose.disconnect();
}

inicializar().catch(async (error) => {
  console.error('No se pudo inicializar:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
