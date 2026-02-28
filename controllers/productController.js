import Product from '../models/productModel.js';

// GET PRODUCTS (GLOBAL)
export const getProductController = async (req, res) => {
    try {
        const { search } = req.query;

        const query = {};
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const products = await Product.find(query).sort({ createdAt: -1 });
        res.status(200).send(products);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error obteniendo productos' });
    }
};

// ADD
export const addProductController = async (req, res) => {
    try {
        const newProduct = new Product(req.body);
        await newProduct.save();
        res.status(200).json({ message: 'Producto creado correctamente' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error creando producto' });
    }
};

// UPDATE
export const updateProductController = async (req, res) => {
    try {
        await Product.findOneAndUpdate(
            { _id: req.body.productId },
            req.body,
            { new: true }
        );
        res.status(201).json({ message: 'Producto actualizado' });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: 'Error actualizando producto' });
    }
};

// DELETE
export const deleteProductController = async (req, res) => {
    try {
        await Product.findOneAndDelete({ _id: req.body.productId });
        res.status(200).json({ message: 'Producto eliminado' });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: 'Error eliminando producto' });
    }
};