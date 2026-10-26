const { Schema, model } = require('mongoose');

const rubroSchema = new Schema(
  {
    nombre: { type: String, required: [true, 'El nombre es obligatorio.'], unique: true, trim: true },
    color: {
      type: String,
      required: [true, 'El color es obligatorio.'],
      match: [/^#[0-9A-Fa-f]{6}$/, 'El color debe ser hexadecimal, por ejemplo #2E7D32.'],
    },
    activo: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'creadoEn', updatedAt: 'actualizadoEn' } }
);

rubroSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = model('Rubro', rubroSchema, 'rubros');
