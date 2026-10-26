const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/salud', (req, res) => res.json({ estado: 'ok', sistema: 'VentaClara' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rubros', require('./routes/rubros'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/ventas', require('./routes/ventas'));

app.use((req, res) => res.status(404).json({ mensaje: 'Ruta no encontrada.' }));

// Manejo central de errores: los errores esperados llevan su propio mensaje
app.use((err, req, res, next) => {
  let status = err.status || 500;
  let mensaje = err.message;
  if (err.name === 'ValidationError') {
    status = 400;
    mensaje = Object.values(err.errors).map((e) => e.message).join(' ');
  }
  if (status === 500) {
    console.error(err);
    mensaje = 'Ocurrió un error. Intente de nuevo.';
  }
  res.status(status).json({ mensaje });
});

module.exports = app;
