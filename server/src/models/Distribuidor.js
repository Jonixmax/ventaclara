const { Schema, model } = require('mongoose');

const distribuidorSchema = new Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, 'El nombre debe tener al menos 2 caracteres.'],
      maxlength: [60, 'El nombre no puede pasar de 60 caracteres.'],
    },
    nombreClave: { type: String, required: true, unique: true },
    whatsapp: {
      type: String,
      required: [true, 'Escriba el número de WhatsApp.'],
      match: [/^\d{7,15}$/, 'Escriba un WhatsApp válido con entre 7 y 15 dígitos.'],
    },
    activo: { type: Boolean, default: true, required: true },
  },
  { timestamps: { createdAt: 'creadoEn', updatedAt: 'actualizadoEn' } }
);

distribuidorSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.nombreClave;
    return ret;
  },
});

module.exports = model('Distribuidor', distribuidorSchema, 'distribuidores');
