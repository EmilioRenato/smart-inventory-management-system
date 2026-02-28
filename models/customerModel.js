import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    cedula: { type: String, required: true, trim: true },

    name: { type: String, required: true, trim: true },
    phone: { type: Number, required: true },
    address: { type: String, required: true, trim: true },

    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

// Evitar duplicados por tienda (createdBy + cedula)
customerSchema.index({ createdBy: 1, cedula: 1 }, { unique: true });

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;