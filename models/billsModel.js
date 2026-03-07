import mongoose from 'mongoose';

const billItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    image: { type: String },
    price: { type: Number, required: true }, // precio sugerido
    quantity: { type: Number, required: true },

    // tallas seleccionadas (si aplica)
    sizeOrders: [
      {
        size: { type: String },
        quantity: { type: Number },
      },
    ],
  },
  { _id: false }
);

const billsSchema = new mongoose.Schema(
  {
    createdBy: { type: String, required: true },

    // vendedor
    sellerCode: { type: String, required: true },
    sellerName: { type: String, default: '' },
    sellerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // cliente
    customerCedula: { type: String, required: true },
    customerName: { type: String, required: true },
    customerPhone: { type: Number, required: true },
    customerAddress: { type: String, required: true },
    customerEmail: { type: String, default: '' },

    cartItems: { type: [billItemSchema], required: true },

    // totales
    suggestedTotal: { type: Number, required: true },
    paidTotal: { type: Number, required: true },
    discountAmount: { type: Number, required: true },

    paymentMethod: { type: String, required: true },
  },
  { timestamps: true }
);

const Bills = mongoose.model('Bills', billsSchema);
export default Bills;