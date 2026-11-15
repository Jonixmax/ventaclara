const { Schema, model } = require('mongoose');
const { aNumero } = require('../utils/dinero');

const montoPositivo = {
  type: Schema.Types.Decimal128,
  required: true,
  validate: { validator: (v) => Number(v.toString()) > 0, message: 'El monto debe ser mayor a 0.' },
};

const itemCompraSchema = new Schema(
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
    costoUnitario: montoPositivo,
    subtotal: montoPositivo,
  },
  { _id: false }
);

// Compra de mercadería al proveedor: suma existencias y registra cuánto costó
const compraSchema = new Schema(
  {
    numeroCompra: { type: String, required: true, unique: true },
    fecha: { type: Date, required: true, default: Date.now },
    usuarioId: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    proveedor: { type: String, trim: true, maxlength: [60, 'El nombre del proveedor no puede pasar de 60 caracteres.'] },
    items: {
      type: [itemCompraSchema],
      validate: { validator: (v) => v.length >= 1, message: 'Agregue al menos un producto a la compra.' },
    },
    total: montoPositivo,
  },
  { timestamps: { createdAt: 'creadoEn', updatedAt: false } }
);

compraSchema.index({ fecha: -1 });

compraSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    ret.total = aNumero(ret.total);
    ret.items = ret.items.map((i) => ({ ...i, costoUnitario: aNumero(i.costoUnitario), subtotal: aNumero(i.subtotal) }));
    return ret;
  },
});

module.exports = model('Compra', compraSchema, 'compras');
