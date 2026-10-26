const { Schema, model } = require('mongoose');

// Colección auxiliar: guarda el último número usado para numerar comprobantes sin repetirlos
const contadorSchema = new Schema(
  {
    _id: { type: String, required: true },
    valor: { type: Number, required: true, default: 0 },
  },
  { versionKey: false }
);

module.exports = model('Contador', contadorSchema, 'contadores');
