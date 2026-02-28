import express from 'express';
import {
  addCustomerController,
  deleteCustomerController,
  getCustomerController,
  updateCustomerController,
  getCustomerByCedulaController,
} from '../controllers/customerController.js';

const customerRouter = express.Router();

// Por tienda
customerRouter.get('/get-customers', getCustomerController);

// Autocompletar por cédula/RUC
customerRouter.get('/get-customer-by-cedula', getCustomerByCedulaController);

customerRouter.post('/add-customers', addCustomerController);
customerRouter.put('/update-customers', updateCustomerController);
customerRouter.post('/delete-customers', deleteCustomerController);

export default customerRouter;