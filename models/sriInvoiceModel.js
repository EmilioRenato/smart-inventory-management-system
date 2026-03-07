import mongoose from 'mongoose';

const sriItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    image: { type: String, default: '' },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },

    sizeOrders: [
      {
        size: { type: String },
        quantity: { type: Number },
      },
    ],
  },
  { _id: false }
);

const sriInvoiceSchema = new mongoose.Schema(
  {
    // vínculo con la nota de venta
    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bills',
      required: true,
      unique: true,
    },

    createdBy: { type: String, required: true },

    // vendedor
    sellerCode: { type: String, required: true },
    sellerName: { type: String, default: '' },

    // cliente
    customerCedula: { type: String, required: true },
    customerName: { type: String, required: true },
    customerPhone: { type: Number, required: true },
    customerAddress: { type: String, required: true },
    customerEmail: { type: String, default: '' },

    // detalle
    items: { type: [sriItemSchema], required: true },

    // totales
    suggestedTotal: { type: Number, required: true },
    paidTotal: { type: Number, required: true },
    discountAmount: { type: Number, required: true },
    paymentMethod: { type: String, required: true },

    // datos SRI
    environment: {
      type: String,
      enum: ['PRUEBAS', 'PRODUCCION'],
      default: 'PRUEBAS',
    },
    status: {
      type: String,
      enum: ['BORRADOR', 'XML_GENERADO', 'FIRMADA', 'ENVIADA', 'AUTORIZADA', 'RECHAZADA'],
      default: 'BORRADOR',
    },

    secuencial: { type: String, required: true },
    claveAcceso: { type: String, required: true },

    // fases posteriores
    xmlUnsigned: { type: String, default: '' },
    xmlSigned: { type: String, default: '' },
    authorizationNumber: { type: String, default: '' },
    authorizationDate: { type: Date, default: null },
    sriResponse: { type: Object, default: null },
  },
  { timestamps: true }
);

const SriInvoice = mongoose.model('SriInvoice', sriInvoiceSchema);
export default SriInvoice;