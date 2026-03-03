import express from 'express';
import {
  addCustomerController,
  deleteCustomerController,
  getCustomerController,
  updateCustomerController,
  getCustomerByCedulaController,
  exportCustomersExcelController,
} from '../controllers/customerController.js';

const customerRouter = express.Router();

// GLOBAL
customerRouter.get('/get-customers', getCustomerController);

// Autocompletar por cédula/RUC
customerRouter.get('/get-customer-by-cedula', getCustomerByCedulaController);

// ✅ Export Excel (opcional: ?createdBy=xxxx)
customerRouter.get('/export-excel', exportCustomersExcelController);

customerRouter.post('/add-customers', addCustomerController);
customerRouter.put('/update-customers', updateCustomerController);
customerRouter.post('/delete-customers', deleteCustomerController);

export default customerRouter;