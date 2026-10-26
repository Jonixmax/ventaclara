require('dotenv').config({ quiet: true });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const conectarDB = require('../config/db');
const Usuario = require('../models/Usuario');
const Rubro = require('../models/Rubro');
const Producto = require('../models/Producto');
const Venta = require('../models/Venta');
const CierreCaja = require('../models/CierreCaja');
const Contador = require('../models/Contador');

// Contraseña de demostración: cámbiela antes de usar el sistema con datos reales
const PASSWORD_DEMO = 'Ventaclara2026';

async function sembrar() {
  const uri = process.env.MONGODB_URI || '';
  // Protección: este script BORRA todo, así que solo corre contra la base de desarrollo
  if (!uri.includes('ventaclara_dev') && !process.argv.includes('--forzar')) {
    throw new Error('Por seguridad, el seed solo corre contra una base llamada ventaclara_dev.');
  }
  await conectarDB();

  await Promise.all([
    Usuario.deleteMany({}), Rubro.deleteMany({}), Producto.deleteMany({}),
    Venta.deleteMany({}), CierreCaja.deleteMany({}), Contador.deleteMany({}),
  ]);

  const rubros = await Rubro.insertMany([
    { nombre: 'Víveres', color: '#2E7D32' },
    { nombre: 'Costura', color: '#B8500A' },
    { nombre: 'Medicina', color: '#1565C0' },
  ]);
  const id = Object.fromEntries(rubros.map((r) => [r.nombre, r._id]));

  const passwordHash = await bcrypt.hash(PASSWORD_DEMO, 10);
  await Usuario.insertMany([
    { nombre: 'Elsy Elizabeth Cruz Romero', usuario: 'elsy', passwordHash, rol: 'propietaria' },
    { nombre: 'Empleado de apoyo', usuario: 'empleado1', passwordHash, rol: 'empleado' },
  ]);

  // Precios y existencias de EJEMPLO: reemplácelos por los reales del negocio
  await Producto.insertMany([
    { rubroId: id['Víveres'], nombre: 'Arroz 1 lb', precio: '0.60', existencias: 30, stockMinimo: 5 },
    { rubroId: id['Víveres'], nombre: 'Frijol 1 lb', precio: '0.85', existencias: 4, stockMinimo: 5 },
    { rubroId: id['Víveres'], nombre: 'Aceite 1/2 litro', precio: '1.10', existencias: 9, stockMinimo: 5 },
    { rubroId: id['Costura'], nombre: 'Hilo blanco', precio: '0.75', existencias: 12, stockMinimo: 6 },
    { rubroId: id['Costura'], nombre: 'Botones (bolsa)', precio: '0.50', existencias: 40, stockMinimo: 10 },
    { rubroId: id['Costura'], nombre: 'Agujas (paquete)', precio: '0.35', existencias: 25, stockMinimo: 5 },
    { rubroId: id['Medicina'], nombre: 'Paracetamol 500 mg (tableta)', precio: '0.15', existencias: 25, stockMinimo: 5 },
    { rubroId: id['Medicina'], nombre: 'Alcohol 70% (frasco)', precio: '1.25', existencias: 15, stockMinimo: 5 },
    { rubroId: id['Medicina'], nombre: 'Suero oral', precio: '1.50', existencias: 12, stockMinimo: 4 },
  ]);

  await Contador.create({ _id: 'comprobante', valor: 0 });

  console.log('Datos de ejemplo cargados.');
  console.log(`  propietaria -> usuario: elsy       contraseña: ${PASSWORD_DEMO}`);
  console.log(`  empleado    -> usuario: empleado1  contraseña: ${PASSWORD_DEMO}`);
  await mongoose.disconnect();
}

sembrar().catch(async (error) => {
  console.error('Error en el seed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
