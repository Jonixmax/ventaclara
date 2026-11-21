const { Schema, model } = require('mongoose');
const { aNumero } = require('../utils/dinero');

const montoPositivo = {
  type: Schema.Types.Decimal128,
  required: true,
  validate: { validator: (v) => Number(v.toString()) > 0, message: 'El monto debe ser mayor a 0.' },
};

const itemPedidoSchema = new Schema(
  {
    productoId: { type: Schema.Types.ObjectId, ref: 'Producto', required: true },
    nombre: { type: String, required: true },
    rubroId: { type: Schema.Types.ObjectId, ref: 'Rubro', required: true },
    cantidad: { type: Number, required: true, min: 1, validate: Number.isInteger },
    costoUnitario: montoPositivo,
    subtotal: montoPositivo,
  },
  { _id: false }
);

const pedidoCompraSchema = new Schema(
  {
    fechaEsperada: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    usuarioId: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    distribuidorId: { type: Schema.Types.ObjectId, ref: 'Distribuidor' },
    proveedor: { type: String, trim: true, maxlength: [60, 'El nombre del proveedor no puede pasar de 60 caracteres.'] },
    items: {
      type: [itemPedidoSchema],
      validate: { validator: (v) => v.length >= 1, message: 'Agregue al menos un producto a la compra.' },
    },
    total: montoPositivo,
    estado: { type: String, enum: ['pendiente', 'recibido'], default: 'pendiente', required: true },
    recibidoEn: Date,
    compraId: { type: Schema.Types.ObjectId, ref: 'Compra' },
  },
  { timestamps: { createdAt: 'creadoEn', updatedAt: false } }
);

pedidoCompraSchema.index({ estado: 1, fechaEsperada: 1 });
pedidoCompraSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    ret.total = aNumero(ret.total);
    ret.items = ret.items.map((i) => ({ ...i, costoUnitario: aNumero(i.costoUnitario), subtotal: aNumero(i.subtotal) }));
    return ret;
  },
});

module.exports = model('PedidoCompra', pedidoCompraSchema, 'pedidos_compra');
