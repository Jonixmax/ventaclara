const { Schema, model } = require('mongoose');
const { estadoStock } = require('../utils/estadoStock');
const { aNumero } = require('../utils/dinero');

const esEntero = {
  validator: Number.isInteger,
  message: 'Escriba un número entero.',
};

const productoSchema = new Schema(
  {
    rubroId: { type: Schema.Types.ObjectId, ref: 'Rubro', required: [true, 'El rubro es obligatorio.'] },
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio.'],
      trim: true,
      minlength: [2, 'El nombre debe tener al menos 2 caracteres.'],
      maxlength: [80, 'El nombre no puede pasar de 80 caracteres.'],
    },
    precio: {
      type: Schema.Types.Decimal128,
      required: [true, 'El precio es obligatorio.'],
      validate: {
        validator: (v) => Number(v.toString()) > 0,
        message: 'Escriba un precio válido, por ejemplo 0.75.',
      },
    },
    existencias: {
      type: Number,
      required: [true, 'Las existencias son obligatorias.'],
      min: [0, 'Escriba un número entero, cero o mayor.'],
      validate: esEntero,
    },
    stockMinimo: {
      type: Number,
      required: true,
      default: 5,
      min: [0, 'Escriba un número entero, cero o mayor.'],
      validate: esEntero,
    },
    activo: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'creadoEn', updatedAt: 'actualizadoEn' } }
);

// Índices del punto 3.2
productoSchema.index({ rubroId: 1, nombre: 1 }, { unique: true });
productoSchema.index({ activo: 1, existencias: 1 });

// Métodos de la clase Producto (punto 4.1)
productoSchema.methods.estadoStock = function () {
  return estadoStock(this.existencias, this.stockMinimo);
};
productoSchema.methods.hayStock = function (cantidad) {
  return this.existencias >= cantidad;
};

productoSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    ret.precio = aNumero(ret.precio);
    ret.estadoStock = estadoStock(ret.existencias, ret.stockMinimo);
    return ret;
  },
});

module.exports = model('Producto', productoSchema, 'productos');
