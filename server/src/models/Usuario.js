const { Schema, model } = require('mongoose');

const usuarioSchema = new Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio.'],
      trim: true,
      minlength: [3, 'El nombre debe tener al menos 3 caracteres.'],
      maxlength: [60, 'El nombre no puede pasar de 60 caracteres.'],
    },
    usuario: {
      type: String,
      required: [true, 'El usuario es obligatorio.'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [4, 'El usuario debe tener al menos 4 caracteres.'],
      maxlength: [20, 'El usuario no puede pasar de 20 caracteres.'],
      match: [/^[a-z0-9._-]+$/, 'Use solo letras minúsculas, números, punto, guion o guion bajo.'],
    },
    passwordHash: { type: String, required: true },
    rol: {
      type: String,
      required: [true, 'El rol es obligatorio.'],
      enum: { values: ['propietaria', 'empleado'], message: 'El rol debe ser propietaria o empleado.' },
    },
    activo: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'creadoEn', updatedAt: 'actualizadoEn' } }
);

// Nunca se envía el hash de la contraseña en las respuestas
usuarioSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = model('Usuario', usuarioSchema, 'usuarios');
