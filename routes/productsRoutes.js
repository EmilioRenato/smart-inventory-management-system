import express from 'express';
import {
    addProductController,
    deleteProductController,
    getProductController,
    seedsProductController,
    updateProductController,
    decrementProductSizesController,
} from '../controllers/productController.js';

const router = express.Router();

router.get('/getproducts', getProductController);
router.post('/addproducts', addProductController);
router.put('/updateproducts', updateProductController);
router.post('/deleteproducts', deleteProductController);
router.get('/seeds', seedsProductController);

// ✅ NUEVO: descontar por tallas
router.post('/decrement-sizes', decrementProductSizesController);

export default router;