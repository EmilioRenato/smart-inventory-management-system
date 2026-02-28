import express from 'express';
import {
    getProductController,
    addProductController,
    updateProductController,
    deleteProductController
} from '../controllers/productController.js';

const productsRouter = express.Router();

// GET PRODUCTS
productsRouter.get('/getproducts', getProductController);

// ADD PRODUCT
productsRouter.post('/addproducts', addProductController);

// UPDATE PRODUCT
productsRouter.put('/updateproducts', updateProductController);

// DELETE PRODUCT
productsRouter.post('/deleteproducts', deleteProductController);

export default productsRouter;