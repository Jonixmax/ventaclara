require('dotenv').config({ quiet: true });
const app = require('./app');
const conectarDB = require('./config/db');

const PUERTO = process.env.PORT || 4000;

async function iniciar() {
  await conectarDB();
  app.listen(PUERTO, () => console.log(`Servidor listo en http://localhost:${PUERTO}`));
}

iniciar().catch((error) => {
  console.error('No se pudo iniciar el servidor:', error.message);
  process.exit(1);
});
