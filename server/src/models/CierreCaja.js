const { Schema, model } = require('mongoose');
const { aNumero } = require('../utils/dinero');

const dinero = { type: Schema.Types.Decimal128, required: true };

const cierreCajaSchema = new Schema(
  {
    fecha: { type: Date, required: true, unique: true },
    totalSistema: dinero,
    efectivoContado: {
      type: Schema.Types.Decimal128,
      required: [true, 'Escriba el efectivo contado.'],
      validate: { validator: (v) => Number(v.toString()) >= 0, message: 'El efectivo contado no puede ser negativo.' },
    },
    diferencia: dinero,
    totalesPorRubro: [
      new Schema({ rubroId: { type: Schema.Types.ObjectId, ref: 'Rubro', required: true }, total: dinero }, { _id: false }),
    ],
    usuarioId: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
  },
  { timestamps: { createdAt: 'creadoEn', updatedAt: false } }
);

cierreCajaSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    ['totalSistema', 'efectivoContado', 'diferencia'].forEach((c) => (ret[c] = aNumero(ret[c])));
    ret.totalesPorRubro = (ret.totalesPorRubro || []).map((t) => ({ ...t, total: aNumero(t.total) }));
    return ret;
  },
});

module.exports = model('CierreCaja', cierreCajaSchema, 'cierres_caja');
