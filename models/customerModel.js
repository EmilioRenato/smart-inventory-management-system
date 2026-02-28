import mongoose from 'mongoose';

//for create table into db
const customerSchema = new mongoose.Schema(
    {
        cedula: { type: String, required: true, trim: true }, // ✅ NUEVO
        name: { type: String, required: true, trim: true },
        phone: { type: Number, required: true },
        address: { type: String, required: true, trim: true },
        createdBy: { type: String, required: true },
    },
    {
        timestamps: true,
    },
);

// ✅ Evita duplicados por usuario (mismo createdBy) + misma cédula
customerSchema.index({ createdBy: 1, cedula: 1 }, { unique: true });

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;