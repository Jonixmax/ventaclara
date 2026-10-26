const { Schema, model } = require('mongoose');
const { aNumero } = require('../utils/dinero');

const dinero = {
  type: Schema.Types.Decimal128,
  required: true,
  validate: { validator: (v) => Number(v.toString()) >= 0, message: 'El monto no puede ser negativo.' },
};

const itemVentaSchema = new Schema(
  {
    productoId: { type: Schema.Types.ObjectId, ref: 'Producto', required: true },
    nombre: { type: String, required: true },
    rubroId: { type: Schema.Types.ObjectId, ref: 'Rubro', required: true },
    cantidad: {
      type: Number,
      required: true,
      min: [1, 'La cantidad debe ser un número mayor a cero.'],
      validate: { validator: Number.isInteger, message: 'La cantidad debe ser un número entero.' },
    },
    precioUnitario: dinero,
    subtotal: dinero,
  },
  { _id: false }
);

const ventaSchema = new Schema(
  {
    numeroComprobante: { type: String, required: true, unique: true },
    fecha: { type: Date, required: true, default: Date.now },
    usuarioId: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    items: {
      type: [itemVentaSchema],
      validate: { validator: (v) => v.length >= 1, message: 'Agregue al menos un producto.' },
    },
    total: dinero,
  },
  { timestamps: { createdAt: 'creadoEn', updatedAt: false } }
);

// Índices del punto 3.2
ventaSchema.index({ fecha: -1 });
ventaSchema.index({ 'items.rubroId': 1, fecha: -1 });

ventaSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    ret.total = aNumero(ret.total);
    ret.items = ret.items.map((i) => ({
      ...i,
      precioUnitario: aNumero(i.precioUnitario),
      subtotal: aNumero(i.subtotal),
    }));
    return ret;
  },
});

module.exports = model('Venta', ventaSchema, 'ventas');
