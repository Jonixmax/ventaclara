const mongoose = require('mongoose');

// Conecta con MongoDB usando la cadena guardada en la variable de entorno MONGODB_URI
async function conectarDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Falta la variable MONGODB_URI en el archivo .env');
  }
  await mongoose.connect(uri);
  console.log('Conectado a MongoDB');
}

module.exports = conectarDB;
