import Product from '../models/productModel.js';
import products from '../utils/data.js';

// get products
export const getProductController = async (req, res) => {
    try {
        const { createdBy, search } = req.query;

        const query = {};
        if (createdBy) query.createdBy = createdBy;

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const list = await Product.find(query).sort({ createdAt: -1 });
        res.status(200).send(list);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error obteniendo productos' });
    }
};

// add
export const addProductController = async (req, res) => {
    try {
        const newProducts = new Product(req.body);
        await newProducts.save();
        res.status(200).json({ message: 'Producto creado correctamente' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error creando producto' });
    }
};

// ✅ update BLINDADO (para que NO se dañe el producto)
export const updateProductController = async (req, res) => {
    try {
        const { productId, ...rest } = req.body;

        if (!productId) {
            return res.status(400).json({ message: 'productId is required' });
        }

        // ✅ Solo permitir actualizar estos campos
        const allowed = ['name', 'category', 'price', 'image', 'stock', 'sizeStocks', 'createdBy'];

        const $set = {};
        for (const key of allowed) {
            if (rest[key] !== undefined) {
                $set[key] = rest[key];
            }
        }

        const updated = await Product.findByIdAndUpdate(productId, { $set }, { new: true });

        if (!updated) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        res.status(200).json({ message: 'Producto actualizado' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error updating product' });
    }
};

// delete
export const deleteProductController = async (req, res) => {
    try {
        await Product.findOneAndDelete({ _id: req.body.productId });
        res.status(200).json({ message: 'Producto eliminado' });
    } catch (error) {
        res.status(400).send(error);
        console.log(error);
    }
};

// seeds
export const seedsProductController = async (req, res) => {
    try {
        const data = await Product.insertMany(products);
        res.status(200).json(data);
    } catch (error) {
        res.status(400).send(error);
        console.log(error);
    }
};

// ✅ NUEVO: descontar stock POR TALLAS y recalcular stock total
export const decrementProductSizesController = async (req, res) => {
    try {
        const { productId, sizeOrders } = req.body;

        if (!productId) return res.status(400).json({ message: 'productId is required' });
        if (!Array.isArray(sizeOrders) || sizeOrders.length === 0) {
            return res.status(400).json({ message: 'sizeOrders is required' });
        }

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: 'Producto no encontrado' });

        const current = Array.isArray(product.sizeStocks) ? product.sizeStocks : [];

        // Map actual de stock por talla
        const map = new Map(current.map(x => [String(x.size), Number(x.stock || 0)]));

        // Validar + descontar
        for (const row of sizeOrders) {
            const size = String(row.size || '').trim();
            const qty = Number(row.quantity || 0);

            if (!size || !Number.isFinite(qty) || qty <= 0) {
                return res.status(400).json({ message: 'sizeOrders inválido' });
            }

            const have = map.get(size) ?? 0;
            if (qty > have) {
                return res.status(400).json({ message: `Has superado el stock de la talla ${size}` });
            }

            map.set(size, have - qty);
        }

        // Reconstruir sizeStocks (manteniendo el orden)
        const newSizeStocks = current.map(x => ({
            size: String(x.size),
            stock: map.get(String(x.size)) ?? 0,
        }));

        const newTotal = newSizeStocks.reduce((sum, x) => sum + Number(x.stock || 0), 0);

        product.sizeStocks = newSizeStocks;
        product.stock = newTotal;

        await product.save();

        return res.status(200).json({ message: 'Stock por tallas actualizado', product });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Error descontando stock por tallas' });
    }
};