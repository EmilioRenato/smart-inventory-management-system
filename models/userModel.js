import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, unique: true, lowercase: true },
    password: { type: String, required: true },

    role: { type: String, enum: ['admin', 'asesor'], default: 'asesor' },

    // ✅ 5 dígitos (string) y único
    code: { type: String, unique: true, required: true },
  },
  { timestamps: true }
);

async function generateUnique5DigitCode(Model) {
  for (let i = 0; i < 50; i++) {
    const n = Math.floor(10000 + Math.random() * 90000); // 10000-99999
    const code = String(n);
    const exists = await Model.findOne({ code }).select('_id');
    if (!exists) return code;
  }
  throw new Error('No se pudo generar un código único');
}

// ⚠️ IMPORTANTE: generar antes de validar (para que required no falle)
userSchema.pre('validate', async function (next) {
  try {
    if (!this.code) {
      this.code = await generateUnique5DigitCode(this.constructor);
    }
    next();
  } catch (err) {
    next(err);
  }
});

const User = mongoose.model('User', userSchema);
export default User;