import mongoose from 'mongoose';

const billItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    image: { type: String },
    price: { type: Number, required: true }, // precio “sugerido” (precio normal del producto)
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
    createdBy: { type: String, required: true }, // id del dueño/usuario logueado (para filtrar por tienda)

    // vendedor (asesor) que hizo la venta
    sellerCode: { type: String, required: true }, // 5 dígitos
    sellerName: { type: String, default: '' },
    sellerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // cliente
    customerCedula: { type: String, required: true },
    customerName: { type: String, required: true },
    customerPhone: { type: Number, required: true },
    customerAddress: { type: String, required: true },

    cartItems: { type: [billItemSchema], required: true },

    // totales
    suggestedTotal: { type: Number, required: true }, // suma precio normal
    paidTotal: { type: Number, required: true }, // precio final negociado
    discountAmount: { type: Number, required: true }, // suggestedTotal - paidTotal

    paymentMethod: { type: String, required: true },
  },
  { timestamps: true }
);

const Bills = mongoose.model('Bills', billsSchema);
export default Bills;