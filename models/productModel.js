import mongoose from 'mongoose';

// Subdocumento para tallas
const sizeStockSchema = new mongoose.Schema({
    size: { type: String, required: true },
    stock: { type: Number, required: true },
});

const productSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        category: { type: String, required: true },
        price: { type: Number, required: true },
        image: { type: String, required: true },

        // Stock total (lo dejamos por compatibilidad)
        stock: { type: Number, required: true },

        // NUEVO: stock por talla
        sizeStocks: {
            type: [sizeStockSchema],
            default: [],
        },

        createdBy: { type: String, required: true },
    },
    {
        timestamps: true,
    },
);

const Product = mongoose.model('Product', productSchema);
export default Product;